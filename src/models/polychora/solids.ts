const phi = (1 + Math.sqrt(5)) / 2;

export type PolychoronId = 'cell5' | 'cell8' | 'cell16' | 'cell24' | 'cell120' | 'cell600';

export interface PolychoronData {
  id: PolychoronId;
  label: string;
  verts: [number, number, number, number][];
  edges: [number, number][];
  vertCount: number;
  edgeCount: number;
  edgeLen: number;
}

function dist4(a: [number,number,number,number], b: [number,number,number,number]): number {
  return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2+(a[3]-b[3])**2);
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
  const edgeLen = dist4(verts[0], verts[1]);
  return { id:'cell5', label:'5胞体（5-cell）', verts, edges, vertCount:5, edgeCount:10, edgeLen };
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
  const edgeLen = dist4(verts[0], verts[1]);
  return { id:'cell8', label:'8胞体・超立方体（8-cell）', verts, edges, vertCount:16, edgeCount:32, edgeLen };
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
      const dot = verts[i][0]*verts[j][0]+verts[i][1]*verts[j][1]+verts[i][2]*verts[j][2]+verts[i][3]*verts[j][3];
      if (Math.abs(dot) < 1e-9) edges.push([i,j]);
    }
  const edgeLen = dist4(verts[0], verts[2]);
  return { id:'cell16', label:'16胞体（16-cell）', verts, edges, vertCount:8, edgeCount:24, edgeLen };
}

export function buildCell24(): PolychoronData {
  const raw: [number,number,number,number][] = [];
  const base = [1,1,0,0];
  for (const perm of allPerms4(base)) {
    for (const s0 of [1,-1]) for (const s1 of [1,-1]) {
      const v: [number,number,number,number] = [
        perm[0]===0?0:perm[0]*s0,
        perm[1]===0?0:perm[1]*s1,
        perm[2]===0?0:perm[2]*(perm[0]===0?s0:s1),
        perm[3]===0?0:perm[3]*(perm[1]===0?s0:s1),
      ];
      raw.push(v);
    }
  }
  const unique = dedup(raw);
  const { verts, R } = normalize4(unique);
  const edgeLen = Math.sqrt(2) / R;
  const edges = findEdges4(verts, edgeLen, 1e-6);
  return { id:'cell24', label:'24胞体（24-cell）', verts, edges, vertCount:24, edgeCount:96, edgeLen };
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

export function buildCell120(): PolychoronData {
  const p = phi, pi = 1/phi, pi2 = 1/(phi*phi), p2 = phi*phi, s5 = Math.sqrt(5);
  const raw: [number,number,number,number][] = [
    // family 1: perms of (0,0,2,2)
    ...orbit([0,0,2,2], false),
    // family 2: perms of (1,1,1,sqrt5)
    ...orbit([1,1,1,s5], false),
    // family 3: even perms of (phi^-2, phi, phi, phi)
    ...orbit([pi2,p,p,p], true),
    // family 4: even perms of (phi^-1, phi^-1, phi^-1, phi^2)
    ...orbit([pi,pi,pi,p2], true),
    // family 5: even perms of (0, phi^-2, 1, phi^2)
    ...orbit([0,pi2,1,p2], true),
    // family 6: even perms of (0, phi^-1, phi, sqrt5)
    ...orbit([0,pi,p,s5], true),
    // family 7: even perms of (phi^-1, 1, phi, sqrt5)
    ...orbit([pi,1,p,s5], true),
  ];
  const unique = dedup(raw);
  const { verts, R } = normalize4(unique);
  // edge length of 120-cell = 2/phi^2 before normalization
  const edgeLen = (2 / (phi*phi)) / R;
  const edges = findEdges4(verts, edgeLen, 1e-4);

  if (import.meta.env.DEV) {
    console.log(`120-cell: ${unique.length} verts, ${edges.length} edges`);
  }

  return { id:'cell120', label:'120胞体（120-cell）', verts, edges, vertCount:unique.length, edgeCount:edges.length, edgeLen };
}

export function buildCell600(): PolychoronData {
  const raw: [number,number,number,number][] = [];
  // family 1: perms of (±1,0,0,0) — 8 verts
  for (const p of [[1,0,0,0],[-1,0,0,0],[0,1,0,0],[0,-1,0,0],[0,0,1,0],[0,0,-1,0],[0,0,0,1],[0,0,0,-1]])
    raw.push(p as [number,number,number,number]);
  // family 2: (±1/2,±1/2,±1/2,±1/2) — 16 verts
  for (let m = 0; m < 16; m++)
    raw.push([(m&1?-0.5:0.5),(m&2?-0.5:0.5),(m&4?-0.5:0.5),(m&8?-0.5:0.5)]);
  // family 3: even perms of (0,±1/2,±1/(2φ),±φ/2) — 96 verts
  const half = 0.5, halfPi = 1/(2*phi), halfP = phi/2;
  for (const ep of evenPerms4([0,half,halfPi,halfP]))
    for (const sv of signedVariants(ep as [number,number,number,number]))
      raw.push(sv);
  const unique = dedup(raw);
  const { verts } = normalize4(unique);
  // find minimum edge length from vertex 0
  let minD = Infinity;
  for (let j = 1; j < verts.length; j++) {
    const d = dist4(verts[0], verts[j]);
    if (d < minD) minD = d;
  }
  const edgeLen = minD;
  const edges = findEdges4(verts, edgeLen, 1e-5);

  if (import.meta.env.DEV) {
    console.log(`600-cell: ${unique.length} verts, ${edges.length} edges`);
  }

  return { id:'cell600', label:'600胞体（600-cell）', verts, edges, vertCount:unique.length, edgeCount:edges.length, edgeLen };
}

export const POLYCHORA_LIST: { id: PolychoronId; label: string; builder: () => PolychoronData }[] = [
  { id:'cell5',   label:'5胞体（5-cell）',          builder: buildCell5 },
  { id:'cell8',   label:'8胞体・超立方体（8-cell）', builder: buildCell8 },
  { id:'cell16',  label:'16胞体（16-cell）',         builder: buildCell16 },
  { id:'cell24',  label:'24胞体（24-cell）',         builder: buildCell24 },
  { id:'cell120', label:'120胞体（120-cell）',       builder: buildCell120 },
  { id:'cell600', label:'600胞体（600-cell）',       builder: buildCell600 },
];
