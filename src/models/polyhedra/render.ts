import type { RectGroup } from './solids';

export interface ProjectionOpts {
  rotMat: number[];
  zoom: number;
  usePersp: boolean;
  W: number;
  H: number;
}

export function project(
  [x, y, z]: [number, number, number],
  { rotMat: m, zoom, usePersp, W, H }: ProjectionOpts
): [number, number, number] {
  const x1 = m[0]*x + m[1]*y + m[2]*z;
  const y1 = m[3]*x + m[4]*y + m[5]*z;
  const z2 = m[6]*x + m[7]*y + m[8]*z;
  if (usePersp) {
    const fov = 6, zz = z2 + fov;
    return [W / 2 + x1 * zoom / zz, H / 2 - y1 * zoom / zz, z2];
  }
  return [W / 2 + x1 * zoom / 3.5, H / 2 - y1 * zoom / 3.5, z2];
}

// Vertices are normalized to circumradius=1, so z ∈ [-1, 1].
// depthFade maps z: back(−1)→alpha 0.15, equator(0)→0.575, front(+1)→1.0
function depthAlpha(z: number): number {
  return 0.15 + 0.85 * Math.max(0, (z + 1) / 2);
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  p1: [number, number, number],
  p2: [number, number, number],
  opts: ProjectionOpts,
  color: string,
  width = 1.5,
  dash: number[] = [],
  depthFade = false
) {
  const [x1, y1, z1] = project(p1, opts);
  const [x2, y2, z2] = project(p2, opts);
  const alpha = depthFade ? depthAlpha((z1 + z2) / 2) : 1.0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function faceNormal(f: number[], verts: [number, number, number][]): [number, number, number] {
  const v0 = verts[f[0]], v1 = verts[f[1]], v2 = verts[f[2]];
  const ax = v1[0]-v0[0], ay = v1[1]-v0[1], az = v1[2]-v0[2];
  const bx = v2[0]-v0[0], by = v2[1]-v0[1], bz = v2[2]-v0[2];
  return [ay*bz-az*by, az*bx-ax*bz, ax*by-ay*bx];
}

function faceDepth(f: number[], verts: [number, number, number][], opts: ProjectionOpts): number {
  return f.reduce((s, v) => s + project(verts[v], opts)[2], 0) / f.length;
}

export function drawFaces(
  ctx: CanvasRenderingContext2D,
  faces: number[][],
  verts: [number, number, number][],
  faceColors: string[],
  opts: ProjectionOpts
) {
  const order = faces.map((_, i) => i).sort(
    (a, b) => faceDepth(faces[a], verts, opts) - faceDepth(faces[b], verts, opts)
  );
  const light: [number, number, number] = [0.3, 0.5, 1];
  for (const fi of order) {
    const f = faces[fi];
    const n = faceNormal(f, verts);
    const len = Math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2);
    const dot = (n[0]*light[0] + n[1]*light[1] + n[2]*light[2]) / (len * Math.sqrt(1.34));
    const brightness = 0.35 + 0.45 * Math.max(0, dot);
    ctx.save();
    ctx.globalAlpha = 0.22 * brightness + 0.08;
    ctx.fillStyle = faceColors[fi % faceColors.length];
    ctx.beginPath();
    const [px, py] = project(verts[f[0]], opts);
    ctx.moveTo(px, py);
    for (let i = 1; i < f.length; i++) {
      const [qx, qy] = project(verts[f[i]], opts);
      ctx.lineTo(qx, qy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawRect(
  ctx: CanvasRenderingContext2D,
  rg: RectGroup,
  verts: [number, number, number][],
  opts: ProjectionOpts
) {
  const vs = rg.verts;
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = rg.color;
  ctx.beginPath();
  const [px, py] = project(verts[vs[0]], opts);
  ctx.moveTo(px, py);
  for (let i = 1; i < vs.length; i++) {
    const [qx, qy] = project(verts[vs[i]], opts);
    ctx.lineTo(qx, qy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < vs.length; i++)
    drawLine(ctx, verts[vs[i]], verts[vs[(i + 1) % vs.length]], opts, rg.color, 2.5, [], true);
  drawLine(ctx, verts[vs[0]], verts[vs[2]], opts, rg.color, 1, [4, 4], true);
  drawLine(ctx, verts[vs[1]], verts[vs[3]], opts, rg.color, 1, [4, 4], true);
}
