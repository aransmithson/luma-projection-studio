import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, EyeOff, Grid2X2, Layers, Pause, Play, Redo2, RotateCcw, SlidersHorizontal, Sparkles, Trash2, Undo2, Wifi } from 'lucide-react';
import brand from '../assets/brand-mark.svg';
import { effects, effectById } from '../catalog';
import { blendModes } from '../compositing';
import { defaultContentTransform } from '../contentTransform';
import { bounds, resize } from '../geometry';
import { transformCurves } from '../curves';
import type { RemoteCommand, RemoteSurface } from '../remoteModel';
import { RemoteMap } from './RemoteMap';
import { useConnection } from './useConnection';
import './remote.css';

function Slider({ label, value, min = 0, max = 1, step = .01, format, disabled, change }: { label: string; value: number; min?: number; max?: number; step?: number; format?: (n: number) => string; disabled?: boolean; change: (n: number) => void }) {
  const [draft, setDraft] = useState(value), dirty = useRef(false);
  useEffect(() => { if (!dirty.current) setDraft(value); }, [value]);
  function commit() { if (!dirty.current) return; dirty.current = false; setDraft(value); if (draft !== value) change(draft); }
  return <label className="phone-slider"><span>{label}<output>{format ? format(draft) : `${Math.round(draft * 100)}%`}</output></span><input aria-label={label} disabled={disabled} type="range" min={min} max={max} step={step} value={draft} onChange={e => { dirty.current = true; setDraft(Number(e.target.value)); }} onPointerUp={commit} onPointerCancel={() => { dirty.current = false; setDraft(value); }} onKeyUp={commit} onBlur={commit} /></label>;
}
function NumberField({ label, value, min, max, step = 1, change }: { label: string; value: number; min: number; max: number; step?: number; change: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value)), dirty = useRef(false);
  useEffect(() => { if (!dirty.current) setDraft(String(value)); }, [value]);
  const commit = () => { if (!dirty.current) return; dirty.current = false; const n = Number(draft); setDraft(String(value)); if (draft.trim() && Number.isFinite(n) && n >= min && n <= max && n !== value) change(n); };
  return <label className="phone-field">{label}<input aria-label={label} inputMode="decimal" type="number" min={min} max={max} step={step} value={draft} onChange={e => { dirty.current = true; setDraft(e.target.value); }} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>;
}
function Colour({ value, change }: { value: string; change: (value: string) => void }) {
  const [colour, setColour] = useState(value);
  useEffect(() => setColour(value), [value]);
  return <div className="phone-fields"><label className="phone-field">Colour<input aria-label="Effect colour" type="color" value={colour} onChange={e => setColour(e.target.value)} /></label><button disabled={colour === value} onClick={() => { change(colour); setColour(value); }}>Apply colour</button></div>;
}
function RemoteApp() {
  const connection = useConnection(), { state, paired, busy, online, error, send } = connection;
  const [code, setCode] = useState(''), [name, setName] = useState('My phone');
  const [tab, setTab] = useState<'map' | 'effects' | 'scene'>('map');
  const [corner, setCorner] = useState<number>(), [step, setStep] = useState(1);
  const [search, setSearch] = useState(''), [category, setCategory] = useState('All'), [limit, setLimit] = useState(24);
  const [newKind, setNewKind] = useState<'quad' | 'triangle' | 'ellipse' | 'arch' | 'hexagon' | 'star'>('quad'), [layer, setLayer] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const selected = state?.project.surfaces.find(s => s.id === state.selectedId);
  useEffect(() => { setCorner(undefined); setDeleteId(null); }, [selected?.id]);
  useEffect(() => { setLimit(24); }, [search, category]);
  const categories = [...new Set(effects.map(e => e.category))];
  const filtered = effects.filter(e => e.id !== 'stacked-liquid' && (category === 'All' || e.category === category) && `${e.name} ${e.category} ${e.description} ${e.searchTerms?.join(' ') || ''}`.toLowerCase().includes(search.toLowerCase()));
  const disabled = busy || !online || !!state?.busy;
  const locked = !selected || selected.locked || selected.layerLocked;
  function edit(patch: Extract<RemoteCommand, { type: 'surface' }>['patch']) { if (selected) void send({ type: 'surface', id: selected.id, patch }); }
  const controls = selected?.contentTransform || defaultContentTransform;
  const heading = <header className="phone-header"><div className="phone-brand"><img src={brand} alt="" /><strong>nox<span>.</span></strong><small>REMOTE</small></div><span className={`phone-connection ${online ? 'online' : ''}`}><i />{online ? 'Connected' : paired ? 'Reconnecting' : 'Local Wi-Fi'}</span></header>;
  if (!state || paired === false) return <main className="phone-app phone-login">{heading}<section className="phone-welcome"><Wifi size={30} /><h1>A better view<br />of your scene.</h1><p>Open <strong>Phone remote</strong> in Nox on your PC. Connect to the same Wi-Fi and enter its six-digit code.</p></section><form className="phone-card" onSubmit={e => { e.preventDefault(); void connection.pair(code, name); }}><label className="phone-field">Pairing code<input aria-label="Pairing code" className="phone-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required /></label><label className="phone-field">Phone name<input aria-label="Phone name" maxLength={40} value={name} onChange={e => setName(e.target.value)} /></label><button className="phone-primary" disabled={busy || code.length !== 6}>{busy ? 'Pairing…' : 'Pair with Nox'}</button>{error && <p role="alert" className="phone-error">{error}</p>}</form><p className="phone-hint">Keep Nox open. Your phone controls the current desktop scene; no app or account is needed.</p></main>;
  const dimensions = selected ? bounds(selected.points) : null;
  const layerId = state.project.layers.some(l => l.id === layer && !l.locked) ? layer : state.project.layers.find(l => !l.locked)?.id || '';
  function size(axis: 'width' | 'height', value: number) {
    if (!selected || !dimensions || !state) return;
    const points = resize(selected.points, axis === 'width' ? value / state.project.width : dimensions.width, axis === 'height' ? value / state.project.height : dimensions.height);
    void send({ type: 'geometry', id: selected.id, points, curves: transformCurves(selected.points, points, selected.curves) });
  }
  return <main className="phone-app">{heading}
    <section className="phone-scene-heading"><div><small>CURRENT SCENE</small><h1>{state.project.name}</h1></div><span>{state.project.width} × {state.project.height}<br />{state.outputOpen ? 'Projector connected' : 'Output closed on PC'}</span></section>
    {!online && <div className="phone-alert" role="alert">Connection lost. Editing is paused while we reconnect. Check that Nox is still open on the same Wi-Fi.</div>}
    {state.busy && <div className="phone-alert" role="status">Finish the current desktop edit or dialog to edit shapes here.</div>}
    {error && <div className="phone-error" role="alert">{error}<button aria-label="Dismiss message" onClick={() => connection.setError('')}>×</button></div>}
    <div className="phone-transport">
      <button disabled={busy || !online} aria-label={state.playing ? 'Pause projection' : 'Play projection'} onClick={() => void send({ type: 'play', value: !state.playing })}>{state.playing ? <Pause size={19} /> : <Play size={19} />}{state.playing ? 'Pause' : 'Play'}</button>
      <button disabled={busy || !online} aria-label="Placement mesh" aria-pressed={state.mesh} onClick={() => void send({ type: 'mesh', value: !state.mesh })}><Grid2X2 size={19} />Mesh</button>
      <button disabled={busy || !online} aria-label="Blackout projection" aria-pressed={state.blackout} className={state.blackout ? 'phone-blackout' : ''} onClick={() => void send({ type: 'blackout', value: !state.blackout })}><EyeOff size={19} />Blackout</button>
    </div>
    <div className="phone-history"><button disabled={disabled || !state.canUndo} onClick={() => void send({ type: 'undo' })}><Undo2 size={16} />Undo</button><button disabled={disabled || !state.canRedo} onClick={() => void send({ type: 'redo' })}><Redo2 size={16} />Redo</button><button disabled={busy || !online} onClick={() => void send({ type: 'restart' })}><RotateCcw size={16} />Restart</button></div>
    <nav className="phone-tabs" aria-label="Remote tools">{([['map', 'Map', Grid2X2], ['effects', 'Effects', Sparkles], ['scene', 'Scene', Layers]] as const).map(([key, label, Icon]) => <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}><Icon size={17} />{label}</button>)}</nav>
    {tab !== 'scene' && <label className="phone-field phone-shape-picker">Selected shape<select aria-label="Selected shape" disabled={disabled} value={selected?.id || ''} onChange={e => void send({ type: 'select', id: e.target.value || null })}><option value="">Choose a shape</option>{state.project.surfaces.map(s => <option key={s.id} value={s.id}>{s.cutoutOf ? '↳ ' : ''}{s.name}{s.locked || s.layerLocked ? ' (locked)' : ''}</option>)}</select></label>}
    {tab === 'map' && <>
      <RemoteMap state={state} selected={selected} disabled={disabled} send={send} corner={corner} setCorner={setCorner} />
      {selected ? <fieldset className="phone-card" disabled={disabled || locked}>
        <div className="phone-section-title"><SlidersHorizontal size={17} /><h2>Fine alignment</h2>{locked && <span>Locked on PC</span>}</div>
        <div className="phone-fields"><label className="phone-field">Move<select aria-label="Nudge target" value={corner ?? 'shape'} onChange={e => setCorner(e.target.value === 'shape' ? undefined : Number(e.target.value))}><option value="shape">Whole shape</option>{selected.kind !== 'ellipse' && selected.points.map((_, i) => <option key={i} value={i}>Corner {i + 1}</option>)}</select></label><label className="phone-field">Step<select aria-label="Nudge step" value={step} onChange={e => setStep(Number(e.target.value))}>{[1, 5, 10].map(n => <option key={n} value={n}>{n} px</option>)}</select></label></div>
        <div className="phone-nudge">{([[0, -1, 'Up', ArrowUp], [-1, 0, 'Left', ArrowLeft], [1, 0, 'Right', ArrowRight], [0, 1, 'Down', ArrowDown]] as const).map(([dx, dy, label, Icon]) => <button key={label} aria-label={`Nudge ${label.toLowerCase()}`} className={`nudge-${label.toLowerCase()}`} onClick={() => void send({ type: 'nudge', id: selected.id, dx: dx * step, dy: dy * step, point: corner })}><Icon size={22} /></button>)}<span>{step}<small>px</small></span></div>
        <div className="phone-fields"><NumberField key={selected.id + 'width'} label="Width (px)" value={Math.round(dimensions!.width * state.project.width)} min={1} max={state.project.width} change={v => size('width', v)} /><NumberField key={selected.id + 'height'} label="Height (px)" value={Math.round(dimensions!.height * state.project.height)} min={1} max={state.project.height} change={v => size('height', v)} /></div>
        <label className="phone-check"><input type="checkbox" checked={selected.visible} onChange={e => edit({ visible: e.target.checked })} />Show shape</label>
        <div className="phone-actions"><button onClick={() => void send({ type: 'duplicate', id: selected.id })}><Copy size={17} />Duplicate</button><button onClick={() => setDeleteId(selected.id)}><Trash2 size={17} />Delete</button></div>
        {deleteId === selected.id && <div className="phone-alert">Delete {selected.name} and its holes?<div className="phone-actions"><button onClick={() => { setDeleteId(null); void send({ type: 'delete', id: selected.id }); }}>Confirm delete</button><button onClick={() => setDeleteId(null)}>Cancel</button></div></div>}
      </fieldset> : <p className="phone-hint">Choose a shape to position it, or add one in Scene.</p>}
    </>}
    {tab === 'effects' && <>
      {selected && <fieldset className="phone-card" disabled={disabled || locked || !!selected.cutoutOf}>
        <div className="phone-section-title"><Sparkles size={17} /><h2>{selected.mediaName || effectById[selected.effectId]?.name || 'Animation'}</h2></div>
        {selected.stackName && <p className="phone-hint">Linked: {selected.stackName}. Change its timing, scale and members in the desktop stacked editor.</p>}
        <Slider key={selected.id + 'opacity'} label="Opacity" value={selected.opacity} change={v => edit({ opacity: v })} />
        <Slider key={selected.id + 'speed'} label="Speed" value={selected.speed} max={3} step={.05} disabled={!!selected.stackName} format={n => `${n.toFixed(2)}×`} change={v => edit({ speed: v })} />
        <Slider key={selected.id + 'scale'} label="Effect scale" value={selected.scale} min={.25} max={3} step={.05} disabled={!!selected.stackName} format={n => `${n.toFixed(2)}×`} change={v => edit({ scale: v })} />
        <Slider key={selected.id + 'feather'} label="Edge softness" value={selected.feather} max={.08} step={.001} format={n => `${(n * 100).toFixed(1)}%`} change={v => edit({ feather: v })} />
        <label className="phone-check"><input type="checkbox" checked={selected.colorCycle} onChange={e => edit({ colorCycle: e.target.checked })} />Cycle colours</label>
        <Colour key={selected.id + 'colour'} value={selected.color} change={color => edit({ color })} />
        <label className="phone-field">Blend mode<select aria-label="Blend mode" value={selected.blend} onChange={e => edit({ blend: e.target.value as RemoteSurface['blend'] })}>{blendModes.map(b => <option value={b.id} key={b.id}>{b.name}</option>)}</select></label>
        <div className="phone-fields"><NumberField key={selected.id + 'rotation'} label="Content rotation (°)" min={-180} max={180} value={controls.rotation} change={rotation => edit({ contentTransform: { ...controls, rotation } })} /><NumberField key={selected.id + 'x'} label="Content X offset (%)" min={-100} max={100} value={Math.round(controls.offsetX * 100)} change={v => edit({ contentTransform: { ...controls, offsetX: v / 100 } })} /><NumberField key={selected.id + 'y'} label="Content Y offset (%)" min={-100} max={100} value={Math.round(controls.offsetY * 100)} change={v => edit({ contentTransform: { ...controls, offsetY: v / 100 } })} /></div>
      </fieldset>}
      <section className="phone-card"><h2>Choose an animation</h2><p className="phone-hint">Effects play on the projector. The phone shows your shape layout.</p><input aria-label="Search effects" type="search" placeholder="Search ghosts, space, textures…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Effect category" value={category} onChange={e => setCategory(e.target.value)}><option>All</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
        <div className="phone-effects">{filtered.slice(0, limit).map(e => <button key={e.id} disabled={disabled || locked || !!selected?.cutoutOf || !!selected?.stackName} aria-label={`Apply ${e.name}`} aria-pressed={selected?.effectId === e.id} onClick={() => selected && void send({ type: 'effect', id: selected.id, effectId: e.id })}><i style={{ background: `radial-gradient(ellipse at 25% 30%, ${e.color}, #17131f 80%)` }} /><strong>{e.name}</strong><small>{e.category}</small></button>)}</div>
        {filtered.length > limit && <button onClick={() => setLimit(n => n + 24)}>Show more ({filtered.length - limit})</button>}
        {filtered.length === 0 && <p className="phone-hint">No effects match this search.</p>}
      </section>
      {!!state.media.length && <section className="phone-card"><h2>Imported on this PC</h2>{state.media.map(m => <button key={m.id} disabled={disabled || locked || !!selected?.cutoutOf || !!selected?.stackName} onClick={() => selected && void send({ type: 'media', id: selected.id, mediaId: m.id })}>{m.name}</button>)}</section>}
    </>}
    {tab === 'scene' && <>
      <fieldset className="phone-card" disabled={disabled}><h2>Projection</h2><Slider label="Master brightness" value={state.project.brightness} change={value => void send({ type: 'brightness', value })} /><p className="phone-hint">Launch or change the output display from the desktop.</p></fieldset>
      <fieldset className="phone-card" disabled={disabled}><h2>Layers</h2>{state.project.layers.map(l => <label className="phone-check" key={l.id}><input type="checkbox" checked={l.visible} disabled={l.locked} onChange={e => void send({ type: 'layer', id: l.id, visible: e.target.checked })} />{l.name}{l.locked && <small>Locked on PC</small>}</label>)}</fieldset>
      <fieldset className="phone-card" disabled={disabled || !layerId}><h2>Add a shape</h2><div className="phone-fields"><label className="phone-field">Shape<select aria-label="New shape type" value={newKind} onChange={e => setNewKind(e.target.value as typeof newKind)}>{([['quad', 'Rectangle'], ['triangle', 'Triangle'], ['ellipse', 'Ellipse'], ['arch', 'Arch'], ['hexagon', 'Hexagon'], ['star', 'Star']] as const).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="phone-field">Layer<select aria-label="New shape layer" value={layerId} onChange={e => setLayer(e.target.value)}>{state.project.layers.filter(l => !l.locked).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label></div><button className="phone-primary" disabled={state.project.surfaces.length >= 32} onClick={async () => { if (await send({ type: 'add', kind: newKind, layerId })) setTab('map'); }}>Add shape</button></fieldset>
      <section className="phone-card"><h2>Connection</h2><p className="phone-hint">Edits are autosaved in Nox on your PC and share its Undo history. Use Save project on the desktop to save a project file. Phone edits apply when you release a control.</p><button disabled={busy} onClick={() => void connection.disconnect()}>Disconnect this phone</button></section>
    </>}
    <footer className="phone-footer">{busy ? 'Applying edit…' : 'Nox Projection Studio · Local remote'}</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><RemoteApp /></React.StrictMode>);
