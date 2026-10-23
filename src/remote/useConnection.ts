import { useCallback, useEffect, useRef, useState } from 'react';
import type { RemoteCommand, RemoteSnapshot } from '../remoteModel';

class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function request(path: string, data?: unknown) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch('/api/' + path, {
      method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: { 'X-Nox-Remote': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    if (response.status === 204) return null;
    const body = await response.json();
    if (!response.ok) throw new ApiError(body.error || 'Could not reach Nox.', response.status);
    return body;
  } finally { clearTimeout(timer); }
}
export function useConnection() {
  const [state, setState] = useState<RemoteSnapshot | null>(null), [paired, setPaired] = useState<boolean | null>(null);
  const [online, setOnline] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const current = useRef(state), sending = useRef(false), mounted = useRef(true);
  const accept = useCallback((next: RemoteSnapshot | null) => {
    if (!mounted.current || !next || (current.current && next.revision < current.current.revision)) return;
    current.current = next; setState(next);
  }, []);
  const reset = useCallback(() => { current.current = null; setState(null); setPaired(false); setOnline(false); }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (paired === false) return;
    let canceled = false, timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await request(`state?after=${current.current?.revision ?? -1}`);
        if (canceled) return;
        accept(next); setPaired(true); setOnline(true);
      } catch (error) {
        if (canceled) return;
        setOnline(false);
        if (error instanceof ApiError && error.status === 401) reset();
      } finally { if (!canceled) timer = setTimeout(poll, document.hidden ? 2500 : 650); }
    }
    void poll();
    return () => { canceled = true; clearTimeout(timer); };
  }, [paired, accept, reset]);
  async function pair(code: string, name: string) {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try { await request('pair', { code, name }); current.current = null; setPaired(true); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not pair.'); }
    finally { sending.current = false; setBusy(false); }
  }
  async function send(command: RemoteCommand, revision = current.current?.revision) {
    if (!online || sending.current || revision === undefined) return false;
    sending.current = true; setBusy(true); setError('');
    // getRandomValues works on local HTTP; randomUUID requires a secure context on phones.
    const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    try {
      const result = await request('command', { requestId, revision, command });
      accept(result.state); return true;
    } catch (error) {
      setError(error instanceof ApiError ? error.message : 'Connection interrupted. Check the scene before trying this edit again.');
      if (error instanceof ApiError && error.status === 401) reset();
      else {
        try { accept(await request('state')); setOnline(true); }
        catch { setOnline(false); }
      }
      return false;
    } finally { sending.current = false; setBusy(false); }
  }
  async function disconnect() {
    if (sending.current) return;
    try { await request('disconnect', {}); reset(); }
    catch { setError('Could not disconnect. Stop the remote on the desktop.'); }
  }
  return { state, paired, online, busy, error, setError, pair, send, disconnect };
}
