import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import electron from 'electron';

if (!existsSync('dist/index.html')) { console.error('Build the app first with npm run build.'); process.exit(1); }
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE; delete env.VITE_DEV_SERVER_URL;
const desktop = spawn(electron, ['.'], { stdio: 'inherit', env, windowsHide: false });
desktop.on('exit', code => process.exit(code || 0));
