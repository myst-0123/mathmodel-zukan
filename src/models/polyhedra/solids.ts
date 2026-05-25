const phi = (1 + Math.sqrt(5)) / 2;
const phi2 = phi * phi;
const eps = 0.015;

export interface RectGroup {
  color: string;
  verts: number[];
}

export interface ExtraData {
  type: string;
  edges: [number, number][];
  label: string;
  color: string;
}

export interface SolidData {
  verts: [number, number, number][];
  edges: [number, number][];
  faces: number[][];
  edgeLen: number;
  extra: ExtraData | null;
  rectGroups: RectGroup[];
  faceColors: string[];
  info: string;
  extraBtnLabel: string | null;
  vertColorFn: (i: number) => string;
}

function dist(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function findEdges(verts: [number, number, number][], len: number): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++)
      if (Math.abs(dist(verts[i], verts[j]) - len) < eps) edges.push([i, j]);
  return edges;
}

function findPentagons(verts: [number, number, number][], edges: [number, number][]): number[][] {
  const adj: number[][] = Array.from({ length: verts.length }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const faces: number[][] = [];
  const faceSet = new Set<string>();
  for (const [e0, e1] of edges) {
    const tryPath = (path: number[]) => {
      if (path.length === 5) {
        if (adj[path[4]].includes(path[0])) {
          const key = [...path].sort((a, b) => a - b).join(',');
          if (!faceSet.has(key)) { faceSet.add(key); faces.push([...path]); }
        }
        return;
      }
      const last = path[path.length - 1];
      for (const next of adj[last]) if (!path.includes(next)) tryPath([...path, next]);
    };
    tryPath([e0, e1]);
  }
  return faces;
}

function findTriangles(verts: [number, number, number][], edges: [number, number][]): number[][] {
  const adj: number[][] = Array.from({ length: verts.length }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const faces: number[][] = [];
  const faceSet = new Set<string>();
  for (const [a, b] of edges) {
    for (const c of adj[a]) {
      if (c !== b && adj[b].includes(c)) {
        const key = [a, b, c].sort((x, y) => x - y).join(',');
        if (!faceSet.has(key)) { faceSet.add(key); faces.push([a, b, c]); }
      }
    }
  }
  return faces;
}

export function buildDodeca(): SolidData {
  const s = phi / 2, s2 = phi2 / 2, h = 0.5;
  const verts: [number, number, number][] = [
    [ s,  s,  s], [ s,  s, -s], [ s, -s,  s], [ s, -s, -s],
    [-s,  s,  s], [-s,  s, -s], [-s, -s,  s], [-s, -s, -s],
    [0,  h,  s2], [0,  h, -s2], [0, -h,  s2], [0, -h, -s2],
    [ s2, 0,  h], [ s2, 0, -h], [-s2, 0,  h], [-s2, 0, -h],
    [ h,  s2, 0], [-h,  s2, 0], [ h, -s2, 0], [-h, -s2, 0],
  ];
  const edgeLen = 1;
  const edges = findEdges(verts, edgeLen);
  const faces = findPentagons(verts, edges);

  const cubeEdges: [number, number][] = [];
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++)
      if (Math.abs(dist(verts[i], verts[j]) - phi) < eps) cubeEdges.push([i, j]);

  return {
    verts, edges, faces, edgeLen,
    extra: { type: 'cube', edges: cubeEdges, label: '内接立方体', color: '#ffcc44' },
    rectGroups: [
      { color: '#ff6688', verts: [8,  9, 11, 10] },
      { color: '#44ffaa', verts: [12, 13, 15, 14] },
      { color: '#ff88ff', verts: [16, 17, 19, 18] },
    ],
    faceColors: ['#4466ff','#3388ff','#44aaff','#3366dd','#5577ff',
                 '#2255cc','#4499ff','#336699','#5588ff','#2244bb','#4477ee','#3377ff'],
    info: '辺の長さ = 1　／　内接立方体の一辺 = φ ≈ 1.618　／　長方形の長辺 = φ² ≈ 2.618',
    extraBtnLabel: '内接立方体',
    vertColorFn: (i) => i < 8 ? '#ffcc44' : i < 12 ? '#44ffaa' : i < 16 ? '#ff88ff' : '#ff6688',
  };
}

export function buildIcosa(): SolidData {
  const sc = 0.5;
  const verts: [number, number, number][] = [
    [0,       sc,       sc * phi], [0,       sc,      -sc * phi],
    [0,      -sc,       sc * phi], [0,      -sc,      -sc * phi],
    [ sc * phi, 0,       sc],      [ sc * phi, 0,      -sc],
    [-sc * phi, 0,       sc],      [-sc * phi, 0,      -sc],
    [ sc,  sc * phi, 0],           [ sc, -sc * phi, 0],
    [-sc,  sc * phi, 0],           [-sc, -sc * phi, 0],
  ];
  const edgeLen = 1;
  const edges = findEdges(verts, edgeLen);
  const faces = findTriangles(verts, edges);

  return {
    verts, edges, faces, edgeLen,
    extra: null,
    rectGroups: [
      { color: '#ff6688', verts: [0,  1,  3,  2] },
      { color: '#44ffaa', verts: [4,  5,  7,  6] },
      { color: '#ff88ff', verts: [8, 10, 11,  9] },
    ],
    faceColors: ['#44aaff','#3388ff','#55bbff','#2266dd','#66ccff',
                 '#4499ee','#33aaff','#2277cc','#55aaee','#4488ff',
                 '#33bbff','#2255bb','#44bbee','#3377ff','#55ccff',
                 '#2244cc','#4499ff','#3366ee','#5599ff','#2266cc'],
    info: '辺の長さ = 1　／　3つの黄金長方形(1 × φ)が直交して内接',
    extraBtnLabel: null,
    vertColorFn: (i) => i < 4 ? '#ff6688' : i < 8 ? '#44ffaa' : '#ff88ff',
  };
}
