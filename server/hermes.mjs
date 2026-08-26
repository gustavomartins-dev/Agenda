const CATEGORY_IDS = new Set(['trabalho', 'pessoal', 'saude', 'estudos', 'social', 'outros']);
const PROPOSAL_TTL_MS = 10 * 60 * 1000;
const MAX_RESPONSE_BYTES = 262_144;

const SYSTEM_PROMPT = `Você é o assistente da Agenda do Cavaleiro, uma agenda pessoal inspirada no Batman, em português brasileiro.
Sua única função é conversar sobre compromissos e propor criar, editar ou excluir eventos.
Você não executa ferramentas, não acessa arquivos e nunca confirma ações. O usuário sempre confirma na interface.

Responda SOMENTE com JSON válido, sem markdown, usando todas as chaves:
{"type":"create|update|delete|none","eventId":null,"sourceUpdatedAt":null,"title":null,"description":null,"date":null,"startTime":null,"endTime":null,"categoryId":null,"missingFields":[],"requiresConfirmation":false,"assistantMessage":""}

Regras:
- Datas usam AAAA-MM-DD e horários HH:MM em America/Sao_Paulo.
- Resolva expressões relativas a partir de referenceNow.
- create exige título, data e início; se não houver fim, use uma hora depois.
- update e delete exigem eventId e sourceUpdatedAt exatos de CURRENT_APPOINTMENTS.
- update devolve todos os campos do compromisso, preservando o que não foi alterado.
- categoryId deve ser trabalho, pessoal, saude, estudos, social ou outros.
- Se faltar informação, use type none, liste missingFields e faça uma pergunta curta.
- create/update/delete usam requiresConfirmation true; none usa false.
- Seja direto e mantenha assistantMessage com no máximo 240 caracteres.`;

function error(message, status = 502, code = 'HERMES_UNAVAILABLE') {
  const result = new Error(message);
  result.status = status;
  result.code = code;
  return result;
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseProposal(content, appointments) {
  let raw;
  try {
    raw = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch {
    throw error('O Hermes respondeu em um formato inválido.', 502, 'INVALID_HERMES_RESPONSE');
  }
  if (!raw || typeof raw !== 'object' || !['create', 'update', 'delete', 'none'].includes(raw.type)) {
    throw error('O Hermes devolveu uma proposta inválida.', 502, 'INVALID_HERMES_RESPONSE');
  }
  const assistantMessage = typeof raw.assistantMessage === 'string' ? raw.assistantMessage.trim().slice(0, 240) : '';
  if (!assistantMessage) throw error('O Hermes não explicou a resposta.', 502, 'INVALID_HERMES_RESPONSE');
  if (raw.type === 'none') return { type: 'none', assistantMessage, missingFields: Array.isArray(raw.missingFields) ? raw.missingFields.filter((item) => typeof item === 'string').slice(0, 8) : [] };

  const base = { type: raw.type, assistantMessage, requiresConfirmation: true };
  if (raw.type === 'delete') {
    const current = appointments.find((item) => item.id === raw.eventId);
    if (!current || raw.sourceUpdatedAt !== current.updatedAt) throw error('A proposta usa um compromisso inexistente ou desatualizado.', 409, 'STALE_PROPOSAL');
    return { ...base, eventId: current.id, sourceUpdatedAt: current.updatedAt, appointment: current };
  }

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if (!title || title.length > 120 || description.length > 500 || !isDate(raw.date) || !isTime(raw.startTime) || !isTime(raw.endTime) || raw.endTime <= raw.startTime || !CATEGORY_IDS.has(raw.categoryId)) {
    throw error('A proposta do Hermes contém dados inválidos.', 422, 'INVALID_PROPOSAL');
  }
  const draft = { title, description, date: raw.date, startTime: raw.startTime, endTime: raw.endTime, categoryId: raw.categoryId };
  if (raw.type === 'create') return { ...base, draft };
  const current = appointments.find((item) => item.id === raw.eventId);
  if (!current || raw.sourceUpdatedAt !== current.updatedAt) throw error('A proposta usa um compromisso inexistente ou desatualizado.', 409, 'STALE_PROPOSAL');
  return { ...base, eventId: current.id, sourceUpdatedAt: current.updatedAt, draft, appointment: current };
}

export class HermesAssistant {
  #queue = Promise.resolve();
  #proposals = new Map();

  constructor(database, env = process.env) {
    this.database = database;
    this.baseUrl = env.HERMES_API_BASE_URL || 'http://127.0.0.1:8642';
    this.key = env.HERMES_API_SERVER_KEY || '';
    this.sessionId = env.HERMES_SESSION_ID || 'agenda_cavaleiro_v1';
    this.confirmed = env.HERMES_NO_MCP_CONFIRMED === 'true';
    this.timeout = Number(env.HERMES_TIMEOUT_MS || 60_000);
  }

  async #request(path, init = {}) {
    if (!this.key || !this.confirmed) throw error('O assistente ainda não foi configurado no servidor.', 503, 'HERMES_NOT_CONFIGURED');
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${this.key}`, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers }, signal: AbortSignal.timeout(this.timeout) });
    } catch {
      throw error('O assistente local está offline. A agenda continua funcionando normalmente.', 503, 'HERMES_OFFLINE');
    }
    if (!response.ok) throw error(response.status === 401 || response.status === 403 ? 'O Hermes recusou a autenticação privada.' : 'O Hermes está indisponível agora.', response.status === 401 || response.status === 403 ? 503 : 502);
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw error('A resposta do Hermes excedeu o limite seguro.', 502, 'HERMES_RESPONSE_TOO_LARGE');
    try { return JSON.parse(text); } catch { throw error('O Hermes devolveu JSON inválido.', 502, 'INVALID_HERMES_RESPONSE'); }
  }

  async #assertSafe() {
    const body = await this.#request('/v1/toolsets');
    if (!Array.isArray(body.data) || body.data.some((item) => item?.enabled === true)) throw error('O perfil Hermes da agenda possui ferramentas habilitadas.', 503, 'HERMES_UNSAFE_TOOLSET');
  }

  async #ensureSession() {
    try { await this.#request(`/api/sessions/${encodeURIComponent(this.sessionId)}`); return; } catch (reason) {
      if (reason.code !== 'HERMES_UNAVAILABLE') throw reason;
    }
    await this.#request('/api/sessions', { method: 'POST', body: JSON.stringify({ id: this.sessionId, source: 'agenda_cavaleiro', title: 'Agenda do Cavaleiro', system_prompt: SYSTEM_PROMPT }) });
  }

  #appointments() {
    return this.database.prepare('SELECT id,title,description,date,start_time AS startTime,end_time AS endTime,category_id AS categoryId,completed,updated_at AS updatedAt FROM appointments ORDER BY date,start_time').all();
  }

  async chat(message) {
    const run = async () => {
      await this.#assertSafe();
      await this.#ensureSession();
      const appointments = this.#appointments();
      const referenceNow = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T') + '-03:00';
      const body = await this.#request(`/api/sessions/${encodeURIComponent(this.sessionId)}/chat`, { method: 'POST', headers: { 'X-Hermes-Session-Key': this.sessionId }, body: JSON.stringify({ input: message, instructions: `${SYSTEM_PROMPT}\n\nreferenceNow: ${referenceNow}\nCURRENT_APPOINTMENTS: ${JSON.stringify(appointments)}` }) });
      const content = body?.message?.content;
      if (typeof content !== 'string') throw error('O Hermes respondeu em um formato inesperado.', 502, 'INVALID_HERMES_RESPONSE');
      const proposal = parseProposal(content, appointments);
      if (proposal.type === 'none') return { proposal };
      const proposalId = crypto.randomUUID();
      this.#proposals.set(proposalId, { proposal, expiresAt: Date.now() + PROPOSAL_TTL_MS });
      return { proposal: { ...proposal, proposalId } };
    };
    const result = this.#queue.then(run, run);
    this.#queue = result.then(() => undefined, () => undefined);
    return result;
  }

  confirm(proposalId) {
    const stored = this.#proposals.get(proposalId);
    this.#proposals.delete(proposalId);
    if (!stored || stored.expiresAt < Date.now()) throw error('Esta proposta expirou. Peça ao assistente novamente.', 409, 'EXPIRED_PROPOSAL');
    const { proposal } = stored;
    const now = new Date().toISOString();
    if (proposal.type === 'create') {
      const id = crypto.randomUUID();
      const d = proposal.draft;
      this.database.prepare('INSERT INTO appointments (id,title,description,date,start_time,end_time,category_id,completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)').run(id, d.title, d.description, d.date, d.startTime, d.endTime, d.categoryId, now, now);
      return { type: 'create', appointmentId: id };
    }
    const current = this.database.prepare('SELECT updated_at FROM appointments WHERE id = ?').get(proposal.eventId);
    if (!current || current.updated_at !== proposal.sourceUpdatedAt) throw error('O compromisso mudou depois da proposta. Peça uma nova sugestão.', 409, 'STALE_PROPOSAL');
    if (proposal.type === 'delete') {
      this.database.prepare('DELETE FROM appointments WHERE id = ?').run(proposal.eventId);
      return { type: 'delete', appointmentId: proposal.eventId };
    }
    const d = proposal.draft;
    this.database.prepare('UPDATE appointments SET title=?,description=?,date=?,start_time=?,end_time=?,category_id=?,updated_at=? WHERE id=?').run(d.title, d.description, d.date, d.startTime, d.endTime, d.categoryId, now, proposal.eventId);
    return { type: 'update', appointmentId: proposal.eventId };
  }
}
