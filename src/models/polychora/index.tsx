import { useState, useEffect, useRef, useMemo } from 'react';
import { POLYCHORA_LIST } from './solids';
import { projectAll, rotateAll, drawEdges4D, drawFaces4D, drawVerts4D, computeSlice, drawSlice, mat4Mul, planeMat, makeRot4 } from './render';
import type { PolychoronId } from './solids';
import type { ProjectionMode, RenderOpts4D, Mat4 } from './render';

export default function PolychoraPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(480);

  const [currentId, setCurrentId] = useState<PolychoronId>('cell8');
  const [projMode, setProjMode] = useState<ProjectionMode>('persp');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showFaces, setShowFaces] = useState(false);
  const [showVerts, setShowVerts] = useState(false);
  const [useWColor, setUseWColor] = useState(true);
  const [showSlice, setShowSlice] = useState(false);
  const [sliceW, setSliceW] = useState(0);
  const [showAngles, setShowAngles] = useState(false);
  const [angles, setAngles] = useState({ xy:0, xz:0, xw:0.3, yz:0, yw:0.2, zw:0 });
  const [edgeWidth, setEdgeWidth] = useState(1.2);

  const polytope = useMemo(
    () => POLYCHORA_LIST.find(p => p.id === currentId)!.builder(),
    [currentId]
  );

  const matRef  = useRef<Mat4>(makeRot4(0, 0, 0.3, 0, 0.2, 0));
  // Slider position trackers (for delta computation on onChange)
  const angXY = useRef(0);
  const angXZ = useRef(0);
  const angXW = useRef(0.3);
  const angYZ = useRef(0);
  const angYW = useRef(0.2);
  const angZW = useRef(0);
  const zoomRef = useRef(280);
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
        80 * size / 480,
        Math.min(700 * size / 480, zoomRef.current * size / prevSize)
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

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let rafId: number;

    function loop() {
      const W = sizeRef.current, H = sizeRef.current;
      if (autoRotate) {
        matRef.current = mat4Mul(mat4Mul(planeMat(0,3,0.007), planeMat(2,3,0.011)), matRef.current);
      }

      ctx.clearRect(0, 0, W, H);

      const opts: RenderOpts4D = {
        rotMat: matRef.current,
        zoom: zoomRef.current, W, H,
        projMode,
        perspDist: 2.0,
      };

      const projected = projectAll(polytope.verts, opts);
      if (showFaces) drawFaces4D(ctx, polytope.faces, projected, useWColor);
      drawEdges4D(ctx, polytope.edges, projected, useWColor, edgeWidth);
      if (showVerts) drawVerts4D(ctx, projected, useWColor);
      if (showSlice) {
        const rotated = rotateAll(polytope.verts, opts);
        const segments = computeSlice(polytope.faces, rotated, sliceW);
        drawSlice(ctx, segments, opts);
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [polytope, projMode, autoRotate, showFaces, showVerts, useWColor, showSlice, sliceW, edgeWidth]);

  // Window-level mouse events
  useEffect(() => {
    const onUp = () => { dragging.current = false; };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dY = (e.clientX - lastX.current) * 0.01;
      const dX = (e.clientY - lastY.current) * 0.01;
      matRef.current = mat4Mul(mat4Mul(planeMat(0,3,-dY), planeMat(1,3,dX)), matRef.current);
      lastX.current = e.clientX;
      lastY.current = e.clientY;
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  // Touch events
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
        matRef.current = mat4Mul(mat4Mul(planeMat(0,3,-dY), planeMat(1,3,dX)), matRef.current);
        lastX.current = e.touches[0].clientX;
        lastY.current = e.touches[0].clientY;
      }
      if (e.touches.length === 2 && pinchDist.current !== null) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const s = sizeRef.current;
        zoomRef.current = Math.max(80 * s / 480, Math.min(700 * s / 480, zoomRef.current * d / pinchDist.current));
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

  // Wheel event
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = sizeRef.current;
      zoomRef.current = Math.max(80 * s / 480, Math.min(700 * s / 480, zoomRef.current - e.deltaY * 0.4));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    setAutoRotate(false);
  };

  // Reset slider positions to 0 each time the panel is opened so that
  // delta computation starts from the current matrix state.
  useEffect(() => {
    if (!showAngles) return;
    angXY.current = 0; angXZ.current = 0; angXW.current = 0;
    angYZ.current = 0; angYW.current = 0; angZW.current = 0;
    setAngles({ xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 });
  }, [showAngles]);

  const projModes: { id: ProjectionMode; label: string }[] = [
    { id: 'ortho',  label: '正投影' },
    { id: 'persp',  label: '透視投影' },
    { id: 'stereo', label: '立体投影' },
  ];

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest">幾何学</span>
        <h2 className="text-2xl font-bold text-white mt-1 mb-1">正多胞体ビューア</h2>
        <p className="text-gray-500 text-sm">ドラッグで4D回転 ／ ピンチまたはホイールでズーム</p>
      </div>

      {/* 2-column on lg+ */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">

        {/* Left: projection mode + canvas */}
        <div className="lg:flex-1 lg:min-w-0">
          {/* Projection mode */}
          <div className="flex mb-4 border border-gray-700 rounded-lg overflow-hidden w-fit">
            {projModes.map(({ id, label }, i) => (
              <button
                key={id}
                onClick={() => setProjMode(id)}
                className={`px-5 py-2 text-sm transition-colors ${i > 0 ? 'border-l border-gray-700' : ''} ${
                  projMode === id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
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

        {/* Right: selector + controls + sliders + info */}
        <div className="lg:w-80 xl:w-96 lg:shrink-0 mt-6 lg:mt-0">
          {/* Polychoron selector */}
          <div className="mb-4">
            <select
              value={currentId}
              onChange={e => setCurrentId(e.target.value as PolychoronId)}
              className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2
                         focus:outline-none focus:border-indigo-500 cursor-pointer w-full"
            >
              {POLYCHORA_LIST.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              onClick={() => setShowFaces(v => !v)}
              className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                showFaces
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              胞の面
            </button>
            <button
              onClick={() => setShowVerts(v => !v)}
              className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                showVerts
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              頂点
            </button>
            <button
              onClick={() => setUseWColor(v => !v)}
              className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                useWColor
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              W座標の色付け
            </button>
            <button
              onClick={() => setShowSlice(v => !v)}
              className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                showSlice
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              W断面
            </button>
            <button
              onClick={() => setShowAngles(v => !v)}
              className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                showAngles
                  ? 'bg-emerald-700 border-emerald-600 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              回転を加える
            </button>
          </div>

          {/* W slice slider */}
          {showSlice && (
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-amber-400 w-16 tabular-nums">
                W = {sliceW >= 0 ? '+' : ''}{sliceW.toFixed(2)}
              </span>
              <input
                type="range" min={-1.2} max={1.2} step={0.01}
                value={sliceW}
                onChange={e => setSliceW(+e.target.value)}
                className="flex-1 accent-amber-500"
              />
            </div>
          )}

          {/* Rotation angle sliders */}
          {showAngles && (() => {
            const planes: { key: keyof typeof angles; label: string; ref: React.MutableRefObject<number>; p: number; q: number }[] = [
              { key: 'xy', label: 'XY', ref: angXY, p: 0, q: 1 },
              { key: 'xz', label: 'XZ', ref: angXZ, p: 0, q: 2 },
              { key: 'xw', label: 'XW', ref: angXW, p: 0, q: 3 },
              { key: 'yz', label: 'YZ', ref: angYZ, p: 1, q: 2 },
              { key: 'yw', label: 'YW', ref: angYW, p: 1, q: 3 },
              { key: 'zw', label: 'ZW', ref: angZW, p: 2, q: 3 },
            ];
            return (
              <div className="mt-3 p-3 rounded-xl border border-gray-700 bg-gray-900/60">
                <p className="text-xs text-gray-500 mb-2">現在の向きからの追加回転（開くたびに 0 にリセット）</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {planes.map(({ key, label, ref, p, q }) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className="text-xs text-emerald-400 w-7 font-mono">{label}</span>
                      <input
                        type="range" min={-Math.PI} max={Math.PI} step={0.01}
                        value={angles[key]}
                        onChange={e => {
                          const val = +e.target.value;
                          const delta = val - ref.current;
                          matRef.current = mat4Mul(planeMat(p, q, delta), matRef.current);
                          ref.current = val;
                          setAngles(prev => ({ ...prev, [key]: val }));
                          setAutoRotate(false);
                        }}
                        className="flex-1 accent-emerald-500"
                      />
                      <span className="text-xs text-gray-500 tabular-nums w-10 text-right">
                        {(angles[key] / Math.PI * 180).toFixed(0)}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

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

          {/* Info */}
          <p className="mt-4 text-xs text-gray-600 leading-relaxed">
            頂点数 {polytope.vertCount}　辺数 {polytope.edgeCount}　面数 {polytope.faceCount}
          </p>

          {/* Color legend */}
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0.5 rounded" style={{ background: 'rgb(68,136,255)' }} />
              <span>W = −1（後方）</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0.5 rounded" style={{ background: 'rgb(136,68,170)' }} />
              <span>W = +1（前方）</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
