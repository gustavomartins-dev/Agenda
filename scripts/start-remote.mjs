import { execFileSync, spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(resolve(process.env.HOME, 'agenda-namorada/server/.env'));
  process.env.HERMES_SESSION_ID = 'agenda_cavaleiro_v1';
} catch {
  // O calendário continua funcional; a seção Assistente mostrará que falta configuração.
}

try {
  accessSync(resolve(projectDirectory, 'dist/index.html'), constants.R_OK);
} catch {
  console.error('Build não encontrado. Execute "npm run build" antes de iniciar.');
  process.exit(1);
}

try {
  execFileSync('tailscale', ['status'], { stdio: 'ignore' });
} catch {
  console.error('Tailscale não está instalado ou conectado. Consulte a seção "Acesso remoto" do README.');
  process.exit(1);
}

try {
  execFileSync('tailscale', ['serve', '--bg', '3001'], { stdio: 'inherit' });
  const hostname = execFileSync('tailscale', ['status', '--self', '--json'], { encoding: 'utf8' });
  const dnsName = JSON.parse(hostname).Self?.DNSName?.replace(/\.$/, '');
  if (dnsName) console.log(`Agenda privada: https://${dnsName}`);
} catch {
  console.error('Não foi possível configurar o Tailscale Serve. Execute "tailscale serve 3001" para concluir a autorização.');
  process.exit(1);
}

const server = spawn(process.execPath, ['server/index.mjs'], {
  cwd: projectDirectory,
  env: { ...process.env, HOST: '127.0.0.1', PORT: '3001', NODE_ENV: 'production' },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}

server.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
