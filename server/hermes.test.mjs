/** @vitest-environment node */
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HermesAssistant } from './hermes.mjs';
import { applySchema } from './schema.mjs';

const env = {
  HERMES_API_BASE_URL: 'http://127.0.0.1:8642',
  HERMES_API_SERVER_KEY: 'segredo-de-teste',
  HERMES_NO_MCP_CONFIRMED: 'true',
  HERMES_SESSION_ID: 'agenda_teste',
  HERMES_TIMEOUT_MS: '1000',
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function database() {
  const db = new DatabaseSync(':memory:');
  applySchema(db);
  db.exec('DELETE FROM appointments');
  return db;
}

afterEach(() => vi.restoreAllMocks());

describe('integração segura com Hermes', () => {
  it('não altera o banco durante o chat e só cria após confirmação', async () => {
    const db = database();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ name: 'no_mcp', enabled: false }] }))
      .mockResolvedValueOnce(response({ session: { id: 'agenda_teste' } }))
      .mockResolvedValueOnce(response({ message: { content: JSON.stringify({
        type: 'create', eventId: null, sourceUpdatedAt: null, title: 'Acender o Bat-sinal', description: '', date: '2026-08-27', startTime: '20:00', endTime: '21:00', categoryId: 'pessoal', missingFields: [], requiresConfirmation: true, assistantMessage: 'Posso preparar o Bat-sinal para amanhã às 20h.',
      }) } }));
    const assistant = new HermesAssistant(db, env);

    const result = await assistant.chat('Marque o Bat-sinal amanhã às 20h');
    expect(result.proposal).toMatchObject({ type: 'create', proposalId: expect.any(String) });
    expect(db.prepare('SELECT COUNT(*) AS total FROM appointments').get().total).toBe(0);

    assistant.confirm(result.proposal.proposalId);
    expect(db.prepare('SELECT title FROM appointments').get().title).toBe('Acender o Bat-sinal');
    db.close();
  });

  it('recusa conversar se uma ferramenta estiver habilitada', async () => {
    const db = database();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ data: [{ name: 'terminal', enabled: true }] }));
    const assistant = new HermesAssistant(db, env);

    await expect(assistant.chat('Liste meus compromissos')).rejects.toMatchObject({ code: 'HERMES_UNSAFE_TOOLSET', status: 503 });
    db.close();
  });

  it('rejeita confirmação repetida', async () => {
    const db = database();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response({ session: { id: 'agenda_teste' } }))
      .mockResolvedValueOnce(response({ message: { content: JSON.stringify({
        type: 'create', title: 'Teste', description: '', date: '2026-08-27', startTime: '10:00', endTime: '11:00', categoryId: 'outros', assistantMessage: 'Confirmar teste.',
      }) } }));
    const assistant = new HermesAssistant(db, env);
    const { proposal } = await assistant.chat('Crie um teste');

    assistant.confirm(proposal.proposalId);
    expect(() => assistant.confirm(proposal.proposalId)).toThrow(/expirou/i);
    db.close();
  });
});
