import { useState, useEffect, useRef, useMemo } from 'react';
import { POLYCHORA_LIST } from './solids';
import { projectAll, drawEdges4D, drawVerts4D } from './render';
import type { PolychoronId } from './solids';
import type { ProjectionMode, RenderOpts4D } from './render';

const CANVAS_SIZE = 480;

export default function PolychoraPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentId, setCurrentId] = useState<PolychoronId>('cell8');
  const [projMode, setProjMode] = useState<ProjectionMode>('persp');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showVerts, setShowVerts] = useState(false);
  const [useWColor, setUseWColor] = useState(true);

  const polytope = useMemo(
    () => POLYCHORA_LIST.find(p => p.id === currentId)!.builder(),
    [currentId]
  );

  const angXY = useRef(0);
  const angXZ = useRef(0);
  const angXW = useRef(0.3);
  const angYZ = useRef(0);
  const angYW = useRef(0.2);
  const angZW = useRef(0);
  const zoomRef   = useRef(280);
  const dragging  = useRef(false);
  const lastX     = useRef(0);
  const lastY     = useRef(0);
  const pinchDist = useRef<number | null>(null);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = CANVAS_SIZE, H = CANVAS_SIZE;
    let rafId: number;

    function loop() {
      if (autoRotate) {
        angXW.current += 0.007;
        angZW.current += 0.011;
      }

      ctx.clearRect(0, 0, W, H);

      const opts: RenderOpts4D = {
        angleXY: angXY.current, angleXZ: angXZ.current, angleXW: angXW.current,
        angleYZ: angYZ.current, angleYW: angYW.current, angleZW: angZW.current,
        zoom: zoomRef.current, W, H,
        projMode,
        perspDist: 2.0,
      };

      const projected = projectAll(polytope.verts, opts);
      drawEdges4D(ctx, polytope.edges, projected, useWColor);
      if (showVerts) drawVerts4D(ctx, projected, useWColor);

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [polytope, projMode, autoRotate, showVerts, useWColor]);

  // Window-level mouse events
  useEffect(() => {
    const onUp = () => { dragging.current = false; };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      angXW.current += (e.clientX - lastX.current) * 0.01;
      angYW.current += (e.clientY - lastY.current) * 0.01;
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
        angXW.current += (e.touches[0].clientX - lastX.current) * 0.012;
        angYW.current += (e.touches[0].clientY - lastY.current) * 0.012;
        lastX.current = e.touches[0].clientX;
        lastY.current = e.touches[0].clientY;
      }
      if (e.touches.length === 2 && pinchDist.current !== null) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        zoomRef.current = Math.max(80, Math.min(700, zoomRef.current * d / pinchDist.current));
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
      zoomRef.current = Math.max(80, Math.min(700, zoomRef.current - e.deltaY * 0.4));
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

  const projModes: { id: ProjectionMode; label: string }[] = [
    { id: 'ortho',  label: '正投影' },
    { id: 'persp',  label: '透視投影' },
    { id: 'stereo', label: '立体投影' },
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest">幾何学</span>
        <h2 className="text-2xl font-bold text-white mt-1 mb-1">正多胞体ビューア</h2>
        <p className="text-gray-500 text-sm">ドラッグで4D回転 ／ ピンチまたはホイールでズーム</p>
      </div>

      {/* Polychoron selector */}
      <div className="mb-4">
        <select
          value={currentId}
          onChange={e => setCurrentId(e.target.value as PolychoronId)}
          className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2
                     focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {POLYCHORA_LIST.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Projection mode */}
      <div className="flex mb-5 border border-gray-700 rounded-lg overflow-hidden w-fit">
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
      <div className="flex flex-wrap items-center gap-3 mt-4">
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
      </div>

      {/* Info */}
      <p className="mt-3 text-xs text-gray-600 leading-relaxed">
        頂点数 {polytope.vertCount}　辺数 {polytope.edgeCount}
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
  );
}
