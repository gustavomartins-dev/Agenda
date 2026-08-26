import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATEGORY_IDS, rowToAppointment } from './schema.mjs';
import { HermesAssistant } from './hermes.mjs';

const categories = new Set(CATEGORY_IDS);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** Apara os campos de texto do compromisso antes de gravar. */
function normalizeDraft(value) {
  return {
    title: value.title.trim(),
    description: value.description.trim(),
    date: value.date,
    startTime: value.startTime,
    endTime: value.endTime,
    categoryId: value.categoryId,
  };
}

function validateDraft(value) {
  if (!value || typeof value !== 'object') return 'Dados do compromisso são obrigatórios.';
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.trim().length > 120) return 'Título inválido.';
  if (typeof value.description !== 'string' || value.description.length > 500) return 'Descrição inválida.';
  if (typeof value.date !== 'string' || !datePattern.test(value.date)) return 'Data inválida.';
  if (!timePattern.test(value.startTime) || !timePattern.test(value.endTime) || value.endTime <= value.startTime) return 'Horário inválido.';
  if (!categories.has(value.categoryId)) return 'Categoria inválida.';
  return null;
}

/**
 * Monta a API da agenda sobre a conexão recebida.
 * `serveStatic` fica desligado nos testes, que só exercitam as rotas `/api`.
 */
export function createApp(database, { serveStatic = true, assistant: assistantOverride } = {}) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  const assistant = assistantOverride ?? new HermesAssistant(database);

  /** Relê o compromisso gravado — a resposta reflete exatamente o banco. */
  const findAppointment = (id) => {
    const row = database.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    return row ? rowToAppointment(row) : null;
  };

  app.get('/api/health', (_request, response) => response.json({ ok: true }));

  app.post('/api/assistant/chat', async (request, response, next) => {
    const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';
    if (!message || message.length > 1000) return response.status(400).json({ error: 'Envie uma mensagem com até 1000 caracteres.' });
    try { return response.json(await assistant.chat(message)); } catch (reason) { return next(reason); }
  });

  app.post('/api/assistant/confirm', (request, response, next) => {
    const proposalId = typeof request.body?.proposalId === 'string' ? request.body.proposalId : '';
    if (!proposalId) return response.status(400).json({ error: 'Proposta inválida.' });
    try { return response.json(assistant.confirm(proposalId)); } catch (reason) { return next(reason); }
  });

  app.get('/api/appointments', (_request, response) => {
    const rows = database.prepare('SELECT * FROM appointments ORDER BY date, start_time, title').all();
    response.json(rows.map(rowToAppointment));
  });

  app.post('/api/appointments', (request, response) => {
    const error = validateDraft(request.body);
    if (error) return response.status(400).json({ error });
    const draft = normalizeDraft(request.body);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    // Todo compromisso nasce pendente: a conclusão é sempre uma ação explícita.
    database.prepare('INSERT INTO appointments (id,title,description,date,start_time,end_time,category_id,completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)').run(
      id, draft.title, draft.description, draft.date, draft.startTime, draft.endTime, draft.categoryId, now, now,
    );
    return response.status(201).json(findAppointment(id));
  });

  // A edição não menciona `completed`: quem estava concluído continua concluído.
  app.put('/api/appointments/:id', (request, response) => {
    const error = validateDraft(request.body);
    if (error) return response.status(400).json({ error });
    if (!database.prepare('SELECT id FROM appointments WHERE id = ?').get(request.params.id)) return response.status(404).json({ error: 'Compromisso não encontrado.' });
    const draft = normalizeDraft(request.body);
    const updatedAt = new Date().toISOString();
    database.prepare('UPDATE appointments SET title=?,description=?,date=?,start_time=?,end_time=?,category_id=?,updated_at=? WHERE id=?').run(
      draft.title, draft.description, draft.date, draft.startTime, draft.endTime, draft.categoryId, updatedAt, request.params.id,
    );
    return response.json(findAppointment(request.params.id));
  });

  /**
   * Conclusão do compromisso. Recebe o estado desejado em vez de alternar, o que
   * torna a rota idempotente: reenviar o mesmo valor devolve o mesmo resultado.
   */
  app.patch('/api/appointments/:id/completion', (request, response) => {
    const completed = request.body?.completed;
    if (typeof completed !== 'boolean') return response.status(400).json({ error: 'O campo "completed" deve ser true ou false.' });
    if (!database.prepare('SELECT id FROM appointments WHERE id = ?').get(request.params.id)) return response.status(404).json({ error: 'Compromisso não encontrado.' });
    database.prepare('UPDATE appointments SET completed = ?, updated_at = ? WHERE id = ?').run(completed ? 1 : 0, new Date().toISOString(), request.params.id);
    return response.json(findAppointment(request.params.id));
  });

  app.delete('/api/appointments/:id', (request, response) => {
    const result = database.prepare('DELETE FROM appointments WHERE id = ?').run(request.params.id);
    if (result.changes === 0) return response.status(404).json({ error: 'Compromisso não encontrado.' });
    return response.status(204).end();
  });

  app.delete('/api/appointments', (_request, response) => {
    database.exec('DELETE FROM appointments');
    response.status(204).end();
  });

  app.get('/api/collection/topics', (_request, response) => {
    const topics = database.prepare(`
      SELECT t.id, t.name, t.icon, t.created_at AS createdAt, COUNT(i.id) AS itemCount
      FROM collection_topics t LEFT JOIN collection_items i ON i.topic_id = t.id
      GROUP BY t.id ORDER BY t.created_at
    `).all();
    response.json(topics);
  });

  app.get('/api/collection/topics/:topicId/items', (request, response) => {
    const topic = database.prepare('SELECT id FROM collection_topics WHERE id = ?').get(request.params.topicId);
    if (!topic) return response.status(404).json({ error: 'Tópico não encontrado.' });
    const items = database.prepare('SELECT id, topic_id AS topicId, title, notes, created_at AS createdAt FROM collection_items WHERE topic_id = ? ORDER BY created_at DESC').all(request.params.topicId);
    return response.json(items);
  });

  app.post('/api/collection/topics/:topicId/items', (request, response) => {
    const title = typeof request.body?.title === 'string' ? request.body.title.trim() : '';
    const notes = typeof request.body?.notes === 'string' ? request.body.notes.trim() : '';
    if (!title || title.length > 200) return response.status(400).json({ error: 'Informe um nome com até 200 caracteres.' });
    if (notes.length > 1000) return response.status(400).json({ error: 'As observações devem ter até 1000 caracteres.' });
    if (!database.prepare('SELECT id FROM collection_topics WHERE id = ?').get(request.params.topicId)) return response.status(404).json({ error: 'Tópico não encontrado.' });
    const item = { id: crypto.randomUUID(), topicId: request.params.topicId, title, notes, createdAt: new Date().toISOString() };
    try {
      database.prepare('INSERT INTO collection_items (id, topic_id, title, notes, created_at) VALUES (?, ?, ?, ?, ?)').run(item.id, item.topicId, item.title, item.notes, item.createdAt);
      return response.status(201).json(item);
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) return response.status(409).json({ error: 'Esse item já está salvo.' });
      throw error;
    }
  });

  app.delete('/api/collection/items/:id', (request, response) => {
    const result = database.prepare('DELETE FROM collection_items WHERE id = ?').run(request.params.id);
    if (result.changes === 0) return response.status(404).json({ error: 'Item não encontrado.' });
    return response.status(204).end();
  });

  if (serveStatic) {
    const distDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
    app.use(express.static(distDirectory));
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.path.startsWith('/api/')) return next();
      return response.sendFile(resolve(distDirectory, 'index.html'));
    });
  }

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(Number(error?.status) || 500).json({ error: Number(error?.status) ? error.message : 'Erro interno do servidor.', code: error?.code });
  });

  return app;
}
