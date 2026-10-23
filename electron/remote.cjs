const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomBytes, randomInt, timingSafeEqual } = require('node:crypto');

const COMMANDS = new Set(['select', 'surface', 'geometry', 'nudge', 'effect', 'media', 'add', 'duplicate', 'delete', 'layer', 'brightness', 'play', 'restart', 'blackout', 'mesh', 'undo', 'redo']);
const COOKIE = 'nox_remote';
const text = (v, max = 100) => typeof v === 'string' ? v.slice(0, max) : '';
const number = v => typeof v === 'number' && Number.isFinite(v) ? v : 0;
const points = value => Array.isArray(value) ? value.slice(0, 64).map(p => ({ x: number(p?.x), y: number(p?.y) })) : [];

// This is deliberately a public editing view, never a RenderState/project dump.
// Photos, prompts, file paths, media bytes, audio frames and AI credentials stay on the PC.
function copyRemoteState(input) {
  if (!input || !Number.isSafeInteger(input.revision) || input.revision < 1 || !input.project || JSON.stringify(input).length > 500_000) throw Error('Invalid remote state.');
  const p = input.project;
  if (!Array.isArray(p.surfaces) || p.surfaces.length > 32) throw Error('Invalid remote shapes.');
  return {
    revision: input.revision,
    project: {
      name: text(p.name), width: number(p.width), height: number(p.height), brightness: number(p.brightness),
      layers: (p.layers || []).slice(0, 16).map(l => ({ id: text(l.id), name: text(l.name, 80), visible: !!l.visible, locked: !!l.locked })),
      surfaces: p.surfaces.map(s => ({
        id: text(s.id), name: text(s.name, 80), kind: text(s.kind, 10), points: points(s.points),
        curves: s.curves?.slice(0, 64).map(c => c ? { control1: points([c.control1])[0], control2: points([c.control2])[0] } : null),
        effectId: text(s.effectId), color: text(s.color, 7), colorCycle: !!s.colorCycle,
        opacity: number(s.opacity), speed: number(s.speed), scale: number(s.scale), feather: number(s.feather),
        visible: !!s.visible, locked: !!s.locked, blend: text(s.blend, 20), seed: number(s.seed),
        cutoutOf: s.cutoutOf ? text(s.cutoutOf) : undefined, layerId: text(s.layerId),
        effectSide: s.effectSide === 'right' ? 'right' : 'left',
        contentTransform: s.contentTransform ? { rotation: number(s.contentTransform.rotation), offsetX: number(s.contentTransform.offsetX), offsetY: number(s.contentTransform.offsetY) } : undefined,
        layerLocked: !!s.layerLocked, layerVisible: !!s.layerVisible,
        stackName: text(s.stackName, 80), mediaName: text(s.mediaName, 160),
      })),
    },
    selectedId: input.selectedId === null ? null : text(input.selectedId),
    playing: !!input.playing, blackout: !!input.blackout, mesh: !!input.mesh,
    outputOpen: !!input.outputOpen, canUndo: !!input.canUndo, canRedo: !!input.canRedo, busy: !!input.busy,
    media: (input.media || []).slice(0, 500).map(m => ({ id: text(m.id, 64), name: text(m.name, 160) })),
  };
}

function privateAddress(value) {
  const address = String(value).replace(/^::ffff:/, '');
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n, i) => !Number.isInteger(n) || n < 0 || n > 255 || String(n) !== address.split('.')[i])) return false;
  return parts[0] === 127 || parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 169 && parts[1] === 254);
}
function lanAddresses(interfaces = os.networkInterfaces()) {
  const rank = name => /vethernet|virtual|vmware|virtualbox|docker|wsl|vpn|tun|tap|tailscale|zerotier/i.test(name) ? 3 : /wi-?fi|wlan|wireless/i.test(name) ? 0 : /ethernet|^eth\d/i.test(name) ? 1 : 2;
  // Prefer the network a phone can reach; keep other adapters available in the picker.
  return [...new Set(Object.entries(interfaces).sort(([a], [b]) => rank(a) - rank(b)).flatMap(([, entries]) => entries || []).filter(i => i.family === 'IPv4' && !i.internal && privateAddress(i.address)).map(i => i.address))];
}
function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
async function remoteAssets(root) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, '.vite/manifest.json'), 'utf8'));
  const files = new Set(['remote.html']), visited = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) throw Error('Phone remote build is incomplete. Run npm run build.');
    for (const file of [entry.file, ...(entry.css || []), ...(entry.assets || [])]) {
      if (!/^assets\/[a-zA-Z0-9_.-]+\.(js|css|svg|png|woff2)$/.test(file)) throw Error('Invalid phone remote asset.');
      files.add(file);
    }
    for (const child of [...(entry.imports || []), ...(entry.dynamicImports || [])]) visit(child);
  }
  visit('remote.html');
  const result = new Map();
  for (const file of files) {
    const info = await fs.lstat(path.join(root, file));
    if (!info.isFile() || info.size > 8_000_000) throw Error('Invalid phone remote asset.');
    result.set('/' + file, await fs.readFile(path.join(root, file)));
  }
  result.set('/', result.get('/remote.html'));
  return result;
}

function createRemoteServer({ assetRoot, onCommand, onStatus = () => {}, addresses = lanAddresses, now = Date.now, commandTimeout = 6000 }) {
  let server = null, starting = null, stopping = null, assets, hosts = new Set(), urls = [], port = 0;
  let code = '', codeExpires = 0, expires = 0, timer, client = null, state = null, pending = null;
  let generation = 0;
  let pairWindow = 0, pairAttempts = 0, totalAttempts = 0, commandWindow = 0, commandCount = 0;
  const completed = new Map();
  function status() {
    return { running: !!server?.listening, urls, code: client ? '' : code, codeExpires, expires, connected: !!client, device: client?.name || '' };
  }
  const notify = () => onStatus(status());
  function json(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  }
  function remember(id, result) {
    completed.set(id, result);
    if (completed.size > 128) completed.delete(completed.keys().next().value);
  }
  function cancelPending() {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.resolve({ status: 503, body: { error: 'Remote session ended. Reconnect from the desktop.' } });
    pending = null;
  }
  async function stop() {
    if (starting) await starting.catch(() => {});
    if (stopping) return stopping;
    const previous = server;
    generation++; server = null; client = null; code = ''; urls = []; hosts.clear();
    clearInterval(timer); cancelPending(); completed.clear(); notify();
    if (!previous) return status();
    stopping = new Promise(resolve => { previous.close(resolve); previous.closeAllConnections(); });
    await stopping; stopping = null;
    return status();
  }
  function disconnect() {
    generation++;
    cancelPending(); client = null; completed.clear();
    code = String(randomInt(100000, 1000000)); codeExpires = now() + 10 * 60_000;
    pairAttempts = 0; totalAttempts = 0; pairWindow = now(); notify();
    return status();
  }
  async function body(req) {
    if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw Error('Send JSON commands.');
    if (Number(req.headers['content-length']) > 32_768) throw Error('Command is too large.');
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 32_768) throw Error('Command is too large.'); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  function authorized(req) {
    const cookie = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    return client && equal(cookie, client.token);
  }
  async function handle(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (!server?.listening || now() >= expires) { json(res, 503, { error: 'Remote session ended.' }); void stop(); return; }
    if (!privateAddress(req.socket.remoteAddress) || !hosts.has(req.headers.host)) return json(res, 403, { error: 'Use the local address shown in Nox.' });
    const origin = 'http://' + req.headers.host;
    if ((req.headers.origin && req.headers.origin !== origin) || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) return json(res, 403, { error: 'Cross-origin requests are not allowed.' });
    const url = new URL(req.url, origin);
    const session = generation;
    if (url.pathname.startsWith('/api/')) {
      if (req.headers['x-nox-remote'] !== '1' || (req.method === 'POST' && req.headers.origin !== origin)) return json(res, 403, { error: 'Use the Nox remote page.' });
      if (url.pathname === '/api/pair' && req.method === 'POST') {
        if (client) return json(res, 409, { error: 'A phone is already paired. Disconnect it in Nox first.' });
        if (now() > codeExpires) return json(res, 401, { error: 'Pairing code expired. Restart the remote in Nox.' });
        if (now() - pairWindow >= 60_000) { pairWindow = now(); pairAttempts = 0; }
        if (pairAttempts >= 10 || totalAttempts >= 30) return json(res, 429, { error: 'Too many pairing attempts. Wait a minute or restart the remote in Nox.' });
        pairAttempts++; totalAttempts++;
        const data = await body(req);
        if (generation !== session || now() > codeExpires) return json(res, 401, { error: 'Pairing code expired or changed. Use the code currently shown in Nox.' });
        if (client) return json(res, 409, { error: 'A phone is already paired. Disconnect it in Nox first.' });
        if (!/^\d{6}$/.test(data.code) || !equal(data.code, code)) return json(res, 401, { error: 'Pairing code does not match.' });
        client = { token: randomBytes(32).toString('hex'), name: text(data.name, 40).trim() || 'Phone' };
        completed.clear();
        res.setHeader('Set-Cookie', `${COOKIE}=${client.token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800`);
        notify(); return json(res, 200, { paired: true });
      }
      if (!authorized(req)) return json(res, 401, { error: 'Pair this phone using the code shown in Nox.' });
      if (url.pathname === '/api/state' && req.method === 'GET') {
        if (!state) return json(res, 503, { error: 'Waiting for the desktop editor.' });
        if (String(state.revision) === url.searchParams.get('after')) { res.writeHead(204); res.end(); return; }
        return json(res, 200, state);
      }
      if (url.pathname === '/api/disconnect' && req.method === 'POST') {
        await body(req);
        if (generation !== session || !authorized(req)) return json(res, 401, { error: 'Remote access was revoked.' });
        disconnect();
        res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0`);
        return json(res, 200, { disconnected: true });
      }
      if (url.pathname !== '/api/command' || req.method !== 'POST') return json(res, 404, { error: 'Unknown remote action.' });
      const data = await body(req);
      if (generation !== session || !authorized(req)) return json(res, 401, { error: 'Remote access was revoked.' });
      if (!data || Object.keys(data).some(k => !['requestId', 'revision', 'command'].includes(k)) || !/^[a-zA-Z0-9-]{16,80}$/.test(data.requestId) || !Number.isSafeInteger(data.revision) || !COMMANDS.has(data.command?.type)) return json(res, 400, { error: 'Invalid remote command.' });
      const cached = completed.get(data.requestId);
      if (cached) return json(res, cached.status, cached.body);
      if (pending) return json(res, 409, { error: 'Wait for the previous edit to finish.' });
      if (!state || state.revision !== data.revision) return json(res, 409, { error: 'The scene changed on the desktop. Refresh and try your edit again.' });
      if (now() - commandWindow >= 1000) { commandWindow = now(); commandCount = 0; }
      if (++commandCount > 20) return json(res, 429, { error: 'Please slow down and try again.' });
      const result = await new Promise(resolve => {
        const id = randomBytes(16).toString('hex');
        const timeout = setTimeout(() => {
          if (pending?.id !== id) return;
          const result = { status: 504, body: { error: 'No edit confirmation. Check the scene before trying again.' } };
          remember(data.requestId, result); pending = null; resolve(result);
        }, commandTimeout);
        pending = { id, requestId: data.requestId, resolve, timer: timeout };
        try { onCommand({ id, revision: data.revision, command: data.command }); }
        catch { reply({ id, ok: false, error: 'The desktop editor is unavailable.' }); }
      });
      json(res, result.status, result.body);
    } else {
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' });
      const file = assets.get(url.pathname);
      if (!file) return json(res, 404, { error: 'Not found.' });
      const ext = path.extname(url.pathname);
      const type = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }[ext] || 'text/html';
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': file.length });
      res.end(req.method === 'HEAD' ? undefined : file);
    }
  }
  function reply(result) {
    if (!pending || result?.id !== pending.id) return;
    const p = pending; pending = null; clearTimeout(p.timer);
    const answer = result.ok ? { status: 200, body: { ok: true, state } } : { status: 409, body: { error: text(result.error, 220) || 'Edit rejected. Refresh and try again.' } };
    remember(p.requestId, answer); p.resolve(answer);
  }
  async function start() {
    if (starting) return starting;
    if (stopping) await stopping;
    if (server?.listening) return status();
    starting = (async () => {
      assets = await remoteAssets(assetRoot);
      const ips = addresses().filter(privateAddress);
      const instance = http.createServer({ maxHeaderSize: 8192 }, (req, res) => { handle(req, res).catch(() => { if (!res.headersSent) json(res, 400, { error: 'Invalid remote request.' }); else res.destroy(); }); });
      instance.requestTimeout = 10_000; instance.headersTimeout = 10_000; instance.keepAliveTimeout = 3000;
      instance.setTimeout(15_000, socket => socket.destroy()); instance.maxConnections = 24; instance.maxRequestsPerSocket = 100;
      await new Promise((resolve, reject) => { instance.once('error', reject); instance.listen(0, '0.0.0.0', resolve); });
      server = instance; port = instance.address().port;
      hosts = new Set([...ips, '127.0.0.1'].map(ip => `${ip}:${port}`));
      urls = ips.map(ip => `http://${ip}:${port}`);
      expires = now() + 8 * 60 * 60_000; disconnect();
      timer = setInterval(() => { if (now() >= expires) void stop(); }, 30_000); timer.unref();
      instance.on('error', () => { void stop(); });
      notify(); return status();
    })();
    try { return await starting; } finally { starting = null; }
  }
  return { start, stop, status, disconnect, reply, update: input => { state = copyRemoteState(input); }, getPort: () => port };
}
module.exports = { createRemoteServer, copyRemoteState, privateAddress, lanAddresses };
