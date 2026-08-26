import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userHome = process.env.HOME;

if (!userHome) throw new Error('Não foi possível localizar o diretório pessoal.');

const serviceDirectory = resolve(userHome, '.config/systemd/user');
const servicePath = resolve(serviceDirectory, 'agenda-cavaleiro.service');
const nodePath = process.execPath;
const npmPath = execFileSync('which', ['npm'], { encoding: 'utf8' }).trim();

const service = `[Unit]
Description=Agenda do Cavaleiro com acesso privado pelo Tailscale
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${projectDirectory}
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3001
EnvironmentFile=-${userHome}/agenda-namorada/server/.env
Environment=HERMES_SESSION_ID=agenda_cavaleiro_v1
ExecStartPre=${npmPath} run build
ExecStartPre=${nodePath} scripts/backup.mjs
ExecStartPre=/usr/bin/tailscale serve --bg 3001
ExecStart=${nodePath} server/index.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`;

mkdirSync(serviceDirectory, { recursive: true });
writeFileSync(servicePath, service, { mode: 0o600 });
execFileSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'inherit' });
execFileSync('systemctl', ['--user', 'enable', '--now', 'agenda-cavaleiro.service'], { stdio: 'inherit' });
console.log(`Serviço instalado: ${servicePath}`);
