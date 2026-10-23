import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Minus, Plus, Focus, Maximize2, Hand } from 'lucide-react';
import { bounds, clamp, moveVertex, translate } from '../geometry';
import { surfacePath, surfaceOutline, transformCurves, validSurfaceGeometry } from '../curves';
import { changeSurface } from '../cutouts';
import type { Point, Surface } from '../types';
import type { RemoteCommand, RemoteSnapshot, RemoteSurface } from '../remoteModel';

type Camera = { x: number; y: number; width: number; height: number };
export function RemoteMap({ state, selected, disabled, send, corner, setCorner }: {
  state: RemoteSnapshot; selected?: RemoteSurface; disabled: boolean;
  send: (c: RemoteCommand, revision?: number) => Promise<boolean>;
  corner: number | undefined; setCorner: (n: number | undefined) => void;
}) {
  const { width, height, surfaces } = state.project;
  const svg = useRef<SVGSVGElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, width, height });
  const [pan, setPan] = useState(false), [draft, setDraft] = useState<Surface | null>(null);
  const [message, setMessage] = useState('');
  const drag = useRef<{ pointerId: number; revision: number; start: Point; camera: Camera; surface?: RemoteSurface; corner?: number; control?: 'control1' | 'control2'; draft?: Surface } | null>(null);
  const [pixels, setPixels] = useState(1);
  useEffect(() => { setCamera({ x: 0, y: 0, width, height }); }, [width, height]);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (!element.isConnected) return;
      const rect = element.getBoundingClientRect();
      setPixels(Math.max(camera.width / Math.max(1, rect.width), camera.height / Math.max(1, rect.height)));
    });
    observer.observe(element); return () => observer.disconnect();
  }, [camera.width, camera.height]);
  const point = (event: PointerEvent) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x / width, y: p.y / height };
  };
  function cancel() {
    const pointerId = drag.current?.pointerId;
    drag.current = null;
    if (pointerId !== undefined && svg.current?.hasPointerCapture(pointerId)) svg.current.releasePointerCapture(pointerId);
    setDraft(null); setMessage('');
  }
  useEffect(() => { window.addEventListener('blur', cancel); return () => window.removeEventListener('blur', cancel); }, []);
  useEffect(() => { if (disabled) cancel(); }, [disabled]);
  function start(event: PointerEvent, surface?: RemoteSurface, index?: number, control?: 'control1' | 'control2') {
    event.preventDefault(); event.stopPropagation();
    if (disabled || drag.current || event.button !== 0) return;
    setMessage('');
    if (!pan && surface && surface.id !== selected?.id) { setCorner(undefined); void send({ type: 'select', id: surface.id }); return; }
    if (!pan && (!surface || surface.locked || surface.layerLocked)) return;
    drag.current = { pointerId: event.pointerId, revision: state.revision, start: point(event), camera, surface: pan ? undefined : surface, corner: index, control };
    if (!pan) setCorner(index);
    svg.current!.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent) {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (!d.surface) {
      const rect = svg.current!.getBoundingClientRect(), scale = Math.min(rect.width / d.camera.width, rect.height / d.camera.height);
      // Client deltas avoid feeding the changed camera back into its own pan.
      const origin = svg.current!.getScreenCTM()!;
      const current = new DOMPoint(d.start.x * width, d.start.y * height).matrixTransform(origin);
      setCamera(c => ({ ...c, x: c.x - (event.clientX - current.x) / scale, y: c.y - (event.clientY - current.y) / scale }));
      return;
    }
    const p = point(event), source = d.surface;
    let next: Surface;
    if (d.control && d.corner !== undefined && source.curves?.[d.corner]) {
      const curves = source.curves.map((edge, i) => i === d.corner && edge ? { ...edge, [d.control!]: { x: clamp(p.x), y: clamp(p.y) } } : edge);
      next = { ...source, curves };
    } else {
      const points = d.corner === undefined ? translate(source.points, p.x - d.start.x, p.y - d.start.y) : moveVertex(source.kind, source.points, d.corner, p);
      if (!points) { setMessage('Keep the corner inside the outline without crossing edges.'); return; }
      next = { ...source, points, curves: transformCurves(source.points, points, source.curves) };
    }
    if (!validSurfaceGeometry(next)) { setMessage('Keep corners and curves inside the canvas.'); return; }
    d.draft = next; setDraft(next); setMessage('Lift your finger to apply.');
  }
  function end(event: PointerEvent, canceled = false) {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    drag.current = null;
    if (svg.current?.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId);
    setDraft(null); setMessage('');
    if (!canceled && d.draft) void send({ type: 'geometry', id: d.draft.id, points: d.draft.points, curves: d.draft.curves }, d.revision);
  }
  function zoom(factor: number) {
    setCamera(c => {
      const w = Math.min(width, Math.max(width / 16, c.width * factor)), h = w * height / width;
      return { x: c.x + (c.width - w) / 2, y: c.y + (c.height - h) / 2, width: w, height: h };
    });
  }
  const shown = draft ? changeSurface(surfaces, draft.id, { points: draft.points, curves: draft.curves }) : surfaces;
  const active = draft || selected;
  const edge = corner !== undefined ? active?.curves?.[corner] : null;
  return <section className="phone-map-section" aria-label="Touch mapping canvas">
    <div className="phone-map-tools">
      <button aria-label="Pan map" aria-pressed={pan} onClick={() => setPan(v => !v)}><Hand size={18} />Pan</button>
      <button aria-label="Zoom out map" onClick={() => zoom(1.5)}><Minus size={19} /></button>
      <button aria-label="Zoom in map" onClick={() => zoom(1 / 1.5)}><Plus size={19} /></button>
      <button aria-label="Fit map" onClick={() => setCamera({ x: 0, y: 0, width, height })}><Maximize2 size={18} /></button>
      <button aria-label="Focus selected shape" disabled={!selected} onClick={() => {
        if (!selected) return;
        const b = bounds(surfaceOutline(selected)), w = Math.min(width, Math.max(width / 16, b.width * width * 1.4, b.height * width * 1.4));
        setCamera({ x: (b.x + b.width / 2) * width - w / 2, y: (b.y + b.height / 2) * height - w * height / width / 2, width: w, height: w * height / width });
      }}><Focus size={18} /></button>
    </div>
    <svg ref={svg} className="phone-map" role="img" aria-label="Live shape layout" viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`} onPointerDown={e => start(e)} onPointerMove={move} onPointerUp={e => end(e)} onPointerCancel={e => end(e, true)} onLostPointerCapture={e => end(e, true)}>
      <defs><pattern id="map-grid" width={width / 16} height={height / 9} patternUnits="userSpaceOnUse"><path d={`M ${width / 16} 0 L 0 0 0 ${height / 9}`} fill="none" stroke="#ffffff12" vectorEffect="non-scaling-stroke" /></pattern></defs>
      <rect width={width} height={height} fill="#11141d" stroke="#665975" vectorEffect="non-scaling-stroke" />
      <rect width={width} height={height} fill="url(#map-grid)" pointerEvents="none" />
      {shown.map(s => {
        const meta = surfaces.find(m => m.id === s.id)!;
        return <path key={s.id} data-remote-surface={s.id} d={surfacePath(s, width, height)} fill={s.cutoutOf ? '#11141d' : s.color} fillOpacity={s.cutoutOf ? .9 : .18} stroke={s.id === selected?.id ? '#c3a4ff' : '#7a8499'} opacity={s.visible && meta.layerVisible ? 1 : .3} strokeWidth={s.id === selected?.id ? 2 : 1} strokeDasharray={s.cutoutOf ? '5 4' : undefined} vectorEffect="non-scaling-stroke" onPointerDown={e => start(e, meta)} />;
      })}
      {active && !pan && active.kind !== 'ellipse' && !selected?.locked && !selected?.layerLocked && active.points.map((p, i) => <g key={i}>
        <circle role="button" aria-label={`Map corner ${i + 1}`} cx={p.x * width} cy={p.y * height} r={13 * pixels} fill={corner === i ? '#b99aef' : '#252435'} stroke="#e7dfff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" onPointerDown={e => start(e, selected, i)} />
        <text x={p.x * width} y={p.y * height + 4 * pixels} textAnchor="middle" fontSize={11 * pixels} fill={corner === i ? '#17121f' : '#eee9fa'} pointerEvents="none">{i + 1}</text>
      </g>)}
      {edge && active && !pan && corner !== undefined && (['control1', 'control2'] as const).map((control, i) => {
        const anchor = active.points[(corner + i) % active.points.length], p = edge[control];
        return <g key={control}><line x1={anchor.x * width} y1={anchor.y * height} x2={p.x * width} y2={p.y * height} stroke="#75d9df" vectorEffect="non-scaling-stroke" /><circle role="button" aria-label={`Map curve handle ${i + 1}`} cx={p.x * width} cy={p.y * height} r={11 * pixels} fill="#19333b" stroke="#80e1e9" vectorEffect="non-scaling-stroke" onPointerDown={e => start(e, selected, corner, control)} /></g>;
      })}
    </svg>
    <p className="phone-hint" role="status">{message || (pan ? 'Drag the map to pan. Tap Pan again to edit.' : 'Tap a shape, then drag it or its numbered corners. Watch the projector for animation.')}</p>
  </section>;
}
