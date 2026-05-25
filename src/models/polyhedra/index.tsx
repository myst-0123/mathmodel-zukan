import { useState, useEffect, useRef, useMemo } from 'react';
import { buildDodeca, buildIcosa } from './solids';
import { project, drawLine, drawFaces, drawRect } from './render';
import type { SolidData } from './solids';
import type { ProjectionOpts } from './render';

type SolidId = 'dodeca' | 'icosa';

interface ShowFlags {
  edges: boolean;
  faces: boolean;
  extra: boolean;
  rects: boolean;
  verts: boolean;
}

const CANVAS_SIZE = 480;

export default function PolyhedraPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentSolid, setCurrentSolid] = useState<SolidId>('dodeca');
  const [usePersp, setUsePersp] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [show, setShow] = useState<ShowFlags>({
    edges: true, faces: true, extra: false, rects: false, verts: false,
  });

  const solidData = useMemo<SolidData>(
    () => (currentSolid === 'dodeca' ? buildDodeca() : buildIcosa()),
    [currentSolid]
  );

  // Rotation / zoom in refs — updated by event handlers, read every frame
  const rotXRef   = useRef(0.35);
  const rotYRef   = useRef(0.5);
  const zoomRef   = useRef(350);
  const dragging  = useRef(false);
  const lastX     = useRef(0);
  const lastY     = useRef(0);
  const pinchDist = useRef<number | null>(null);

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = CANVAS_SIZE, H = CANVAS_SIZE;
    let rafId: number;

    function loop() {
      if (autoRotate) rotYRef.current += 0.008;

      ctx.clearRect(0, 0, W, H);

      const opts: ProjectionOpts = {
        rotX: rotXRef.current, rotY: rotYRef.current,
        zoom: zoomRef.current, usePersp, W, H,
      };

      const { verts, edges, faces, faceColors, extra, rectGroups, vertColorFn } = solidData;

      if (show.faces) drawFaces(ctx, faces, verts, faceColors, opts);
      if (show.rects) for (const rg of rectGroups) drawRect(ctx, rg, verts, opts);
      if (show.extra && extra)
        for (const [a, b] of extra.edges)
          drawLine(ctx, verts[a], verts[b], opts, extra.color, 2, [5, 3], true);
      if (show.edges)
        for (const [a, b] of edges)
          drawLine(ctx, verts[a], verts[b], opts, '#5599ff', 1.8, [], true);
      if (show.verts) {
        for (let i = 0; i < verts.length; i++) {
          const [px, py] = project(verts[i], opts);
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = vertColorFn(i);
          ctx.globalAlpha = 0.9;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [solidData, show, autoRotate, usePersp]);

  // ── Window-level mouse events ─────────────────────────────────────────────
  useEffect(() => {
    const onUp   = () => { dragging.current = false; };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      rotYRef.current += (e.clientX - lastX.current) * 0.01;
      rotXRef.current += (e.clientY - lastY.current) * 0.01;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
    };
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  // ── Touch events (passive:false required for preventDefault) ─────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        dragging.current = true;
        lastX.current = e.touches[0].clientX;
        lastY.current = e.touches[0].clientY;
        setAutoRotate(false);
      }
      if (e.touches.length === 2) {
        pinchDist.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragging.current) {
        rotYRef.current += (e.touches[0].clientX - lastX.current) * 0.012;
        rotXRef.current += (e.touches[0].clientY - lastY.current) * 0.012;
        lastX.current = e.touches[0].clientX;
        lastY.current = e.touches[0].clientY;
      }
      if (e.touches.length === 2 && pinchDist.current !== null) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        zoomRef.current = Math.max(100, Math.min(600, zoomRef.current * d / pinchDist.current));
        pinchDist.current = d;
      }
    };

    const onEnd = () => { dragging.current = false; pinchDist.current = null; };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove',  onMove,  { passive: false });
    canvas.addEventListener('touchend',   onEnd);
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove',  onMove);
      canvas.removeEventListener('touchend',   onEnd);
    };
  }, []);

  // ── Wheel event (passive:false) ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(100, Math.min(600, zoomRef.current - e.deltaY * 0.3));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    setAutoRotate(false);
  };

  const toggleShow = (key: keyof ShowFlags) =>
    setShow(s => ({ ...s, [key]: !s[key] }));

  const handleSolidChange = (name: SolidId) => {
    setCurrentSolid(name);
    setShow(s => ({ ...s, extra: false, rects: false, verts: false }));
  };

  // ── Legend ────────────────────────────────────────────────────────────────
  const legendItems: { color: string; label: string }[] = [
    { color: '#5599ff', label: '辺' },
    ...(solidData.extra ? [{ color: solidData.extra.color, label: solidData.extra.label }] : []),
    ...solidData.rectGroups.map(rg => ({ color: rg.color, label: '長方形' })),
  ];

  // Control buttons (extra button shown only when solidData.extra exists)
  const ctrlButtons: { key: keyof ShowFlags; label: string }[] = [
    { key: 'edges', label: '辺' },
    { key: 'faces', label: '面（半透明）' },
    ...(solidData.extra ? [{ key: 'extra' as keyof ShowFlags, label: solidData.extra.label }] : []),
    { key: 'rects', label: '3つの長方形' },
    { key: 'verts', label: '頂点' },
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest">幾何学</span>
        <h2 className="text-2xl font-bold text-white mt-1 mb-1">正多面体ビューア</h2>
        <p className="text-gray-500 text-sm">ドラッグで回転 ／ ピンチまたはホイールでズーム</p>
      </div>

      {/* Perspective toggle */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-sm transition-colors ${!usePersp ? 'text-indigo-300' : 'text-gray-500'}`}>
          平行投影
        </span>
        <button
          role="switch"
          aria-checked={usePersp}
          onClick={() => setUsePersp(v => !v)}
          className={`relative w-11 h-6 rounded-full border transition-colors focus:outline-none ${
            usePersp ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-800 border-gray-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
              usePersp ? 'translate-x-5 bg-white' : 'bg-gray-400'
            }`}
          />
        </button>
        <span className={`text-sm transition-colors ${usePersp ? 'text-indigo-300' : 'text-gray-500'}`}>
          遠近投影（パース）
        </span>
      </div>

      {/* Solid selector */}
      <div className="flex mb-5 border border-gray-700 rounded-lg overflow-hidden w-fit">
        {(['dodeca', 'icosa'] as const).map((id, i) => (
          <button
            key={id}
            onClick={() => handleSolidChange(id)}
            className={`px-5 py-2 text-sm transition-colors ${i > 0 ? 'border-l border-gray-700' : ''} ${
              currentSolid === id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {id === 'dodeca' ? '正十二面体' : '正二十面体'}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="rounded-2xl cursor-grab active:cursor-grabbing block"
        style={{ background: '#12121f', boxShadow: '0 0 40px #0d1a2d' }}
        onMouseDown={onMouseDown}
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mt-4">
        {ctrlButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleShow(key)}
            className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
              show[key]
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setAutoRotate(v => !v)}
          className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
            autoRotate
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          自動回転
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
        {legendItems.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      {/* Info */}
      <p className="mt-2 text-xs text-gray-600 leading-relaxed">{solidData.info}</p>
    </div>
  );
}
