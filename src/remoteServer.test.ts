import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const { createRemoteServer, copyRemoteState, privateAddress, lanAddresses } = createRequire(import.meta.url)('../electron/remote.cjs');
let root: string;
const servers: ReturnType<typeof createRemoteServer>[] = [];
beforeAll(async () => {
  await mkdir('test-results', { recursive: true }); root = await mkdtemp(path.resolve('test-results/remote-server-'));
  await mkdir(path.join(root, '.vite')); await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'remote.html'), '<!doctype html><title>Nox Remote</title>');
  await writeFile(path.join(root, 'assets/phone.js'), '/* remote entry */');
  await writeFile(path.join(root, 'private.luma'), 'must never be served');
  await writeFile(path.join(root, '.vite/manifest.json'), JSON.stringify({ 'remote.html': { file: 'assets/phone.js' } }));
});
afterEach(async () => { await Promise.all(servers.splice(0).map(s => s.stop())); });
const state = { revision: 1, project: { name: 'Test', width: 1920, height: 1080, brightness: 1, layers: [], surfaces: [] }, selectedId: null, playing: false, blackout: false, mesh: false, outputOpen: false, canUndo: false, canRedo: false, busy: false, media: [] };
async function setup(options: Record<string, unknown> = {}) {
  const received: unknown[] = [];
  const server = createRemoteServer({ assetRoot: root, addresses: () => ['127.0.0.1'], onCommand: (c: unknown) => received.push(c), ...options });
  servers.push(server); server.update(state); const status = await server.start(), url = status.urls[0];
  const headers = { 'X-Nox-Remote': '1', 'Content-Type': 'application/json', Origin: url };
  const pair = async (code = status.code) => fetch(url + '/api/pair', { method: 'POST', headers, body: JSON.stringify({ code, name: 'Test phone' }) });
  const post = (route: string, data: unknown, cookie = '') => fetch(url + '/api/' + route, { method: 'POST', headers: { ...headers, Cookie: cookie }, body: JSON.stringify(data) });
  return { server, status, url, headers, pair, post, received };
}
describe('local phone server boundary', () => {
  it('prefers Wi-Fi and Ethernet over virtual adapters without hiding alternatives', () => {
    const entry = (address: string, internal = false) => [{ address, family: 'IPv4', internal }];
    expect(lanAddresses({ 'vEthernet (WSL)': entry('172.26.192.1'), Ethernet: entry('10.0.0.2'), 'Wi-Fi': entry('192.168.1.4'), Loopback: entry('127.0.0.1', true), Public: entry('8.8.8.8') })).toEqual(['192.168.1.4', '10.0.0.2', '172.26.192.1']);
  });
  it('starts only on request and exposes just the phone entry and its manifest assets', async () => {
    const s = createRemoteServer({ assetRoot: root, onCommand: () => {} }); servers.push(s);
    expect(s.status().running).toBe(false);
    const { url } = await setup();
    expect((await fetch(url)).status).toBe(200);
    expect((await fetch(url + '/assets/phone.js')).status).toBe(200);
    for (const route of ['/index.html', '/private.luma', '/.vite/manifest.json', '/electron/main.cjs', '/assets/../private.luma']) expect((await fetch(url + route)).status).toBe(404);
    const response = await fetch(url);
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('requires pairing for state, rejects wrong codes, limits one controller and revokes cookies', async () => {
    const t = await setup();
    expect((await fetch(t.url + '/api/state', { headers: t.headers })).status).toBe(401);
    expect((await t.pair('000000')).status).toBe(401);
    const result = await t.pair(), cookie = result.headers.get('set-cookie')!;
    expect(cookie).toContain('HttpOnly; SameSite=Strict');
    expect(t.server.status().connected).toBe(true); expect(t.server.status().code).toBe('');
    expect((await t.pair()).status).toBe(409);
    const headers = { ...t.headers, Cookie: cookie.split(';')[0] };
    expect((await fetch(t.url + '/api/state', { headers })).status).toBe(200);
    expect((await fetch(t.url + '/api/state?after=1', { headers })).status).toBe(204);
    t.server.disconnect();
    expect((await fetch(t.url + '/api/state', { headers })).status).toBe(401);
    expect(t.server.status().code).toMatch(/^\d{6}$/);
  });
  it('rejects cross-origin commands, form posts, DNS rebinding hosts and public peers', async () => {
    const t = await setup();
    for (const origin of ['https://evil.test', 'null']) expect((await fetch(t.url + '/api/pair', { method: 'POST', headers: { ...t.headers, Origin: origin }, body: '{}' })).status).toBe(403);
    expect((await fetch(t.url + '/api/pair', { method: 'POST', headers: { Origin: t.url }, body: 'code=000000' })).status).toBe(403);
    const code = await new Promise(resolve => { http.get(t.url, { headers: { Host: 'evil.test' } }, res => { res.resume(); resolve(res.statusCode); }); });
    expect(code).toBe(403);
    for (const ip of ['8.8.8.8', '0.0.0.0', '172.32.0.1', '192.168.1.999', '::1', 'localhost']) expect(privateAddress(ip)).toBe(false);
    for (const ip of ['10.1.2.3', '192.168.1.9', '172.16.0.1', '::ffff:127.0.0.1']) expect(privateAddress(ip)).toBe(true);
  });
  it('rechecks pairing and authorization after a delayed request body', async () => {
    const t = await setup();
    async function delayed(route: string, cookie = '') {
      let req: http.ClientRequest;
      let ready!: () => void;
      const accepted = new Promise<void>(resolve => { ready = resolve; });
      const response = new Promise<number | undefined>((resolve, reject) => {
        req = http.request(t.url + '/api/' + route, { method: 'POST', headers: { ...t.headers, Cookie: cookie, Expect: '100-continue' } }, res => {
          res.resume(); res.on('end', () => resolve(res.statusCode));
        });
        req.on('error', reject); req.on('continue', ready); req.flushHeaders();
      });
      await accepted;
      return (data: unknown) => { req.end(JSON.stringify(data)); return response; };
    }
    const finishPair = await delayed('pair');
    const cookie = (await t.pair()).headers.get('set-cookie')!.split(';')[0];
    expect(await finishPair({ code: t.status.code })).toBe(409);
    const finishCommand = await delayed('command', cookie);
    t.server.disconnect();
    expect(await finishCommand({ requestId: 'f'.repeat(32), revision: 1, command: { type: 'restart' } })).toBe(401);
    expect(t.received).toHaveLength(0);
  });
  it('bounds brute-force pairing and expires codes and sessions', async () => {
    let clock = Date.now();
    const t = await setup({ now: () => clock });
    for (let i = 0; i < 10; i++) expect((await t.pair('000000')).status).toBe(401);
    expect((await t.pair()).status).toBe(429);
    clock += 60_001; expect((await t.pair()).status).toBe(200);
    t.server.disconnect(); clock += 10 * 60_000 + 1;
    expect((await t.pair(t.server.status().code)).status).toBe(401);
    clock += 8 * 60 * 60_000;
    expect((await fetch(t.url)).status).toBe(503);
    expect(t.server.status().running).toBe(false);
  });
  it('validates, serializes and deduplicates edits and rejects stale revisions', async () => {
    const t = await setup(), cookie = (await t.pair()).headers.get('set-cookie')!.split(';')[0];
    const data = { requestId: 'a'.repeat(32), revision: 1, command: { type: 'play', value: true } };
    const response = t.post('command', data, cookie);
    await expect.poll(() => t.received.length).toBe(1);
    expect((await t.post('command', { ...data, requestId: 'b'.repeat(32) }, cookie)).status).toBe(409);
    t.server.update({ ...state, revision: 2, playing: true });
    t.server.reply({ id: (t.received[0] as { id: string }).id, ok: true });
    expect((await (await response).json()).state.playing).toBe(true);
    expect((await t.post('command', data, cookie)).status).toBe(200);
    expect(t.received).toHaveLength(1);
    expect((await t.post('command', { ...data, requestId: 'c'.repeat(32) }, cookie)).status).toBe(409);
    expect((await t.post('command', { ...data, revision: 2, command: { type: 'runway' } }, cookie)).status).toBe(400);
    expect((await t.post('command', { ...data, padding: 'x'.repeat(33_000) }, cookie)).status).toBe(400);
  });
  it('never retries a timed-out edit and stopping cancels an outstanding edit', async () => {
    const t = await setup({ commandTimeout: 80 }), cookie = (await t.pair()).headers.get('set-cookie')!.split(';')[0];
    const command = { requestId: 'd'.repeat(32), revision: 1, command: { type: 'restart' } };
    expect((await t.post('command', command, cookie)).status).toBe(504);
    expect((await t.post('command', command, cookie)).status).toBe(504);
    expect(t.received).toHaveLength(1);
    const result = t.post('command', { ...command, requestId: 'e'.repeat(32) }, cookie).catch(() => null);
    await expect.poll(() => t.received.length, { interval: 5 }).toBe(2);
    await t.server.stop(); await result;
    expect(t.server.status().running).toBe(false);
  });
  it('strips unexpected fields at the main-process boundary too', () => {
    const result = copyRemoteState({ ...state, credential: 'secret', audio: { wave: [1] }, project: { ...state.project, scene: { prompt: 'private', photo: { path: 'private' } } }, media: [{ id: 'a'.repeat(64), name: 'Clip', path: 'C:/private.mp4', thumbnail: 'secret' }] });
    expect(JSON.stringify(result)).not.toContain('private'); expect(JSON.stringify(result)).not.toContain('secret');
    expect(result.media[0]).toEqual({ id: 'a'.repeat(64), name: 'Clip' });
  });
});
