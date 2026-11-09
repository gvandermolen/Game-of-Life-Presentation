import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { AUTOS, BIFURCACION, SUBTITULO, TEMA, VUELTA } from '../content/guion.js';
import { CARS, FORK, LANE_POS, LANE_SQUARES, LAP_SQUARES } from '../engine/flow.js';
import { drawTopic } from '../ui/topics.js';
import { CONTENT_AT, LAP, LAP_FLAG_POS, LAP_TILE, LAP_ZONES, lapS, lapZoneRange, zoneSignAt } from './lap.js';
import {
  BARRIER_S,
  BRANCHES,
  DESTINO_LABEL,
  DESTINO_LINE,
  ENTRY,
  GANTRY_Z,
  INICIO_LINE,
  LANES,
  LANES_HALF,
  LANE_GAP,
  LANE_TILE,
  MAIN,
  ROAD_WIDTH,
  SALIDA_POS,
  SALIDA_RADIUS,
  ZONES,
  boardHalf,
  pathCrossingZ,
  riverDistance,
  squareS,
  zoneLabelAt,
  zoneRange,
} from './layout.js';
import { UBA } from './palette.js';
import { CARTOUCHE, RIVER, RIVER_WIDTH } from './space.js';
import { fixWinding, textAt, textMesh } from './text3d.js';
import { canvas, makeNoise, toTexture } from './textures.js';

// Everything printed on the board that needs to stay sharp up close is real
// geometry: roads, squares, the river, plates and lettering.

const Y = {
  bank: 0.008,
  water: 0.012,
  edge: 0.02,
  line: 0.027,
  asphalt: 0.034,
  marks: 0.042,
  tileBase: 0.04,
  tileTop: 0.075,
  label: 0.077,
  plate: 0.045,
};
// Roads overlap where they split and merge: each one sits a hair higher than the
// last within its layer, so the overlap never flickers.
const LIFT = 0.0012;

export const PIECE_Y = Y.tileTop;

const FONT = 'Bitter, Georgia, serif';

function plastic(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.25, ...extra });
}

function flat(geo, material, receive = true) {
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = receive;
  return m;
}

function shadowed(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function geometryFrom(pos, uv, idx) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setIndex(idx);
  fixWinding(geo);
  return geo;
}

// Signed curvature at each frame (positive when the bend's centre is on +n).
function curvatures(frames) {
  return frames.map((f, i) => {
    const a = frames[Math.max(0, i - 1)];
    const b = frames[Math.min(frames.length - 1, i + 1)];
    const ds = a.p.distanceTo(b.p);
    return ds > 1e-6 ? new THREE.Vector3().subVectors(b.n, a.n).dot(new THREE.Vector3(f.n.z, 0, -f.n.x)) / -ds : 0;
  });
}

// Flat strip along a list of {p, n} frames. `halfW` is a number or one value
// per frame. On the inside of a tight bend the edge is pulled in so the ribbon
// never folds over itself.
function strip(frames, halfW, y, uvScale = 1, offset = 0) {
  const pos = [];
  const uv = [];
  const idx = [];
  const ks = curvatures(frames);
  const clampSide = (v, k) => (v * k > 0.92 ? 0.92 / k : v);
  let s = 0;
  frames.forEach((f, i) => {
    if (i) s += f.p.distanceTo(frames[i - 1].p);
    const h = Array.isArray(halfW) ? halfW[i] : halfW;
    const lo = clampSide(offset - h, ks[i]);
    const hi = clampSide(offset + h, ks[i]);
    pos.push(f.p.x + f.n.x * lo, y, f.p.z + f.n.z * lo, f.p.x + f.n.x * hi, y, f.p.z + f.n.z * hi);
    uv.push(s * uvScale, 0, s * uvScale, 1);
    if (i < frames.length - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  return geometryFrom(pos, uv, idx);
}

function curveFrames(points, n = 300) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    return { p, n: new THREE.Vector3(-t.z, 0, t.x).normalize(), t };
  });
}

// ---------------------------------------------------------------- materials

function asphaltTexture() {
  const S = 256;
  const { c, ctx } = canvas(S);
  const img = ctx.createImageData(S, S);
  const n = makeNoise(21);
  let seed = 4;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = 40 + n(x * 0.08, y * 0.08) * 10 + rnd() * 16;
      const o = (y * S + x) * 4;
      img.data[o] = v;
      img.data[o + 1] = v + 1;
      img.data[o + 2] = v + 4;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { repeat: [1, 1] });
}

let shared = null;
function materials() {
  if (shared) return shared;
  const asphaltMap = asphaltTexture();
  asphaltMap.repeat.set(0.5, 1);
  const zones = Object.fromEntries(ZONES.map((z) => [z.id, plastic(z.color, { roughness: 0.42, clearcoat: 0.4 })]));
  shared = {
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltMap, roughness: 0.82 }),
    line: new THREE.MeshStandardMaterial({ color: '#F4EFE4', roughness: 0.6 }),
    paint: new THREE.MeshStandardMaterial({ color: '#F7F3EA', roughness: 0.55 }),
    navy: plastic(UBA.navy),
    gold: new THREE.MeshPhysicalMaterial({ color: UBA.gold, roughness: 0.35, metalness: 0.35, clearcoat: 0.6 }),
    paper: plastic('#FBF6EA', { roughness: 0.5 }),
    pass: plastic('#F1EADA', { roughness: 0.4, clearcoat: 0.5 }),
    verge: plastic('#8F877A', { roughness: 0.45, clearcoat: 0.3 }),
    zones,
    ripple: new THREE.MeshStandardMaterial({ color: '#A9D3EE', roughness: 0.3, transparent: true, opacity: 0.55 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#3C86BF', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
    bank: new THREE.MeshStandardMaterial({ color: '#D9CDA6', roughness: 0.9 }),
    rail: plastic('#F4F1EA', { roughness: 0.35 }),
    steel: new THREE.MeshStandardMaterial({ color: '#B8BEC8', roughness: 0.3, metalness: 0.8 }),
    tiles: AUTOS.map((a) => plastic(a.color, { roughness: 0.32, clearcoat: 0.75 })),
  };
  return shared;
}

// ---------------------------------------------------------------- shared pieces

// A raised plastic block that bends with the road, chamfered round its top edge.
function tileGeometry(path, s, L, halfW) {
  const CH = 0.018;
  const n = Math.max(2, Math.ceil(L / 0.06) + 1);
  const ring = (s0, s1) =>
    Array.from({ length: n }, (_, i) => {
      const { p, normal } = path.at(s0 + ((s1 - s0) * i) / (n - 1));
      return { p, n: normal };
    });
  const base = ring(s - L / 2, s + L / 2);
  const top = ring(s - L / 2 + CH, s + L / 2 - CH);
  const pt = (f, side, w, y) => new THREE.Vector3(f.p.x + f.n.x * side * w, y, f.p.z + f.n.z * side * w);
  const T = (i, side) => pt(top[i], side, halfW - CH, Y.tileTop);
  const C = (i, side) => pt(base[i], side, halfW, Y.tileTop - CH);
  const B = (i, side) => pt(base[i], side, halfW, Y.tileBase);

  const pos = [];
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const quad = (a, b, c, d, out) => {
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    const v = e1.cross(e2).dot(out) >= 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
    for (const p of v) pos.push(p.x, p.y, p.z);
  };
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n - 1; i++) {
    quad(T(i, -1), T(i, 1), T(i + 1, 1), T(i + 1, -1), up);
    for (const side of [-1, 1]) {
      const out = base[i].n.clone().multiplyScalar(side);
      quad(T(i, side), T(i + 1, side), C(i + 1, side), C(i, side), out.clone().add(up));
      quad(C(i, side), C(i + 1, side), B(i + 1, side), B(i, side), out);
    }
  }
  const along = base[n - 1].p.clone().sub(base[n - 2].p).setY(0).normalize();
  const back = base[0].p.clone().sub(base[1].p).setY(0).normalize();
  for (const [i, out] of [[0, back], [n - 1, along]]) {
    quad(T(i, -1), T(i, 1), C(i, 1), C(i, -1), out.clone().add(up));
    quad(C(i, -1), C(i, 1), B(i, 1), B(i, -1), out);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  return geo;
}

// Text baseline across or along the road, whichever reads left to right for the audience.
function readableBaseline(tangent, normal) {
  let dir = Math.abs(tangent.x) >= Math.abs(tangent.z) ? tangent : normal;
  // Left to right as seen from the front of the table, never upside down.
  if (dir.x < 0) dir = dir.clone().negate();
  return { rot: Math.atan2(dir.z, dir.x), dir };
}

// Coloured verge, white edge line and asphalt along a path. `zoneAt(s0, s1)`
// splits the verge into coloured stretches; `half(s)` is the road half width.
function road(group, M, path, { lift = 0, half = () => ROAD_WIDTH / 2, pieces = [[0, path.length, null]], zoneMats = M.zones } = {}) {
  for (const [s0, s1, zone] of pieces) {
    const frames = path.frames(s0, s1);
    const hs = frames.map((_, i) => half(s0 + ((s1 - s0) * i) / (frames.length - 1)) + 0.2);
    group.add(flat(strip(frames, hs, Y.edge + lift), zone ? zoneMats[zone] : M.verge));
  }
  const frames = path.frames(0, path.length);
  const hs = frames.map((_, i) => half((path.length * i) / (frames.length - 1)));
  group.add(flat(strip(frames, hs.map((h) => h + 0.05), Y.line + lift), M.line));
  group.add(flat(strip(frames, hs.map((h) => h - 0.03), Y.asphalt + lift, 0.5), M.asphalt));
}

function zonePieces(length, ranges) {
  const out = [];
  let from = 0;
  for (const [a, b, id] of ranges) {
    if (a > from) out.push([from, a, null]);
    out.push([a, b, id]);
    from = b;
  }
  if (from < length) out.push([from, length, null]);
  return out;
}

// Checkered line across the road at arc length s.
function checkerLine(group, M, path, s, width, cols = 7) {
  const rows = [s - 0.16, s];
  rows.forEach((r, ri) => {
    const frames = path.frames(r, r + 0.16, 0.16);
    for (let j = 0; j < cols; j++) {
      const off = -width / 2 + 0.06 + ((j + 0.5) * (width - 0.12)) / cols;
      group.add(flat(strip(frames, (width - 0.12) / cols / 2, Y.marks, 1, off), (j + ri) % 2 ? M.navy : M.paint));
    }
  });
}

function buildSalida(group, M) {
  const { x, z } = SALIDA_POS;
  const ring = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(SALIDA_RADIUS, SALIDA_RADIUS + 0.04, 0.07, 64), M.gold));
  ring.position.set(x, Y.plate, z);
  group.add(ring);
  const paper = new THREE.CircleGeometry(SALIDA_RADIUS - 0.14, 64);
  paper.rotateX(-Math.PI / 2);
  paper.translate(x, Y.plate + 0.036, z);
  group.add(flat(paper, M.navy));
  group.add(textAt('SALIDA', x, z + 0.55, { size: 0.3, weight: 900, color: UBA.gold, y: Y.plate + 0.038, spacing: 0.03 }));
}

function buildRiver(group, M) {
  const frames = curveFrames(RIVER, 320);
  group.add(flat(strip(frames, RIVER_WIDTH / 2 + 0.22, Y.bank), M.bank));
  group.add(flat(strip(frames, RIVER_WIDTH / 2, Y.water), M.water));
  for (const [off, phase] of [[-0.2, 0], [0.22, 5]]) {
    for (let i = phase; i < frames.length - 6; i += 11) {
      group.add(flat(strip(frames.slice(i, i + 4), 0.014, Y.water + 0.002, 1, off), M.ripple));
    }
  }
  const path = RIVER.map((p) => ({ x: p.x, z: p.z }));
  let s = 0;
  for (let i = 1; i < path.length; i++) {
    if (path[i].x > 9) break;
    s += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  }
  group.add(textMesh('RIACHUELO', { path, at: s, size: 0.46, weight: 700, italic: true, color: '#EAF5FB', y: Y.water + 0.003, spacing: 0.08 }));
}

function buildBridge(group, M, path) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 400; i++) {
    const s = (i / 400) * path.length;
    const { p } = path.at(s);
    const d = riverDistance(p.x, p.z);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  if (bestD > 0.4) return;
  const half = RIVER_WIDTH / 2 + 0.6;
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const { p, normal } = path.at(best - half + (2 * half * i) / 16);
      pts.push(p.clone().addScaledVector(normal, side * (ROAD_WIDTH / 2 + 0.26)).setY(0.24));
    }
    group.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.045, 8, false), M.rail)));
    for (let i = 0; i <= 4; i++) {
      const q = pts[Math.round((i / 4) * 16)];
      const post = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.24, 10), M.rail));
      post.position.set(q.x, 0.12, q.z);
      group.add(post);
    }
    group.add(flat(strip(path.frames(best - half, best + half, 0.08), 0.09, Y.edge + 0.012, 1, side * (ROAD_WIDTH / 2 + 0.26)), M.rail));
  }
}

// The title plate in front of the board. Its texture is redrawn when the
// class name changes in the settings.
function cartoucheTexture(title) {
  const { x0, x1, z0, z1 } = CARTOUCHE;
  const w = x1 - x0;
  const h = z1 - z0;
  const ppu = 200;
  const { c, ctx } = canvas(Math.round(w * ppu), Math.round(h * ppu));
  ctx.scale(ppu, ppu);
  ctx.fillStyle = UBA.navy;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 0.35);
  ctx.fill();
  ctx.strokeStyle = UBA.gold;
  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.roundRect(0.18, 0.18, w - 0.36, h - 0.36, 0.22);
  ctx.stroke();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  const text = title.toUpperCase();
  let size = 0.72;
  ctx.font = `900 ${size * ppu}px ${FONT}`;
  while (ctx.measureText(text).width > (w - 0.8) * ppu && size > 0.36) {
    size -= 0.02;
    ctx.font = `900 ${size * ppu}px ${FONT}`;
  }
  ctx.fillText(text, (w / 2) * ppu, 1.0 * ppu);
  ctx.fillStyle = UBA.goldLight;
  ctx.font = `900 ${0.46 * ppu}px ${FONT}`;
  ctx.fillText(TEMA.toUpperCase(), (w / 2) * ppu, 1.78 * ppu, (w - 0.8) * ppu);
  ctx.fillStyle = UBA.sky;
  ctx.font = `italic 400 ${0.22 * ppu}px ${FONT}`;
  ctx.fillText(SUBTITULO, (w / 2) * ppu, 2.6 * ppu, (w - 0.6) * ppu);
  return toTexture(c, { anisotropy: 16 });
}

function buildCartouche(group, title) {
  const { x0, x1, z0, z1 } = CARTOUCHE;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, Y.plate, (z0 + z1) / 2);
  const material = new THREE.MeshPhysicalMaterial({ map: cartoucheTexture(title), transparent: true, roughness: 0.4, clearcoat: 0.6 });
  group.add(flat(g, material));
  return (t) => {
    material.map.dispose();
    material.map = cartoucheTexture(t);
    material.needsUpdate = true;
  };
}

// River, Salida and title plate: on the board in both worlds.
export function buildSharedTrack(group, title) {
  const M = materials();
  buildRiver(group, M);
  buildSalida(group, M);
  return { setTitle: buildCartouche(group, title) };
}

// ---------------------------------------------------------------- the game

function buildLanes(group, M) {
  road(group, M, ENTRY);
  ['negociar', 'leer', 'aceptar'].forEach((k, i) => road(group, M, BRANCHES[k], { lift: (i + 1) * LIFT }));
  const ranges = ZONES.map((z) => [...zoneRange(z), z.id]);
  road(group, M, MAIN, { lift: 4 * LIFT, half: boardHalf, pieces: zonePieces(MAIN.length, ranges) });
  // Dashed lines between the lanes.
  for (let c = 0; c < CARS - 1; c++) {
    const off = (c + 1 - CARS / 2) * LANE_GAP;
    for (let s = INICIO_LINE + 0.4; s < DESTINO_LINE - 0.5; s += 1.1) {
      group.add(flat(strip(MAIN.frames(s, s + 0.55, 0.1), 0.035, Y.marks - 0.004, 1, off), M.line));
    }
  }
}

const ink = (car) => (AUTOS[car].vehiculo === 'taxi' ? UBA.navy : '#FFFFFF');

function buildLaneSquares(group, M) {
  for (let c = 0; c < CARS; c++) {
    const lane = LANES[c];
    for (let k = 1; k <= LANE_SQUARES; k++) {
      const card = LANE_POS[c].includes(k);
      const s = squareS(k);
      group.add(shadowed(new THREE.Mesh(tileGeometry(lane, s, LANE_TILE.length, LANE_TILE.width / 2), card ? M.tiles[c] : M.pass)));
      const { p, tangent, normal } = lane.at(s);
      const { rot } = readableBaseline(tangent, normal);
      group.add(textAt(String(k), p.x, p.z, { size: card ? 0.74 : 0.5, weight: 900, color: card ? ink(c) : '#8C8272', rot, y: Y.label }));
    }
  }
}

// Inicio and Destino lines across the four lanes. The words are painted
// beside the board: Inicio by its line, Destino in front of home.
function buildLaneMarks(group, M) {
  const width = LANES_HALF * 2;
  checkerLine(group, M, MAIN, INICIO_LINE, width, 12);
  checkerLine(group, M, MAIN, DESTINO_LINE, width, 12);
  const f = MAIN.at(INICIO_LINE);
  const at = f.p.clone().addScaledVector(f.normal, -(LANES_HALF + 1.0));
  group.add(textAt('INICIO', at.x, at.z, { size: 0.55, weight: 900, color: '#F7F3EA', y: 0.012, spacing: 0.05 }));
  group.add(textAt('DESTINO', DESTINO_LABEL.x, DESTINO_LABEL.z, { size: 0.6, weight: 900, color: '#F7F3EA', y: 0.012, spacing: 0.06 }));
}

function panelTexture(title, n) {
  const W = 1024;
  const H = 400;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = '#0E6B3B';
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 40);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.roundRect(22, 22, W - 44, H - 44, 26);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.beginPath();
  ctx.moveTo(110, 110);
  ctx.lineTo(170, 190);
  ctx.lineTo(130, 190);
  ctx.lineTo(130, 300);
  ctx.lineTo(90, 300);
  ctx.lineTo(90, 190);
  ctx.lineTo(50, 190);
  ctx.closePath();
  ctx.fill();
  const words = title.split(' ');
  const cut = Math.ceil(words.length / 2);
  const lines = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
  ctx.font = `900 112px ${FONT}`;
  lines.forEach((l, i) => ctx.fillText(l.toUpperCase(), W / 2 + 70, 140 + i * 130, W - 260));
  ctx.font = `900 64px ${FONT}`;
  ctx.fillStyle = '#FFD84A';
  ctx.fillText(n, W - 70, 74);
  return toTexture(c, { anisotropy: 16 });
}

function buildGantry(group, M) {
  const xs = FORK.map((f) => pathCrossingZ(BRANCHES[f], GANTRY_Z).x);
  const left = xs[0] - ROAD_WIDTH / 2 - 0.75;
  const right = xs[2] + ROAD_WIDTH / 2 + 0.75;
  const H = 2.7;
  for (const x of [left, right]) {
    const post = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, H, 16), M.steel));
    post.position.set(x, H / 2, GANTRY_Z);
    group.add(post);
    const foot = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.12, 0.4, 2, 0.04), M.steel));
    foot.position.set(x, 0.06, GANTRY_Z);
    group.add(foot);
  }
  for (const y of [H - 0.05, H - 1.05]) {
    const beam = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, right - left, 12), M.steel));
    beam.rotation.z = Math.PI / 2;
    beam.position.set((left + right) / 2, y, GANTRY_Z - 0.12);
    group.add(beam);
  }
  FORK.forEach((f, i) => {
    const w = Math.min(2.75, (xs[1] - xs[0]) * 0.95);
    const h = w * (400 / 1024);
    const back = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w + 0.06, h + 0.06, 0.06, 2, 0.03), M.steel));
    back.position.set(xs[i], H - 0.55, GANTRY_Z);
    group.add(back);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: panelTexture(BIFURCACION.caminos[f].titulo, BIFURCACION.caminos[f].tecla), roughness: 0.45 }));
    face.position.set(xs[i], H - 0.55, GANTRY_Z + 0.032);
    group.add(face);
  });
}

function stripeTexture() {
  const { c, ctx } = canvas(512, 128);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#D8352A';
  for (let i = -2; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 64, 128);
    ctx.lineTo(i * 64 + 32, 128);
    ctx.lineTo(i * 64 + 96, 0);
    ctx.lineTo(i * 64 + 64, 0);
    ctx.closePath();
    ctx.fill();
  }
  return toTexture(c);
}

// Red and white barrier closing the negotiating road.
function buildBarrier(group, M) {
  const { p, tangent, heading } = BRANCHES.negociar.at(BARRIER_S);
  const g = new THREE.Group();
  const stripes = new THREE.MeshPhysicalMaterial({ map: stripeTexture(), roughness: 0.4, clearcoat: 0.5 });
  const w = ROAD_WIDTH + 0.5;
  const board = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, w), [stripes, stripes, M.paper, M.paper, M.paper, M.paper]));
  board.position.y = 0.52;
  g.add(board);
  for (const s of [-1, 1]) {
    const leg = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.5, 0.1, 2, 0.03), M.paper));
    leg.position.set(0, 0.25, s * (w / 2 - 0.15));
    g.add(leg);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshStandardMaterial({ color: '#ffb300', emissive: '#ff8a00', emissiveIntensity: 1.4 }));
    lamp.position.set(0, 0.78, s * (w / 2 - 0.15));
    g.add(lamp);
  }
  g.position.set(p.x, 0, p.z).addScaledVector(tangent, 0.05);
  g.rotation.y = heading;
  group.add(g);
}

function buildZoneLabels(group) {
  for (const z of ZONES) {
    const p = zoneLabelAt(z);
    group.add(textAt(z.label, p.x, p.z, { size: 0.62, weight: 900, italic: true, color: new THREE.Color(z.color).multiplyScalar(0.62).getStyle(), y: 0.012, spacing: 0.06 }));
  }
}

export function buildGameTrack(group) {
  const M = materials();
  buildBridge(group, M, ENTRY);
  buildLanes(group, M);
  buildLaneSquares(group, M);
  buildLaneMarks(group, M);
  buildGantry(group, M);
  buildBarrier(group, M);
  buildZoneLabels(group);
}

// ---------------------------------------------------------------- the lap

const LAP_ZONE_OF = (k) => LAP_ZONES.find((z) => k >= z.from && k <= z.to);

function contentTexture(n, color) {
  const S = 256;
  const { c, ctx } = canvas(S);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = UBA.navy;
  ctx.stroke();
  drawTopic(ctx, VUELTA[n - 1].icono, S / 2, S * 0.4, S * 0.44, UBA.navy, 2.1);
  ctx.fillStyle = color;
  ctx.font = `900 74px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), S / 2, S * 0.76);
  return toTexture(c, { anisotropy: 16 });
}

function checkerTexture() {
  const { c, ctx } = canvas(256);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = (i + j) % 2 ? UBA.navy : '#fff';
      ctx.fillRect(i * 32, j * 32, 32, 32);
    }
  }
  return toTexture(c);
}

function buildLapSquares(group, M) {
  const decal = new THREE.PlaneGeometry(1, 1);
  decal.rotateX(-Math.PI / 2);
  for (let k = 1; k <= LAP_SQUARES; k++) {
    const s = lapS(k);
    const z = LAP_ZONE_OF(k);
    const n = CONTENT_AT.get(k);
    const { p, tangent, normal } = LAP.at(s);
    if (k === LAP_SQUARES) {
      const tile = shadowed(new THREE.Mesh(tileGeometry(LAP, s, LAP_TILE.content.length, LAP_TILE.content.width / 2), M.paper));
      group.add(tile);
      const d = new THREE.Mesh(decal, new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.5 }));
      d.scale.set(LAP_TILE.content.length - 0.12, 1, LAP_TILE.content.width - 0.12);
      d.position.set(p.x, Y.label, p.z);
      d.rotation.y = Math.atan2(-tangent.z, tangent.x);
      group.add(d);
      continue;
    }
    if (n) {
      group.add(shadowed(new THREE.Mesh(tileGeometry(LAP, s, LAP_TILE.content.length, LAP_TILE.content.width / 2), M.zones[z.id])));
      const d = new THREE.Mesh(decal, new THREE.MeshStandardMaterial({ map: contentTexture(n, UBA.navy), transparent: true, roughness: 0.45 }));
      d.scale.setScalar(1.42);
      d.position.set(p.x, Y.label, p.z);
      const { rot } = readableBaseline(tangent, normal);
      d.rotation.y = -rot;
      d.renderOrder = 2;
      group.add(d);
    } else {
      group.add(shadowed(new THREE.Mesh(tileGeometry(LAP, s, LAP_TILE.pass.length, LAP_TILE.pass.width / 2), M.pass)));
      const { rot } = readableBaseline(tangent, normal);
      group.add(textAt(String(k), p.x, p.z, { size: 0.42, weight: 900, color: '#A39886', rot, y: Y.label }));
    }
  }
  const end = LAP.at(lapS(LAP_SQUARES));
  const at = end.p.clone().addScaledVector(end.normal, -(ROAD_WIDTH / 2 + 1.1));
  group.add(textAt('DESTINO', at.x, at.z, { size: 0.55, weight: 900, color: '#F7F3EA', y: 0.012, spacing: 0.05 }));
}

function zoneSignTexture(z) {
  const { c, ctx } = canvas(512, 256);
  ctx.fillStyle = z.color;
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 256, 28);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 224, 18);
  ctx.stroke();
  ctx.fillStyle = UBA.navy;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText('ZONA', 256, 76);
  ctx.font = `900 92px ${FONT}`;
  ctx.fillText(z.label, 256, 160, 450);
  return toTexture(c, { anisotropy: 16 });
}

// Road signs at the start of each zone, facing the audience.
function buildZoneSigns(group, M) {
  for (const z of LAP_ZONES) {
    const { pos } = zoneSignAt(z);
    const g = new THREE.Group();
    const post = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.3, 10), M.steel));
    post.position.y = 0.65;
    g.add(post);
    const w = 1.5;
    const h = w / 2;
    const back = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w + 0.05, h + 0.05, 0.05, 2, 0.02), M.steel));
    back.position.y = 1.3 + h / 2 - 0.1;
    g.add(back);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: zoneSignTexture(z), roughness: 0.45 }));
    face.position.set(0, 1.3 + h / 2 - 0.1, 0.028);
    g.add(face);
    g.position.set(pos.x, 0, pos.z);
    g.rotation.x = -0.12;
    group.add(g);
  }
}

// Checkered flag at Destino: furled until the car arrives.
function buildFlag(group, M) {
  const g = new THREE.Group();
  g.userData.dynamic = true;
  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.4, 12), M.steel));
  pole.position.y = 1.2;
  g.add(pole);
  const knob = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), M.gold));
  knob.position.y = 2.42;
  g.add(knob);
  const cloth = new THREE.Group();
  cloth.position.set(0, 2.25, 0);
  const geo = new THREE.PlaneGeometry(1.3, 0.85, 16, 4);
  geo.translate(0.65, -0.425, 0);
  const tex = checkerTexture();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 }));
  mesh.castShadow = true;
  cloth.add(mesh);
  g.add(cloth);
  g.position.set(LAP_FLAG_POS.x, 0, LAP_FLAG_POS.z);
  const base = geo.attributes.position.array.slice();
  const flag = {
    group: g,
    open: 0,
    set(k) {
      this.open = k;
      cloth.scale.set(Math.max(0.04, k), Math.max(0.15, k), 1);
    },
    wave(time) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        p.array[i * 3 + 2] = Math.sin(x * 4 - time * 6) * 0.08 * x * this.open;
      }
      p.needsUpdate = true;
    },
  };
  flag.set(0);
  group.add(g);
  return flag;
}

export function buildLapTrack(group) {
  const M = materials();
  buildBridge(group, M, LAP);
  const ranges = LAP_ZONES.map((z) => [...lapZoneRange(z), z.id]);
  road(group, M, LAP, { pieces: zonePieces(LAP.length, ranges) });
  buildLapSquares(group, M);
  buildZoneSigns(group, M);
  return { flag: buildFlag(group, M) };
}
