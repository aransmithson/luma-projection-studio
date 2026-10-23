import { useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Smartphone, Wifi, ShieldCheck } from 'lucide-react';
import type { RemoteStatus } from '../remoteModel';

export function RemotePanel({ status }: { status: RemoteStatus }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [chosen, setChosen] = useState('');
  const url = status.urls.includes(chosen) ? chosen : status.urls[0] || '';
  const qr = useMemo(() => {
    if (!url) return '';
    const code = qrcode(0, 'M'); code.addData(url); code.make();
    return code.createDataURL(6, 24);
  }, [url]);
  async function action(kind: 'start' | 'stop' | 'disconnect') {
    setBusy(true); setError('');
    try {
      if (kind === 'start') await window.luma!.startRemote();
      else if (kind === 'stop') await window.luma!.stopRemote();
      else await window.luma!.disconnectRemote();
    } catch (error) { setError(error instanceof Error ? error.message : 'Remote could not start.'); }
    finally { setBusy(false); }
  }
  return <div className="remote-panel">
    <div className="remote-intro"><Smartphone size={32} /><div><h3>Map from where you stand.</h3><p>Adjust shapes, corners and effects from your phone while watching the projection.</p></div></div>
    {!status.running ? <>
      <ol><li>Connect your phone and PC to the same trusted Wi-Fi.</li><li>Start the remote, scan the QR code and enter the pairing code.</li><li>Keep Nox open on this PC. Edits appear in your current scene and its Undo history.</li></ol>
      <button className="primary-button" disabled={busy || !window.luma} onClick={() => void action('start')}><Wifi size={16} />{busy ? 'Starting…' : 'Start phone remote'}</button>
    </> : <>
      {status.connected ? <div className="remote-paired"><ShieldCheck size={28} /><strong>{status.device} is paired</strong><p>Your phone can now edit this scene. You can close this dialog and keep working.</p><button className="secondary-button" disabled={busy} onClick={() => void action('disconnect')}>Disconnect phone & change code</button></div> : <div className="remote-pair-grid">
        {qr && <img className="remote-qr" src={qr} alt="QR code for the Nox remote address" />}
        <div><p>Scan with your phone camera, then enter:</p><output className="remote-code" aria-label="Pairing code">{status.code}</output><p className="remote-muted">Code lasts 10 minutes. One phone can edit at a time.</p></div>
      </div>}
      {url ? <label className="remote-address">Phone address{status.urls.length > 1 && <select aria-label="Remote network address" value={url} onChange={e => setChosen(e.target.value)}>{status.urls.map(address => <option key={address}>{address}</option>)}</select>}<input aria-label="Phone remote address" value={url} readOnly onFocus={e => e.currentTarget.select()} /></label> : <p role="status">No local network address found. Connect the PC to Wi-Fi, then stop and start the remote.</p>}
      <button className="secondary-button" disabled={busy} onClick={() => void action('stop')}>Stop phone remote</button>
    </>}
    {error && <p role="alert" className="remote-error">{error}</p>}
    <p className="remote-muted">Local Wi-Fi only, using HTTP. Use a network you trust. If Windows asks, allow Nox on private networks. Guest Wi-Fi may block devices from connecting.</p>
    <p className="remote-muted">The remote stops when Nox closes or reloads, or after 8 hours. Photos, AI generation, imports and project files stay on the desktop.</p>
  </div>;
}
