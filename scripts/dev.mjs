import { spawn } from 'node:child_process';
import electron from 'electron';

const env = { ...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173' };
delete env.ELECTRON_RUN_AS_NODE;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { stdio: 'inherit', windowsHide: true });
let desktop;
let closing = false;
const close = () => { if (closing) return; closing = true; desktop?.kill(); server.kill(); };
process.on('SIGINT', close); process.on('SIGTERM', close);
server.on('exit', code => { if (!closing) { close(); process.exit(code || 0); } });
for (let i = 0; i < 100; i++) {
  try {
    const response = await fetch(env.VITE_DEV_SERVER_URL);
    if (response.ok) {
      desktop = spawn(electron, ['.'], { stdio: 'inherit', env, windowsHide: false });
      desktop.on('exit', code => { close(); process.exit(code || 0); });
      break;
    }
  } catch { /* Wait for the local Vite server. */ }
  await new Promise(resolve => setTimeout(resolve, 200));
}
if (!desktop) { close(); console.error('The development server did not start.'); process.exit(1); }
