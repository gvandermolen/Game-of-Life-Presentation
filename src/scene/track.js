import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { AUTOS, BIFURCACION, SUBTITULO } from '../content/guion.js';
import { CARS, FORK, SQUARES } from '../engine/flow.js';
import {
  BARRIER_S,
  BRANCHES,
  ENTRY,
  GANTRY_Z,
  MAIN,
  PATHS,
  QUEUE_FRONT,
  ROAD_WIDTH,
  SALIDA_POS,
  SALIDA_RADIUS,
  SQUARE_STEP,
  TILE,
  ZONES,
  pathCrossingZ,
  plaqueAt,
  squareFrame,
  squareS,
  zoneLabelAt,
  zoneRange,
} from './layout.js';
import { UBA } from './palette.js';
import { CARTOUCHE, RIVER, RIVER_WIDTH, riverDistance } from './space.js';
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

// Flat strip along a list of {p, n} frames. On the inside of a tight bend the
// edge is pulled in so the ribbon never folds over itself.
function strip(frames, halfW, y, uvScale = 1, offset = 0) {
  const pos = [];
  const uv = [];
  const idx = [];
  const ks = curvatures(frames);
  const clampSide = (v, k) => (v * k > 0.92 ? 0.92 / k : v);
  let s = 0;
  frames.forEach((f, i) => {
    if (i) s += f.p.distanceTo(frames[i - 1].p);
    const lo = clampSide(offset - halfW, ks[i]);
    const hi = clampSide(offset + halfW, ks[i]);
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

function makeMaterials() {
  const asphaltMap = asphaltTexture();
  asphaltMap.repeat.set(0.5, 1);
  return {
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltMap, roughness: 0.82 }),
    line: new THREE.MeshStandardMaterial({ color: '#F4EFE4', roughness: 0.6 }),
    paint: new THREE.MeshStandardMaterial({ color: '#F7F3EA', roughness: 0.55 }),
    navy: plastic(UBA.navy),
    gold: new THREE.MeshPhysicalMaterial({ color: UBA.gold, roughness: 0.35, metalness: 0.35, clearcoat: 0.6 }),
    paper: plastic('#FBF6EA', { roughness: 0.5 }),
    verge: plastic('#8F877A', { roughness: 0.45, clearcoat: 0.3 }),
    zones: Object.fromEntries(ZONES.map((z) => [z.id, plastic(z.color, { roughness: 0.42, clearcoat: 0.4 })])),
    ripple: new THREE.MeshStandardMaterial({ color: '#A9D3EE', roughness: 0.3, transparent: true, opacity: 0.55 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#3C86BF', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
    bank: new THREE.MeshStandardMaterial({ color: '#D9CDA6', roughness: 0.9 }),
    rail: plastic('#F4F1EA', { roughness: 0.35 }),
    steel: new THREE.MeshStandardMaterial({ color: '#B8BEC8', roughness: 0.3, metalness: 0.8 }),
    tiles: AUTOS.map((a) => plastic(a.color, { roughness: 0.32, clearcoat: 0.75 })),
  };
}

// ---------------------------------------------------------------- roads

// The board road carries the three zone colours along its verge.
function vergePieces(path) {
  if (path !== MAIN) return [[0, path.length, null]];
  const out = [];
  let from = 0;
  for (const z of ZONES) {
    const [a, b] = zoneRange(z);
    if (a > from) out.push([from, a, null]);
    out.push([a, b, z.id]);
    from = b;
  }
  out.push([from, path.length, null]);
  return out;
}

function buildRoads(group, M) {
  PATHS.forEach((path, i) => {
    const lift = i * LIFT;
    for (const [s0, s1, zone] of vergePieces(path)) {
      const frames = path.frames(s0, s1);
      group.add(flat(strip(frames, ROAD_WIDTH / 2 + 0.2, Y.edge + lift), zone ? M.zones[zone] : M.verge));
    }
    const frames = path.frames(0, path.length);
    group.add(flat(strip(frames, ROAD_WIDTH / 2 + 0.05, Y.line + lift), M.line));
    group.add(flat(strip(frames, ROAD_WIDTH / 2 - 0.03, Y.asphalt + lift, 0.5), M.asphalt));
  });
}

// ---------------------------------------------------------------- squares

// A raised plastic block that bends with the road, chamfered round its top edge.
function tileGeometry(s, L, halfW) {
  const CH = 0.018;
  const n = Math.max(2, Math.ceil(L / 0.06) + 1);
  const ring = (s0, s1) =>
    Array.from({ length: n }, (_, i) => {
      const { p, normal } = MAIN.at(s0 + ((s1 - s0) * i) / (n - 1));
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
  const dir = Math.abs(tangent.x) >= Math.abs(tangent.z) ? tangent : normal;
  return { rot: Math.atan2(dir.z, dir.x), dir };
}

const INK = AUTOS.map((a) => (a.vehiculo === 'taxi' ? UBA.navy : '#FFFFFF'));

function buildSquares(group, M) {
  const L = Math.min(TILE.length, SQUARE_STEP - 0.3);
  for (let k = 1; k <= SQUARES; k++) {
    const car = (k - 1) % CARS;
    const tile = shadowed(new THREE.Mesh(tileGeometry(squareS(k), L, TILE.width / 2), M.tiles[car]));
    group.add(tile);

    const { p, tangent, normal } = squareFrame(k);
    const { rot, dir } = readableBaseline(tangent, normal);
    // Below the baseline on screen: towards the audience.
    let down = new THREE.Vector3(-dir.z, 0, dir.x);
    if (down.z < 0) down.negate();
    const ink = INK[car];
    group.add(textAt(String(k), p.x - down.x * 0.12, p.z - down.z * 0.12, { size: 0.92, weight: 900, color: ink, rot, y: Y.label }));
    group.add(textAt(AUTOS[car].grupo.toUpperCase(), p.x + down.x * 0.52, p.z + down.z * 0.52, { size: 0.19, weight: 900, color: ink, rot, y: Y.label, spacing: 0.02 }));
  }
}

// Checkered line across the road at arc length s, with a word painted next to it.
function roadLine(group, M, path, s, word, wordAt) {
  const rows = [s - 0.16, s];
  const cols = 7;
  rows.forEach((r, ri) => {
    const frames = path.frames(r, r + 0.16, 0.16);
    for (let j = 0; j < cols; j++) {
      const off = -ROAD_WIDTH / 2 + 0.06 + ((j + 0.5) * (ROAD_WIDTH - 0.12)) / cols;
      group.add(flat(strip(frames, (ROAD_WIDTH - 0.12) / cols / 2, Y.marks, 1, off), (j + ri) % 2 ? M.navy : M.paint));
    }
  });
  const pts = Array.from({ length: 30 }, (_, i) => path.at(wordAt - 1.4 + (2.8 * i) / 29).p);
  group.add(textMesh(word, { path: pts, size: 0.5, weight: 900, color: '#F7F3EA', y: Y.marks + 0.001, spacing: 0.04 }));
}

function buildMarks(group, M) {
  const start = QUEUE_FRONT + 1.05;
  roadLine(group, M, MAIN, start, 'INICIO', start + 0.75);
  const end = squareS(SQUARES) + SQUARE_STEP / 2 + 0.35;
  roadLine(group, M, MAIN, end, 'DESTINO', end + 1.0);
}

// ---------------------------------------------------------------- salida

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

// ---------------------------------------------------------------- fork

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
  // Arrow up the lane, then the two lines of the sign.
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

// Red and white barrier closing the negotiating road.
function buildBarrier(group, M) {
  const { p, tangent, heading } = BRANCHES.negociar.at(BARRIER_S);
  const g = new THREE.Group();
  const stripes = new THREE.MeshPhysicalMaterial({ map: stripeTexture(), roughness: 0.4, clearcoat: 0.5 });
  const w = ROAD_WIDTH + 0.5;
  // Stripes on the two faces across the road (local ±x once turned to the heading).
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

// ---------------------------------------------------------------- zones

function buildZoneLabels(group) {
  for (const z of ZONES) {
    const p = zoneLabelAt(z);
    group.add(textAt(z.label, p.x, p.z, { size: 0.62, weight: 900, italic: true, color: new THREE.Color(z.color).multiplyScalar(0.62).getStyle(), y: 0.012, spacing: 0.06 }));
  }
}

// ---------------------------------------------------------------- title plaques

function plaqueTexture(k, title, color) {
  const W = 768;
  const H = 256;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = '#FBF6EA';
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 30);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(0, 0, 150, H, [30, 0, 0, 30]);
  ctx.fill();
  ctx.fillStyle = color === '#F2B705' ? UBA.navy : '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 100px ${FONT}`;
  ctx.fillText(String(k), 75, H / 2 + 4);
  ctx.fillStyle = UBA.navy;
  ctx.textAlign = 'left';
  let size = 74;
  const words = title.split(' ');
  const lines = [];
  const fit = () => {
    lines.length = 0;
    ctx.font = `900 ${size}px ${FONT}`;
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > W - 200 && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    lines.push(line);
  };
  fit();
  while (lines.length > 2 && size > 40) {
    size -= 6;
    fit();
  }
  lines.forEach((l, i) => ctx.fillText(l, 180, H / 2 + (i - (lines.length - 1) / 2) * size * 1.1 + 4));
  return toTexture(c, { anisotropy: 16 });
}

function buildPlaques(M) {
  const group = new THREE.Group();
  group.userData.dynamic = true;
  const list = [];
  const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.62, 10);
  for (let k = 1; k <= SQUARES; k++) {
    const car = (k - 1) % CARS;
    const { pos } = plaqueAt(k);
    const g = new THREE.Group();
    const post = shadowed(new THREE.Mesh(postGeo, M.steel));
    post.position.y = 0.31;
    g.add(post);
    const w = 2.1;
    const h = w / 3;
    const sign = new THREE.Group();
    const back = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w + 0.05, h + 0.05, 0.05, 2, 0.02), M.steel));
    sign.add(back);
    const title = AUTOS[car].casillas[Math.floor((k - 1) / CARS)].titulo;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: plaqueTexture(k, title, AUTOS[car].color), roughness: 0.5 }));
    face.position.z = 0.028;
    sign.add(face);
    sign.position.y = 0.62 + h / 2;
    // Leaning back like a lectern, towards the audience.
    sign.rotation.x = -0.75;
    g.add(sign);
    g.position.set(pos.x, 0, pos.z);
    g.visible = false;
    g.userData.sign = sign;
    group.add(g);
    list.push(g);
  }
  return { group, list };
}

// ---------------------------------------------------------------- river and bridge

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

// ---------------------------------------------------------------- cartouche

function buildCartouche(group) {
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
  ctx.font = `900 ${0.6 * ppu}px ${FONT}`;
  ctx.fillText('EL JUEGO DE LOS CONTRATOS', (w / 2) * ppu, 0.92 * ppu, (w - 0.7) * ppu);
  ctx.fillStyle = UBA.goldLight;
  ctx.font = `900 ${0.74 * ppu}px ${FONT}`;
  ctx.fillText('TRANSPORTE', (w / 2) * ppu, 1.75 * ppu);
  ctx.fillStyle = UBA.sky;
  ctx.font = `italic 400 ${0.22 * ppu}px ${FONT}`;
  ctx.fillText(SUBTITULO, (w / 2) * ppu, 2.6 * ppu, (w - 0.6) * ppu);
  const tex = toTexture(c, { anisotropy: 16 });
  const g = new THREE.PlaneGeometry(w, h);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, Y.plate, (z0 + z1) / 2);
  group.add(flat(g, new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.4, clearcoat: 0.6 })));
}

// ---------------------------------------------------------------- public

export function buildTrack() {
  const group = new THREE.Group();
  const M = makeMaterials();
  buildRiver(group, M);
  buildBridge(group, M, ENTRY);
  buildRoads(group, M);
  buildSquares(group, M);
  buildMarks(group, M);
  buildSalida(group, M);
  buildGantry(group, M);
  buildBarrier(group, M);
  buildZoneLabels(group);
  buildCartouche(group);
  const plaques = buildPlaques(M);
  group.add(plaques.group);
  return {
    group,
    // Show the stage title of the first n squares.
    reveal(n, animate = false) {
      plaques.list.forEach((g, i) => {
        const show = i < n;
        if (show && !g.visible && animate) g.userData.pop = 0;
        g.visible = show;
      });
    },
    plaques: plaques.list,
  };
}
