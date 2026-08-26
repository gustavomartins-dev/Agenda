import { createApp } from './app.mjs';
import { database, databasePath } from './database.mjs';

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';

createApp(database).listen(port, host, () => {
  console.log(`Agenda: http://${host}:${port}`);
  console.log(`Banco SQLite: ${databasePath}`);
});
