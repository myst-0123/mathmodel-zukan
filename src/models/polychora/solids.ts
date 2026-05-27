const phi = (1 + Math.sqrt(5)) / 2;

export type PolychoronId = 'cell5' | 'cell8' | 'cell16' | 'cell24' | 'cell120' | 'cell600';

export interface PolychoronData {
  id: PolychoronId;
  label: string;
  verts: [number, number, number, number][];
  edges: [number, number][];
  faces: number[][];
  vertCount: number;
  edgeCount: number;
  faceCount: number;
  edgeLen: number;
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

function dist4(a: [number,number,number,number], b: [number,number,number,number]): number {
  return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2+(a[3]-b[3])**2);
}

function dot4(a: [number,number,number,number], b: [number,number,number,number]): number {
  return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
}

function center4(verts: [number,number,number,number][]): [number,number,number,number][] {
  const n = verts.length;
  const cx = verts.reduce((s,v)=>s+v[0],0)/n;
  const cy = verts.reduce((s,v)=>s+v[1],0)/n;
  const cz = verts.reduce((s,v)=>s+v[2],0)/n;
  const cw = verts.reduce((s,v)=>s+v[3],0)/n;
  return verts.map(([x,y,z,w])=>[x-cx,y-cy,z-cz,w-cw]);
}

function normalize4(verts: [number,number,number,number][]): { verts: [number,number,number,number][]; R: number } {
  const [x,y,z,w] = verts[0];
  const R = Math.sqrt(x*x+y*y+z*z+w*w);
  return { verts: verts.map(([a,b,c,d])=>[a/R,b/R,c/R,d/R] as [number,number,number,number]), R };
}

function findEdges4(
  verts: [number,number,number,number][],
  targetLen: number,
  eps = 1e-6
): [number, number][] {
  const edges: [number,number][] = [];
  for (let i = 0; i < verts.length; i++)
    for (let j = i+1; j < verts.length; j++)
      if (Math.abs(dist4(verts[i], verts[j]) - targetLen) < eps)
        edges.push([i,j]);
  return edges;
}

function allPerms4(arr: number[]): number[][] {
  const result: number[][] = [];
  const a = [...arr];
  const permute = (k: number) => {
    if (k === 1) { result.push([...a]); return; }
    for (let i = 0; i < k; i++) {
      permute(k-1);
      if (k % 2 === 0) { [a[i], a[k-1]] = [a[k-1], a[i]]; }
      else { [a[0], a[k-1]] = [a[k-1], a[0]]; }
    }
  };
  permute(4);
  return result;
}

function dedup(verts: [number,number,number,number][]): [number,number,number,number][] {
  const seen = new Set<string>();
  const out: [number,number,number,number][] = [];
  for (const v of verts) {
    const key = v.map(x => x.toFixed(8)).join(',');
    if (!seen.has(key)) { seen.add(key); out.push(v); }
  }
  return out;
}

function evenPerms4(arr: [number,number,number,number]): [number,number,number,number][] {
  const [a,b,c,d] = arr;
  return [
    [a,b,c,d],[a,c,d,b],[a,d,b,c],
    [b,a,d,c],[b,c,a,d],[b,d,c,a],
    [c,a,b,d],[c,b,d,a],[c,d,a,b],
    [d,a,c,b],[d,b,a,c],[d,c,b,a],
  ];
}

function signedVariants(template: [number,number,number,number]): [number,number,number,number][] {
  const result: [number,number,number,number][] = [];
  for (let mask = 0; mask < 16; mask++) {
    result.push([
      template[0] === 0 ? 0 : template[0] * (mask&1?-1:1),
      template[1] === 0 ? 0 : template[1] * (mask&2?-1:1),
      template[2] === 0 ? 0 : template[2] * (mask&4?-1:1),
      template[3] === 0 ? 0 : template[3] * (mask&8?-1:1),
    ]);
  }
  return result;
}

function orbit(template: [number,number,number,number], useEvenPerms: boolean): [number,number,number,number][] {
  const perms = useEvenPerms ? evenPerms4(template) : allPerms4(template).map(p=>p as [number,number,number,number]);
  const result: [number,number,number,number][] = [];
  for (const p of perms)
    for (const sv of signedVariants(p as [number,number,number,number]))
      result.push(sv);
  return result;
}

// ── Face-computation helpers ──────────────────────────────────────────────────

// Return indices of top-n verts by dot product with center (cell membership)
function findCellVerts(
  verts: [number,number,number,number][],
  center: [number,number,number,number],
  n: number
): number[] {
  return verts
    .map((v,i) => ({i, s: dot4(v, center)}))
    .sort((a,b) => b.s - a.s)
    .slice(0, n)
    .map(x => x.i);
}

// Find all triangular faces (3-cliques) in the subgraph induced by cellVerts
function triCliquesInCell(cellVerts: number[], edges: [number,number][]): number[][] {
  const vSet = new Set(cellVerts);
  const adj = new Map<number, Set<number>>();
  for (const v of cellVerts) adj.set(v, new Set());
  for (const [a,b] of edges)
    if (vSet.has(a) && vSet.has(b)) { adj.get(a)!.add(b); adj.get(b)!.add(a); }
  const faces: number[][] = [];
  const seen = new Set<string>();
  for (const a of cellVerts) {
    const na = [...adj.get(a)!];
    for (const b of na) {
      if (b <= a) continue;
      for (const c of na) {
        if (c <= b && adj.get(b)!.has(c)) {
          const key = [a,b,c].sort((x,y)=>x-y).join(',');
          if (!seen.has(key)) { seen.add(key); faces.push([a,b,c]); }
        }
      }
    }
  }
  return faces;
}

// Find all pentagonal faces (5-cycles) in the subgraph induced by cellVerts
function pentFacesInCell(cellVerts: number[], edges: [number,number][]): number[][] {
  const vSet = new Set(cellVerts);
  const adj = new Map<number, number[]>();
  for (const v of cellVerts) adj.set(v, []);
  const cellEdges: [number,number][] = [];
  for (const [a,b] of edges) {
    if (vSet.has(a) && vSet.has(b)) {
      adj.get(a)!.push(b); adj.get(b)!.push(a);
      cellEdges.push([a,b]);
    }
  }
  const faces: number[][] = [];
  const faceSet = new Set<string>();
  for (const [e0, e1] of cellEdges) {
    const tryPath = (path: number[]) => {
      if (path.length === 5) {
        if (adj.get(path[4])!.includes(path[0])) {
          const key = [...path].sort((a,b)=>a-b).join(',');
          if (!faceSet.has(key)) { faceSet.add(key); faces.push([...path]); }
        }
        return;
      }
      const last = path[path.length-1];
      for (const next of adj.get(last)!) if (!path.includes(next)) tryPath([...path, next]);
    };
    tryPath([e0, e1]);
  }
  return faces;
}

// Dedup face list by canonical sorted-vertex key
function dedupFaces(all: number[][]): number[][] {
  const seen = new Set<string>();
  const out: number[][] = [];
  for (const f of all) {
    const key = [...f].sort((a,b)=>a-b).join(',');
    if (!seen.has(key)) { seen.add(key); out.push(f); }
  }
  return out;
}

// ── Raw vertex generators (shared between dual polychora) ─────────────────────

function rawCell600Verts(): [number,number,number,number][] {
  const raw: [number,number,number,number][] = [];
  for (const p of [[1,0,0,0],[-1,0,0,0],[0,1,0,0],[0,-1,0,0],[0,0,1,0],[0,0,-1,0],[0,0,0,1],[0,0,0,-1]])
    raw.push(p as [number,number,number,number]);
  for (let m = 0; m < 16; m++)
    raw.push([(m&1?-0.5:0.5),(m&2?-0.5:0.5),(m&4?-0.5:0.5),(m&8?-0.5:0.5)]);
  const half = 0.5, halfPi = 1/(2*phi), halfP = phi/2;
  for (const ep of evenPerms4([0,half,halfPi,halfP]))
    for (const sv of signedVariants(ep as [number,number,number,number]))
      raw.push(sv);
  return normalize4(dedup(raw)).verts;
}

function rawCell120Verts(): [number,number,number,number][] {
  const p = phi, pi = 1/phi, pi2 = 1/(phi*phi), p2 = phi*phi, s5 = Math.sqrt(5);
  const raw: [number,number,number,number][] = [
    ...orbit([0,0,2,2], false),
    ...orbit([1,1,1,s5], false),
    ...orbit([pi2,p,p,p], true),
    ...orbit([pi,pi,pi,p2], true),
    ...orbit([0,pi2,1,p2], true),
    ...orbit([0,pi,p,s5], true),
    ...orbit([pi,1,p,2], true),
  ];
  return normalize4(dedup(raw)).verts;
}

// ── Polychora builders ────────────────────────────────────────────────────────

export function buildCell5(): PolychoronData {
  const a = (1 - Math.sqrt(5)) / 4;
  const raw: [number,number,number,number][] = [
    [1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1],[a,a,a,a],
  ];
  const centered = center4(raw);
  const { verts } = normalize4(centered);
  const edges: [number,number][] = [];
  for (let i = 0; i < 5; i++)
    for (let j = i+1; j < 5; j++)
      edges.push([i,j]);
  // All C(5,3) = 10 triangles
  const faces: number[][] = [];
  for (let i = 0; i < 5; i++)
    for (let j = i+1; j < 5; j++)
      for (let k = j+1; k < 5; k++)
        faces.push([i,j,k]);
  const edgeLen = dist4(verts[0], verts[1]);
  return { id:'cell5', label:'5胞体（5-cell）', verts, edges, faces, vertCount:5, edgeCount:10, faceCount:10, edgeLen };
}

export function buildCell8(): PolychoronData {
  const raw: [number,number,number,number][] = [];
  for (let i = 0; i < 16; i++)
    raw.push([i&1?1:-1, i&2?1:-1, i&4?1:-1, i&8?1:-1]);
  const { verts } = normalize4(raw);
  const edges: [number,number][] = [];
  for (let i = 0; i < 16; i++)
    for (let j = i+1; j < 16; j++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) if (verts[i][k] !== verts[j][k]) diff++;
      if (diff === 1) edges.push([i,j]);
    }
  // 24 square faces: for each axis-pair (fixA,fixB) × (sA,sB) ∈ {0,1}²
  const faces: number[][] = [];
  for (let fixA = 0; fixA < 4; fixA++) {
    for (let fixB = fixA+1; fixB < 4; fixB++) {
      const [varC, varD] = ([0,1,2,3] as number[]).filter(x => x !== fixA && x !== fixB);
      for (const sA of [0,1]) {
        for (const sB of [0,1]) {
          const base = (sA << fixA) | (sB << fixB);
          // Order verts as a cycle around the square
          faces.push([
            base | (1<<varC) | (1<<varD),
            base | (1<<varC),
            base,
            base | (1<<varD),
          ]);
        }
      }
    }
  }
  const edgeLen = dist4(verts[0], verts[1]);
  return { id:'cell8', label:'8胞体・超立方体（8-cell）', verts, edges, faces, vertCount:16, edgeCount:32, faceCount:24, edgeLen };
}

export function buildCell16(): PolychoronData {
  const raw: [number,number,number,number][] = [
    [1,0,0,0],[-1,0,0,0],[0,1,0,0],[0,-1,0,0],
    [0,0,1,0],[0,0,-1,0],[0,0,0,1],[0,0,0,-1],
  ];
  const { verts } = normalize4(raw);
  const edges: [number,number][] = [];
  for (let i = 0; i < 8; i++)
    for (let j = i+1; j < 8; j++) {
      const d = dot4(verts[i], verts[j]);
      if (Math.abs(d) < 1e-9) edges.push([i,j]);
    }
  // 32 triangular faces: C(4,3) axis-triples × 2³ sign-combos
  // Vert indexing: axis k, sign +1 → idx 2k, sign -1 → idx 2k+1
  const faces: number[][] = [];
  for (let a = 0; a < 4; a++)
    for (let b = a+1; b < 4; b++)
      for (let c = b+1; c < 4; c++)
        for (let sa = 0; sa < 2; sa++)
          for (let sb = 0; sb < 2; sb++)
            for (let sc = 0; sc < 2; sc++)
              faces.push([2*a+sa, 2*b+sb, 2*c+sc]);
  const edgeLen = dist4(verts[0], verts[2]);
  return { id:'cell16', label:'16胞体（16-cell）', verts, edges, faces, vertCount:8, edgeCount:24, faceCount:32, edgeLen };
}

export function buildCell24(): PolychoronData {
  // All 24 vertices: choose 2 axes (C(4,2)=6) × 4 sign combos = 24
  const raw: [number,number,number,number][] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i+1; j < 4; j++) {
      for (const si of [-1, 1] as const) {
        for (const sj of [-1, 1] as const) {
          const v: [number,number,number,number] = [0, 0, 0, 0];
          v[i] = si; v[j] = sj;
          raw.push(v);
        }
      }
    }
  }
  const { verts, R } = normalize4(raw);
  const edgeLen = Math.sqrt(2) / R;
  const edges = findEdges4(verts, edgeLen, 1e-6);
  // 24 cells (octahedra): centers are ±e_i (8) ∪ (±½,±½,±½,±½) normalized (16)
  const centers24: [number,number,number,number][] = [
    [1,0,0,0],[-1,0,0,0],[0,1,0,0],[0,-1,0,0],
    [0,0,1,0],[0,0,-1,0],[0,0,0,1],[0,0,0,-1],
  ];
  const s = 0.5;
  for (let m = 0; m < 16; m++)
    centers24.push([(m&1?-s:s),(m&2?-s:s),(m&4?-s:s),(m&8?-s:s)]);
  const allFaces: number[][] = [];
  for (const c of centers24) {
    const cellVerts = findCellVerts(verts, c, 6);
    allFaces.push(...triCliquesInCell(cellVerts, edges));
  }
  const faces = dedupFaces(allFaces);
  if (import.meta.env.DEV)
    console.log(`24-cell: ${verts.length}V ${edges.length}E ${faces.length}F`);
  return { id:'cell24', label:'24胞体（24-cell）', verts, edges, faces, vertCount:24, edgeCount:96, faceCount:faces.length, edgeLen };
}

export function buildCell120(): PolychoronData {
  const p = phi, pi = 1/phi, pi2 = 1/(phi*phi), p2 = phi*phi, s5 = Math.sqrt(5);
  const raw: [number,number,number,number][] = [
    ...orbit([0,0,2,2], false),
    ...orbit([1,1,1,s5], false),
    ...orbit([pi2,p,p,p], true),
    ...orbit([pi,pi,pi,p2], true),
    ...orbit([0,pi2,1,p2], true),
    ...orbit([0,pi,p,s5], true),
    ...orbit([pi,1,p,2], true),
  ];
  const unique = dedup(raw);
  const { verts } = normalize4(unique);
  let minD = Infinity;
  for (let j = 1; j < verts.length; j++) {
    const d = dist4(verts[0], verts[j]);
    if (d < minD) minD = d;
  }
  const edgeLen = minD;
  const edges = findEdges4(verts, edgeLen, 1e-5);
  // 120 cells (dodecahedra), centers = normalized 600-cell vertices
  const centers = rawCell600Verts();
  const allFaces: number[][] = [];
  for (const c of centers) {
    const cellVerts = findCellVerts(verts, c, 20);
    allFaces.push(...pentFacesInCell(cellVerts, edges));
  }
  const faces = dedupFaces(allFaces);
  if (import.meta.env.DEV)
    console.log(`120-cell: ${unique.length}V ${edges.length}E ${faces.length}F`);
  return { id:'cell120', label:'120胞体（120-cell）', verts, edges, faces, vertCount:unique.length, edgeCount:edges.length, faceCount:faces.length, edgeLen };
}

export function buildCell600(): PolychoronData {
  const raw: [number,number,number,number][] = [];
  for (const p of [[1,0,0,0],[-1,0,0,0],[0,1,0,0],[0,-1,0,0],[0,0,1,0],[0,0,-1,0],[0,0,0,1],[0,0,0,-1]])
    raw.push(p as [number,number,number,number]);
  for (let m = 0; m < 16; m++)
    raw.push([(m&1?-0.5:0.5),(m&2?-0.5:0.5),(m&4?-0.5:0.5),(m&8?-0.5:0.5)]);
  const half = 0.5, halfPi = 1/(2*phi), halfP = phi/2;
  for (const ep of evenPerms4([0,half,halfPi,halfP]))
    for (const sv of signedVariants(ep as [number,number,number,number]))
      raw.push(sv);
  const unique = dedup(raw);
  const { verts } = normalize4(unique);
  let minD = Infinity;
  for (let j = 1; j < verts.length; j++) {
    const d = dist4(verts[0], verts[j]);
    if (d < minD) minD = d;
  }
  const edgeLen = minD;
  const edges = findEdges4(verts, edgeLen, 1e-5);
  // 600 cells (tetrahedra), centers = normalized 120-cell vertices
  const centers = rawCell120Verts();
  const allFaces: number[][] = [];
  for (const c of centers) {
    const cv = findCellVerts(verts, c, 4);
    // All C(4,3) = 4 triangles
    for (let i = 0; i < 4; i++)
      for (let j = i+1; j < 4; j++)
        for (let k = j+1; k < 4; k++)
          allFaces.push([cv[i], cv[j], cv[k]]);
  }
  const faces = dedupFaces(allFaces);
  if (import.meta.env.DEV)
    console.log(`600-cell: ${unique.length}V ${edges.length}E ${faces.length}F`);
  return { id:'cell600', label:'600胞体（600-cell）', verts, edges, faces, vertCount:unique.length, edgeCount:edges.length, faceCount:faces.length, edgeLen };
}

export const POLYCHORA_LIST: { id: PolychoronId; label: string; builder: () => PolychoronData }[] = [
  { id:'cell5',   label:'5胞体（5-cell）',          builder: buildCell5 },
  { id:'cell8',   label:'8胞体・超立方体（8-cell）', builder: buildCell8 },
  { id:'cell16',  label:'16胞体（16-cell）',         builder: buildCell16 },
  { id:'cell24',  label:'24胞体（24-cell）',         builder: buildCell24 },
  { id:'cell120', label:'120胞体（120-cell）',       builder: buildCell120 },
  { id:'cell600', label:'600胞体（600-cell）',       builder: buildCell600 },
];
