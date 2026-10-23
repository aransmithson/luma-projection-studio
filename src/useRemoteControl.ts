import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { remoteOff, type RemoteSnapshot, type RemoteCommand, parseRemoteCommand } from './remoteModel';

export function useRemoteControl(snapshot: Omit<RemoteSnapshot, 'revision'>, execute: (command: RemoteCommand) => void) {
  const [status, setStatus] = useState(remoteOff);
  const latest = useRef({ snapshot, execute, status });
  latest.current = { snapshot, execute, status };
  const published = useRef({ json: '', revision: 0 });
  useLayoutEffect(() => {
    if (!window.luma) return;
    const json = JSON.stringify(snapshot);
    if (json === published.current.json) return;
    published.current = { json, revision: published.current.revision + 1 };
    window.luma.updateRemote({ ...snapshot, revision: published.current.revision });
  });
  useEffect(() => {
    const bridge = window.luma;
    if (!bridge) return;
    let mounted = true;
    void bridge.remoteStatus().then(s => { if (mounted) setStatus(s); }).catch(() => {});
    const offStatus = bridge.onRemoteStatus(setStatus);
    const offCommand = bridge.onRemoteCommand(request => {
      try {
        if (!latest.current.status.running || !latest.current.status.connected) throw Error('Remote session ended.');
        if (request.revision !== published.current.revision) throw Error('The scene changed on the desktop. Refresh and try again.');
        const command = parseRemoteCommand(request.command);
        flushSync(() => latest.current.execute(command));
        bridge.replyRemote({ id: request.id, ok: true });
      } catch (error) {
        bridge.replyRemote({ id: request.id, ok: false, error: error instanceof Error ? error.message : 'Edit could not be applied.' });
      }
    });
    return () => { mounted = false; offStatus(); offCommand(); };
  }, []);
  return status;
}
