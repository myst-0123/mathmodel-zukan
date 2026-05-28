import { useState, useEffect, useRef, useMemo } from 'react';
import { buildDodeca, buildIcosa } from './solids';
import { project, drawLine, drawFaces, drawRect } from './render';
import type { SolidData } from './solids';
import type { ProjectionOpts } from './render';

function mat3RotX(a: number): number[] {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0,  0, c, -s,  0, s, c];
}
function mat3RotY(a: number): number[] {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, s,  0, 1, 0,  -s, 0, c];
}
function mat3Mul(a: number[], b: number[]): number[] {
  return [
    a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
    a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8],
  ];
}

type SolidId = 'dodeca' | 'icosa';

interface ShowFlags {
  edges: boolean;
  faces: boolean;
  extra: boolean;
  rects: boolean;
  verts: boolean;
}

export default function PolyhedraPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(480);

  const [currentSolid, setCurrentSolid] = useState<SolidId>('dodeca');
  const [usePersp, setUsePersp] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [show, setShow] = useState<ShowFlags>({
    edges: true, faces: true, extra: false, rects: false, verts: false,
  });
  const [edgeWidth, setEdgeWidth] = useState(1.8);

  const solidData = useMemo<SolidData>(
    () => (currentSolid === 'dodeca' ? buildDodeca() : buildIcosa()),
    [currentSolid]
  );

  // Rotation / zoom in refs — updated by event handlers, read every frame
  const matRef  = useRef<number[]>(mat3Mul(mat3RotX(0.35), mat3RotY(0.5)));
  const zoomRef = useRef(350);
  const dragging  = useRef(false);
  const lastX     = useRef(0);
  const lastY     = useRef(0);
  const pinchDist = useRef<number | null>(null);

  // ── Dynamic canvas sizing (ResizeObserver + DPR) ──────────────────────────
  useEffect(() => {
    const container = canvasContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      const size = Math.max(280, Math.min(900, w));
      const dpr = window.devicePixelRatio || 1;
      const prevSize = sizeRef.current;

      zoomRef.current = Math.max(
        100 * size / 480,
        Math.min(600 * size / 480, zoomRef.current * size / prevSize)
      );
      sizeRef.current = size;

      const ctx = canvas.getContext('2d')!;
      canvas.width  = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width  = size + 'px';
      canvas.style.height = size + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let rafId: number;

    function loop() {
      const W = sizeRef.current, H = sizeRef.current;
      if (autoRotate) matRef.current = mat3Mul(mat3RotY(0.008), matRef.current);

      ctx.clearRect(0, 0, W, H);

      const opts: ProjectionOpts = {
        rotMat: matRef.current,
        zoom: zoomRef.current, usePersp, W, H,
      };

      const { verts, edges, faces, faceColors, extra, rectGroups, vertColorFn } = solidData;

      if (show.faces) drawFaces(ctx, faces, verts, faceColors, opts);
      if (show.rects) for (const rg of rectGroups) drawRect(ctx, rg, verts, opts);
      if (show.extra && extra)
        for (const [a, b] of extra.edges)
          drawLine(ctx, verts[a], verts[b], opts, extra.color, edgeWidth + 0.2, [5, 3], true);
      if (show.edges)
        for (const [a, b] of edges)
          drawLine(ctx, verts[a], verts[b], opts, '#5599ff', edgeWidth, [], true);
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
  }, [solidData, show, autoRotate, usePersp, edgeWidth]);

  // ── Window-level mouse events ─────────────────────────────────────────────
  useEffect(() => {
    const onUp   = () => { dragging.current = false; };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dY = (e.clientX - lastX.current) * 0.01;
      const dX = (e.clientY - lastY.current) * 0.01;
      matRef.current = mat3Mul(mat3RotX(dX), mat3Mul(mat3RotY(dY), matRef.current));
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
        const dY = (e.touches[0].clientX - lastX.current) * 0.012;
        const dX = (e.touches[0].clientY - lastY.current) * 0.012;
        matRef.current = mat3Mul(mat3RotX(dX), mat3Mul(mat3RotY(dY), matRef.current));
        lastX.current = e.touches[0].clientX;
        lastY.current = e.touches[0].clientY;
      }
      if (e.touches.length === 2 && pinchDist.current !== null) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const s = sizeRef.current;
        zoomRef.current = Math.max(100 * s / 480, Math.min(600 * s / 480, zoomRef.current * d / pinchDist.current));
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
      const s = sizeRef.current;
      zoomRef.current = Math.max(100 * s / 480, Math.min(600 * s / 480, zoomRef.current - e.deltaY * 0.3));
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

  const ctrlButtons: { key: keyof ShowFlags; label: string }[] = [
    { key: 'edges', label: '辺' },
    { key: 'faces', label: '面（半透明）' },
    ...(solidData.extra ? [{ key: 'extra' as keyof ShowFlags, label: solidData.extra.label }] : []),
    { key: 'rects', label: '3つの長方形' },
    { key: 'verts', label: '頂点' },
  ];

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest">幾何学</span>
        <h2 className="text-2xl font-bold text-white mt-1 mb-1">正多面体ビューア</h2>
        <p className="text-gray-500 text-sm">ドラッグで回転 ／ ピンチまたはホイールでズーム</p>
      </div>

      {/* 2-column on lg+ */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">

        {/* Left: projection toggle + canvas */}
        <div className="lg:flex-1 lg:min-w-0">
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

          {/* Canvas container — ResizeObserver targets this div */}
          <div ref={canvasContainerRef}>
            <canvas
              ref={canvasRef}
              className="rounded-2xl cursor-grab active:cursor-grabbing block"
              style={{ background: '#12121f', boxShadow: '0 0 40px #0d1a2d', width: '100%', aspectRatio: '1 / 1' }}
              onMouseDown={onMouseDown}
            />
          </div>
        </div>

        {/* Right: selector + controls + legend + info */}
        <div className="lg:w-80 xl:w-96 lg:shrink-0 mt-6 lg:mt-0">
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

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
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

          {/* Edge width slider */}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs text-gray-400 w-16 shrink-0">辺の太さ</span>
            <input
              type="range" min={0.5} max={5} step={0.1}
              value={edgeWidth}
              onChange={e => setEdgeWidth(+e.target.value)}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-gray-500 tabular-nums w-6 text-right">{edgeWidth.toFixed(1)}</span>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
            {legendItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-5 h-0.5 rounded" style={{ backgroundColor: item.color }} />
                {item.label}
              </div>
            ))}
          </div>

          {/* Info */}
          <p className="mt-3 text-xs text-gray-600 leading-relaxed">{solidData.info}</p>
        </div>
      </div>
    </div>
  );
}
