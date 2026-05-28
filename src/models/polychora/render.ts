export type ProjectionMode = 'ortho' | 'persp' | 'stereo';
export type Mat4 = Float64Array;

export interface RenderOpts4D {
  rotMat: Mat4;
  zoom: number; W: number; H: number;
  projMode: ProjectionMode;
  perspDist: number;
}

export function mat4Id(): Mat4 {
  const m = new Float64Array(16);
  m[0]=m[5]=m[10]=m[15]=1;
  return m;
}

export function mat4Mul(a: Mat4, b: Mat4): Mat4 {
  const c = new Float64Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++)
        c[i*4+j] += a[i*4+k] * b[k*4+j];
  return c;
}

export function planeMat(p: number, q: number, angle: number): Mat4 {
  const m = mat4Id();
  const c = Math.cos(angle), s = Math.sin(angle);
  m[p*4+p] = c; m[p*4+q] = -s;
  m[q*4+p] = s; m[q*4+q] =  c;
  return m;
}

export function makeRot4(aXY:number,aXZ:number,aXW:number,aYZ:number,aYW:number,aZW:number): Mat4 {
  return [
    planeMat(0,1,aXY),
    planeMat(0,2,aXZ),
    planeMat(0,3,aXW),
    planeMat(1,2,aYZ),
    planeMat(1,3,aYW),
    planeMat(2,3,aZW),
  ].reduce(mat4Mul);
}

function applyRot4(m: Mat4, v: [number,number,number,number]): [number,number,number,number] {
  return [
    m[0]*v[0]+m[1]*v[1]+m[2]*v[2]+m[3]*v[3],
    m[4]*v[0]+m[5]*v[1]+m[6]*v[2]+m[7]*v[3],
    m[8]*v[0]+m[9]*v[1]+m[10]*v[2]+m[11]*v[3],
    m[12]*v[0]+m[13]*v[1]+m[14]*v[2]+m[15]*v[3],
  ];
}

function project4to3(
  [x,y,z,w]: [number,number,number,number],
  mode: ProjectionMode,
  perspDist: number
): [number,number,number] {
  if (mode === 'ortho') return [x,y,z];
  if (mode === 'persp') {
    const denom = perspDist - w;
    const safe = Math.abs(denom) < 1e-6 ? (denom < 0 ? -1e-6 : 1e-6) : denom;
    return [x/safe*perspDist, y/safe*perspDist, z/safe*perspDist];
  }
  // stereographic from north pole (0,0,0,1)
  const denom = 1 - w;
  const safe = Math.abs(denom) < 1e-6 ? (denom < 0 ? -1e-6 : 1e-6) : denom;
  return [x/safe, y/safe, z/safe];
}

function project3to2(
  [x,y,z]: [number,number,number],
  zoom: number, W: number, H: number,
  projMode: ProjectionMode
): [number, number, number] {
  if (projMode === 'ortho') {
    return [W/2 + x*zoom/3.5, H/2 - y*zoom/3.5, z];
  }
  const fov = 6, zz = z + fov;
  return [W/2 + x*zoom/zz, H/2 - y*zoom/zz, z];
}

export function depthAlpha(z: number): number {
  return 0.15 + 0.85 * Math.max(0, (z+1)/2);
}

export function wCoordColor(w: number): string {
  const t = Math.max(0, Math.min(1, (w+1)/2));
  const r = Math.round(0x44 + t*(0x88-0x44));
  const g = Math.round(0x88 + t*(0x44-0x88));
  const b = Math.round(0xff + t*(0xaa-0xff));
  return `rgb(${r},${g},${b})`;
}

export interface Projected4D {
  cx: number; cy: number; z: number; w: number;
}

export function rotateAll(
  verts: [number,number,number,number][],
  opts: RenderOpts4D
): [number,number,number,number][] {
  return verts.map(v => applyRot4(opts.rotMat, v));
}

export function projectAll(
  verts: [number,number,number,number][],
  opts: RenderOpts4D
): Projected4D[] {
  return verts.map(v => {
    const rotated = applyRot4(opts.rotMat, v);
    const xyz = project4to3(rotated, opts.projMode, opts.perspDist);
    const [cx,cy,z] = project3to2(xyz, opts.zoom, opts.W, opts.H, opts.projMode);
    return { cx, cy, z, w: rotated[3] };
  });
}

export function computeSlice(
  faces: number[][],
  rotated: [number,number,number,number][],
  wSlice: number
): [[number,number,number], [number,number,number]][] {
  const segments: [[number,number,number],[number,number,number]][] = [];
  const eps = 1e-9;
  for (const f of faces) {
    const pts: [number,number,number][] = [];
    const n = f.length;
    for (let i = 0; i < n; i++) {
      const a = f[i], b = f[(i+1) % n];
      const [xa,ya,za,wa] = rotated[a];
      const [xb,yb,zb,wb] = rotated[b];
      const da = wa - wSlice, db = wb - wSlice;
      if (Math.abs(da) < eps) {
        pts.push([xa, ya, za]);
      } else if (da * db < 0) {
        const t = da / (da - db);
        pts.push([xa + t*(xb-xa), ya + t*(yb-ya), za + t*(zb-za)]);
      }
    }
    // Dedup near-identical points
    const unique: [number,number,number][] = [];
    for (const p of pts) {
      const key = p.map(v => v.toFixed(6)).join(',');
      if (!unique.some(u => u.map(v => v.toFixed(6)).join(',') === key))
        unique.push(p);
    }
    if (unique.length === 2) segments.push([unique[0], unique[1]]);
  }
  return segments;
}

export function drawSlice(
  ctx: CanvasRenderingContext2D,
  segments: [[number,number,number], [number,number,number]][],
  opts: RenderOpts4D
): void {
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = '#ffd54a';
  for (const [p0, p1] of segments) {
    const [cx0, cy0, z0] = project3to2(p0, opts.zoom, opts.W, opts.H, opts.projMode);
    const [cx1, cy1, z1] = project3to2(p1, opts.zoom, opts.W, opts.H, opts.projMode);
    const midZ = (z0 + z1) / 2;
    ctx.globalAlpha = depthAlpha(midZ);
    ctx.beginPath();
    ctx.moveTo(cx0, cy0);
    ctx.lineTo(cx1, cy1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.2;
}

export function drawEdges4D(
  ctx: CanvasRenderingContext2D,
  edges: [number,number][],
  projected: Projected4D[],
  useWColor: boolean,
  lineWidth = 1.2
): void {
  ctx.lineWidth = lineWidth;
  for (const [a,b] of edges) {
    const pa = projected[a], pb = projected[b];
    const midZ = (pa.z+pb.z)/2;
    const midW = (pa.w+pb.w)/2;
    const alpha = depthAlpha(midZ);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = useWColor ? wCoordColor(midW) : '#5599ff';
    ctx.beginPath();
    ctx.moveTo(pa.cx, pa.cy);
    ctx.lineTo(pb.cx, pb.cy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawFaces4D(
  ctx: CanvasRenderingContext2D,
  faces: number[][],
  projected: Projected4D[],
  useWColor: boolean,
  projMode: ProjectionMode = 'ortho'
): void {
  // Depth-sort faces back→front (painter's algorithm).
  // Ortho: larger z = front → ascending sort.
  // Persp/Stereo: divisor zz = z+fov, so smaller z = closer → descending sort.
  const sorted = faces
    .map((f,i) => {
      const z = f.reduce((s,v)=>s+projected[v].z,0)/f.length;
      const w = f.reduce((s,v)=>s+projected[v].w,0)/f.length;
      return {i, z, w};
    })
    .sort((a,b) => projMode === 'ortho' ? a.z - b.z : b.z - a.z);

  for (const {i, z, w} of sorted) {
    const f = faces[i];
    const alpha = 0.1 * depthAlpha(z);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = useWColor ? wCoordColor(w) : '#3366cc';
    ctx.beginPath();
    ctx.moveTo(projected[f[0]].cx, projected[f[0]].cy);
    for (let k = 1; k < f.length; k++) ctx.lineTo(projected[f[k]].cx, projected[f[k]].cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawVerts4D(
  ctx: CanvasRenderingContext2D,
  projected: Projected4D[],
  useWColor: boolean
): void {
  for (const p of projected) {
    const alpha = depthAlpha(p.z);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = useWColor ? wCoordColor(p.w) : '#aabbff';
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, 2.5, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
