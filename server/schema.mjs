/**
 * Esquema, migrações e serialização do banco da agenda.
 *
 * Este módulo é livre de efeitos colaterais: recebe a conexão como argumento em
 * vez de abrir o banco. Assim o servidor usa o arquivo real e os testes usam um
 * banco temporário, sem risco para os dados do usuário.
 */

const CATEGORY_IDS = ['trabalho', 'pessoal', 'saude', 'estudos', 'social', 'outros'];

/** Verifica se uma coluna já existe — base das migrações aditivas. */
function hasColumn(database, table, column) {
  return database.prepare(`PRAGMA table_info(${table})`).all().some((info) => info.name === column);
}

/** Cria as tabelas ausentes e aplica as migrações. Idempotente. */
export function applySchema(database) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120),
      description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 500),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      category_id TEXT NOT NULL CHECK(category_id IN ('trabalho','pessoal','saude','estudos','social','outros')),
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS appointments_date_time_idx ON appointments(date, start_time);
    CREATE TABLE IF NOT EXISTS collection_topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL DEFAULT '📁',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS collection_items (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES collection_topics(id) ON DELETE CASCADE,
      title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
      notes TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 1000),
      created_at TEXT NOT NULL,
      UNIQUE(topic_id, title COLLATE NOCASE)
    );
    CREATE INDEX IF NOT EXISTS collection_items_topic_idx ON collection_items(topic_id, created_at DESC);
  `);

  const now = new Date().toISOString();
  const recordMigration = database.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)');
  recordMigration.run(1, now);
  recordMigration.run(2, now);

  // Migração 3 — conclusão de compromissos. Bancos criados antes dela ganham a
  // coluna por ALTER TABLE: nenhum compromisso é reescrito e o que já existia
  // passa a valer como não concluído. Quem já tem a coluna não é tocado, então
  // rodar de novo preserva o que o usuário marcou.
  if (!hasColumn(database, 'appointments', 'completed')) {
    database.exec('ALTER TABLE appointments ADD COLUMN completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1))');
  }
  recordMigration.run(3, now);

  database.prepare("INSERT OR IGNORE INTO collection_topics (id, name, icon, created_at) VALUES ('filmes', 'Filmes', '🎬', ?)").run(now);
}

/** Carga inicial de exemplo — roda uma única vez por banco. */
export function seedInitialData(database) {
  const initialized = database.prepare("SELECT value FROM app_metadata WHERE key = 'initial_data_loaded'").get();
  if (initialized) return false;

  database.exec('DELETE FROM appointments');
  const now = new Date().toISOString();
  const insert = database.prepare('INSERT INTO appointments (id,title,description,date,start_time,end_time,category_id,completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)');
  insert.run(crypto.randomUUID(), 'Aniversário da minha mãe', '', '2026-08-29', '09:00', '10:00', 'pessoal', now, now);
  insert.run(crypto.randomUUID(), 'Hopi Hari', '', '2026-09-08', '08:00', '20:00', 'social', now, now);
  database.prepare("INSERT INTO app_metadata (key, value) VALUES ('initial_data_loaded', ?)").run(now);
  return true;
}

export function rowToAppointment(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    categoryId: row.category_id,
    // SQLite guarda 0/1; a interface trabalha com booleano.
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export { CATEGORY_IDS };
