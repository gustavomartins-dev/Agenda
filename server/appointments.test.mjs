/**
 * @vitest-environment node
 *
 * Testes da API e da migração de conclusão. Cada teste abre um banco temporário
 * próprio — o banco real do usuário (`data/agenda.sqlite`) nunca é tocado.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app.mjs';
import { applySchema, rowToAppointment, seedInitialData } from './schema.mjs';

/** Esquema exatamente como ficou na versão anterior, sem a coluna `completed`. */
const LEGACY_SCHEMA = `
  CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
  CREATE TABLE app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120),
    description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 500),
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    category_id TEXT NOT NULL CHECK(category_id IN ('trabalho','pessoal','saude','estudos','social','outros')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

let directory = '';
let database = null;
let server = null;
let baseUrl = '';

function openDatabase(name = 'teste.sqlite') {
  database = new DatabaseSync(join(directory, name));
  return database;
}

function insertAppointment(db, overrides = {}) {
  const row = {
    id: crypto.randomUUID(),
    title: 'Compromisso antigo',
    description: '',
    date: '2026-08-29',
    start_time: '09:00',
    end_time: '10:00',
    category_id: 'pessoal',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
  db.prepare('INSERT INTO appointments (id,title,description,date,start_time,end_time,category_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
    row.id, row.title, row.description, row.date, row.start_time, row.end_time, row.category_id, row.created_at, row.updated_at,
  );
  return row;
}

async function startServer(db) {
  const app = createApp(db, { serveStatic: false });
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return baseUrl;
}

async function api(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.status === 204 ? null : await response.json();
  return { status: response.status, body: payload };
}

const draft = {
  title: 'Retirar meu passaporte',
  description: 'Levar documento com foto',
  date: '2026-09-02',
  startTime: '10:00',
  endTime: '11:00',
  categoryId: 'pessoal',
};

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'agenda-teste-'));
});

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  server = null;
  database?.close();
  database = null;
  rmSync(directory, { recursive: true, force: true });
});

describe('migração da coluna completed', () => {
  it('adiciona a coluna a um banco existente sem perder compromissos, com padrão não concluído', () => {
    const db = openDatabase();
    db.exec(LEGACY_SCHEMA);
    const antigo = insertAppointment(db);

    applySchema(db);

    const columns = db.prepare('PRAGMA table_info(appointments)').all().map((column) => column.name);
    expect(columns).toContain('completed');

    const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(antigo.id);
    expect(row.title).toBe('Compromisso antigo');
    expect(row.completed).toBe(0);
  });

  it('pode ser aplicada repetidas vezes preservando o que já estava concluído', () => {
    const db = openDatabase();
    db.exec(LEGACY_SCHEMA);
    const antigo = insertAppointment(db);

    applySchema(db);
    db.prepare('UPDATE appointments SET completed = 1 WHERE id = ?').run(antigo.id);

    expect(() => applySchema(db)).not.toThrow();
    expect(() => applySchema(db)).not.toThrow();

    const row = db.prepare('SELECT completed FROM appointments WHERE id = ?').get(antigo.id);
    expect(row.completed).toBe(1);
    const columns = db.prepare('PRAGMA table_info(appointments)').all().filter((column) => column.name === 'completed');
    expect(columns).toHaveLength(1);
  });

  it('cria bancos novos já com a coluna e registra a migração 3', () => {
    const db = openDatabase('novo.sqlite');
    applySchema(db);

    const columns = db.prepare('PRAGMA table_info(appointments)').all();
    const completed = columns.find((column) => column.name === 'completed');
    expect(completed).toBeDefined();
    expect(completed.notnull).toBe(1);

    const versions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((item) => item.version);
    expect(versions).toContain(3);
  });

  it('serializa completed como booleano', () => {
    expect(rowToAppointment({ id: 'a', title: 't', description: '', date: '2026-08-29', start_time: '09:00', end_time: '10:00', category_id: 'pessoal', created_at: 'x', updated_at: 'y', completed: 0 }).completed).toBe(false);
    expect(rowToAppointment({ id: 'a', title: 't', description: '', date: '2026-08-29', start_time: '09:00', end_time: '10:00', category_id: 'pessoal', created_at: 'x', updated_at: 'y', completed: 1 }).completed).toBe(true);
  });

  it('mantém os compromissos de exemplo não concluídos na carga inicial', () => {
    const db = openDatabase();
    applySchema(db);
    seedInitialData(db);

    const rows = db.prepare('SELECT completed FROM appointments').all();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.completed === 0)).toBe(true);
  });
});

describe('API de conclusão', () => {
  beforeEach(async () => {
    const db = openDatabase();
    applySchema(db);
    await startServer(db);
  });

  it('cria compromissos não concluídos', async () => {
    const created = await api('POST', '/api/appointments', draft);
    expect(created.status).toBe(201);
    expect(created.body.completed).toBe(false);

    const listed = await api('GET', '/api/appointments');
    expect(listed.body[0].completed).toBe(false);
  });

  it('marca como concluído e volta a não concluído', async () => {
    const { body: created } = await api('POST', '/api/appointments', draft);

    const concluido = await api('PATCH', `/api/appointments/${created.id}/completion`, { completed: true });
    expect(concluido.status).toBe(200);
    expect(concluido.body).toMatchObject({ id: created.id, title: draft.title, completed: true });

    expect((await api('GET', '/api/appointments')).body[0].completed).toBe(true);

    const reaberto = await api('PATCH', `/api/appointments/${created.id}/completion`, { completed: false });
    expect(reaberto.body.completed).toBe(false);
    expect((await api('GET', '/api/appointments')).body[0].completed).toBe(false);
  });

  it('é idempotente: repetir a mesma conclusão não muda o resultado', async () => {
    const { body: created } = await api('POST', '/api/appointments', draft);

    await api('PATCH', `/api/appointments/${created.id}/completion`, { completed: true });
    const segunda = await api('PATCH', `/api/appointments/${created.id}/completion`, { completed: true });

    expect(segunda.status).toBe(200);
    expect(segunda.body.completed).toBe(true);
  });

  it('rejeita valor que não é booleano', async () => {
    const { body: created } = await api('POST', '/api/appointments', draft);

    const invalido = await api('PATCH', `/api/appointments/${created.id}/completion`, { completed: 'sim' });
    expect(invalido.status).toBe(400);
    expect(invalido.body.error).toBeTruthy();
    expect((await api('GET', '/api/appointments')).body[0].completed).toBe(false);
  });

  it('responde 404 para compromisso inexistente', async () => {
    const ausente = await api('PATCH', '/api/appointments/nao-existe/completion', { completed: true });
    expect(ausente.status).toBe(404);
  });

  it('preserva a conclusão ao editar os outros campos', async () => {
    const { body: created } = await api('POST', '/api/appointments', draft);
    await api('PATCH', `/api/appointments/${created.id}/completion`, { completed: true });

    const editado = await api('PUT', `/api/appointments/${created.id}`, { ...draft, title: 'Passaporte retirado' });
    expect(editado.status).toBe(200);
    expect(editado.body.title).toBe('Passaporte retirado');
    expect(editado.body.completed).toBe(true);
  });
});
