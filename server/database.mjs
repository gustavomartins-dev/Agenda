import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import { applySchema, rowToAppointment, seedInitialData } from './schema.mjs';

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = resolve(serverDirectory, '../data');
mkdirSync(dataDirectory, { recursive: true });

export const databasePath = resolve(dataDirectory, 'agenda.sqlite');
export const database = new DatabaseSync(databasePath);

applySchema(database);
seedInitialData(database);

export { rowToAppointment };
