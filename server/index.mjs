import { createApp } from './app.mjs';
import { database, databasePath } from './database.mjs';

const port = Number(process.env.PORT || 3001);

createApp(database).listen(port, '0.0.0.0', () => {
  console.log(`API da agenda: http://localhost:${port}`);
  console.log(`Banco SQLite: ${databasePath}`);
});
