import { execFileSync } from 'node:child_process';

try {
  execFileSync('tailscale', ['serve', 'reset'], { stdio: 'inherit' });
  console.log('Publicação privada da agenda desativada.');
} catch {
  console.error('Não foi possível desativar o Tailscale Serve. Verifique se o Tailscale está instalado e conectado.');
  process.exitCode = 1;
}
