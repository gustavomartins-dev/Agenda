import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = resolve(projectDirectory, 'data/agenda.sqlite');
const backupDirectory = resolve(projectDirectory, 'backups');

if (!existsSync(databasePath)) {
  console.log('Banco ainda não existe; nenhum backup foi necessário.');
  process.exit(0);
}

mkdirSync(backupDirectory, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const destination = resolve(backupDirectory, `agenda-${timestamp}.sqlite`);
copyFileSync(databasePath, destination);

console.log(`Backup criado: backups/${basename(destination)}`);
