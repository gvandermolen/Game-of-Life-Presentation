import * as THREE from 'three';
import { CROSSINGS, CRUCES, LANES, LANE_COUNT, LANE_LENGTH, crossingAt } from '../engine/board.js';
import {
  LANE_GEO,
  META_HALF,
  META_LINE,
  ROAD_WIDTH,
  START_RADIUS,
  crossingCenter,
  crossingRadius,
  laneAt,
  laneSquare,
  roadIntervals,
  squareLength,
} from './layout.js';
import { SQUARE_STYLE, UBA } from './palette.js';
import { CARTOUCHE, RIVER, RIVER_WIDTH, riverDistance } from './space.js';
import { fixWinding, textAt, textMesh } from './text3d.js';
import { canvas, makeNoise, toTexture } from './textures.js';

// Everything printed on the board that needs to stay sharp up close is real
// geometry: roads, squares, roundabouts, the river, the meta avenue and the text.

const Y = {
  bank: 0.008,
  water: 0.012,
  edge: 0.02,
  line: 0.029,
  asphalt: 0.034,
  marks: 0.04,
  plate: 0.041,
  avenue: 0.042,
  tileBase: 0.036,
  tileTop: 0.066,
  label: 0.068,
  disc: 0.045,
  ring: 0.048,
};

export const PIECE_Y = Y.tileTop;

const GREY = '#8F877A';

function plastic(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.25, ...extra });
}

function flat(geo, material, receive = true) {
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = receive;
  return m;
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

function laneFrames(lane, s0, s1, step = 0.12) {
  const n = Math.max(2, Math.ceil((s1 - s0) / step) + 1);
  return Array.from({ length: n }, (_, i) => {
    const { p, normal } = laneAt(lane, s0 + ((s1 - s0) * i) / (n - 1));
    return { p, n: normal };
  });
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
    curb: plastic('#E9E2D2', { roughness: 0.5 }),
    paper: plastic('#FBF6EA', { roughness: 0.5 }),
    ripple: new THREE.MeshStandardMaterial({ color: '#A9D3EE', roughness: 0.3, transparent: true, opacity: 0.55 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#3C86BF', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
    bank: new THREE.MeshStandardMaterial({ color: '#D9CDA6', roughness: 0.9 }),
    rail: plastic('#F4F1EA', { roughness: 0.35 }),
    lanes: Array.from({ length: LANE_COUNT }, () => plastic(GREY, { roughness: 0.45, clearcoat: 0.3 })),
    tiles: Object.fromEntries(Object.keys(SQUARE_STYLE).map((t) => [t, plastic(SQUARE_STYLE[t].color, { roughness: 0.32, clearcoat: 0.75 })])),
  };
}

// ---------------------------------------------------------------- roads

function buildRoads(group, M) {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (const [s0, s1] of roadIntervals(lane)) {
      const frames = laneFrames(lane, s0, s1);
      group.add(flat(strip(frames, ROAD_WIDTH / 2 + 0.17, Y.edge + lane * 0.0015), M.lanes[lane]));
      group.add(flat(strip(frames, ROAD_WIDTH / 2 + 0.05, Y.line), M.line));
      group.add(flat(strip(frames, ROAD_WIDTH / 2 - 0.02, Y.asphalt, 0.5), M.asphalt));
    }
  }
}

// ---------------------------------------------------------------- squares

const labelCache = {};

function tileLabel(type) {
  if (labelCache[type]) return labelCache[type];
  const st = SQUARE_STYLE[type];
  const S = 256;
  const { c, ctx } = canvas(S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = st.ink;
  const FONT = 'Bitter, Georgia, serif';
  if (st.glyph === 'stop') {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      ctx.lineTo(S / 2 + Math.cos(a) * 64, S * 0.42 + Math.sin(a) * 64);
    }
    ctx.closePath();
    ctx.fillStyle = '#C8321E';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `900 40px ${FONT}`;
    ctx.fillText('ALTO', S / 2, S * 0.43);
    ctx.fillStyle = st.ink;
  } else if (st.glyph) {
    ctx.font = `900 ${st.glyph.length > 2 ? 86 : 128}px ${FONT}`;
    ctx.fillText(st.glyph, S / 2, S * 0.43);
  }
  if (st.word) {
    ctx.font = `700 ${st.word.length > 8 ? 30 : 36}px ${FONT}`;
    ctx.fillText(st.word, S / 2, S * 0.84);
  }
  const tex = toTexture(c, { anisotropy: 8 });
  labelCache[type] = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
  return labelCache[type];
}

function readableYaw(heading) {
  const step = Math.PI / 2;
  let best = 0;
  let bestAbs = Infinity;
  for (let m = -4; m <= 4; m++) {
    const yaw = heading - Math.PI / 2 + m * step;
    const w = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    if (Math.abs(w) < bestAbs) {
      bestAbs = Math.abs(w);
      best = w;
    }
  }
  return best;
}

// A raised plastic block that bends with the road.
// A curved tile block with a chamfer round its top edge, so every edge catches
// a highlight. The top ring is inset by the chamfer both across and along the lane.
function tileGeometry(lane, s, L, halfW) {
  const CH = 0.016;
  const n = Math.max(2, Math.ceil(L / 0.06) + 1);
  const ring = (s0, s1) =>
    Array.from({ length: n }, (_, i) => {
      const { p, normal } = laneAt(lane, s0 + ((s1 - s0) * i) / (n - 1));
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
  // Quad a-b-c-d, wound so its normal points along `out`.
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

function buildSquares(group, M) {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (let k = 1; k < LANE_LENGTH; k++) {
      if (crossingAt(lane, k)) continue;
      const type = LANES[lane][k];
      const s = LANE_GEO[lane].arcs[k];
      const L = squareLength(lane, k);
      const halfW = ROAD_WIDTH / 2 - 0.09;
      const tile = new THREE.Mesh(tileGeometry(lane, s, L, halfW), M.tiles[type]);
      tile.castShadow = true;
      tile.receiveShadow = true;
      group.add(tile);

      const { pos, heading } = laneSquare(lane, k);
      const size = Math.min(L, halfW * 2) * 0.86;
      const yaw = readableYaw(heading);
      if (type !== 'libre') {
        const g = new THREE.PlaneGeometry(size, size);
        g.rotateX(-Math.PI / 2);
        g.rotateY(yaw);
        g.translate(pos.x, Y.label, pos.z);
        group.add(flat(g, tileLabel(type)));
      }
      const off = new THREE.Vector3(-size * 0.42, 0, -size * 0.42).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      group.add(
        textAt(String(k), pos.x + off.x, pos.z + off.z, {
          size: size * 0.16,
          weight: 700,
          color: type === 'multa' ? '#FFFFFF' : '#3A4170',
          rot: -yaw,
          y: Y.label + 0.001,
        }),
      );
    }
  }
}

// ---------------------------------------------------------------- roundabouts

function ringSector(r0, r1, a0, a1, y) {
  const g = new THREE.RingGeometry(r0, r1, Math.max(4, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 72)), 1, a0, a1 - a0);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

// Raised curb segment (an annular sector with height).
function curbSector(r0, r1, a0, a1, h, y) {
  const shape = new THREE.Shape();
  const n = Math.max(6, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 96));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const fn = i ? 'lineTo' : 'moveTo';
    shape[fn](Math.cos(a) * r1, Math.sin(a) * r1);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    shape.lineTo(Math.cos(a) * r0, Math.sin(a) * r0);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  g.translate(0, y + h, 0);
  return g;
}

// Angles (in the board's x/z plane, as used by RingGeometry after rotateX(-π/2)) of every road entry.
function entryAngles(c) {
  const centre = crossingCenter(c.id);
  const R = crossingRadius(c.id);
  const out = [];
  for (const lane of c.lanes) {
    const s = LANE_GEO[lane].arcs[c.index];
    for (const dir of [-1, 1]) {
      const { p } = laneAt(lane, s + dir * (R + 0.2));
      out.push(Math.atan2(-(p.z - centre.z), p.x - centre.x));
    }
  }
  return out.sort((a, b) => a - b);
}

function buildRoundabouts(group, M) {
  for (const c of CROSSINGS) {
    const centre = crossingCenter(c.id);
    const R = crossingRadius(c.id);
    const local = new THREE.Group();
    local.position.set(centre.x, 0, centre.z);

    const disc = new THREE.CircleGeometry(R + 0.04, 72);
    disc.rotateX(-Math.PI / 2);
    disc.translate(0, Y.disc, 0);
    const uv = disc.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * R, uv.getY(i) * R);
    local.add(flat(disc, M.asphalt));

    // Curb between the road entries, like a real roundabout.
    const entries = entryAngles(c);
    const gap = (ROAD_WIDTH / 2 + 0.22) / R;
    for (let i = 0; i < entries.length; i++) {
      const a0 = entries[i] + gap;
      let a1 = entries[(i + 1) % entries.length] - gap;
      if (i === entries.length - 1) a1 += Math.PI * 2;
      if (a1 - a0 < 0.05) continue;
      const curb = new THREE.Mesh(curbSector(R + 0.04, R + 0.2, a0, a1, 0.07, Y.edge), M.curb);
      curb.castShadow = true;
      curb.receiveShadow = true;
      local.add(curb);
      local.add(flat(ringSector(R + 0.2, R + 0.34, a0, a1, Y.edge + 0.004), M.gold));
    }

    // Dashed lane line around the island.
    const rl = R * 0.66;
    const dashes = 22;
    for (let i = 0; i < dashes; i++) {
      const a = (i / dashes) * Math.PI * 2;
      local.add(flat(ringSector(rl - 0.025, rl + 0.025, a, a + (Math.PI * 2) / dashes / 2, Y.ring), M.paint));
    }

    // Central island: raised navy disc with a gold rim.
    const island = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.53, 0.09, 48), M.navy);
    island.position.y = Y.disc + 0.045;
    island.castShadow = true;
    island.receiveShadow = true;
    local.add(island);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 48), M.gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = Y.disc + 0.09;
    local.add(rim);
    group.add(local);
    group.add(textAt(String(c.id), centre.x, centre.z + 0.06, { size: 0.5, weight: 900, color: UBA.gold, y: Y.disc + 0.092 }));
    group.add(textAt('CRUCE', centre.x, centre.z - 0.26, { size: 0.12, weight: 900, color: '#FFFFFF', y: Y.disc + 0.092, spacing: 0.01 }));

    // Zebra crossings on every entry, stripes parallel to the traffic.
    for (const lane of c.lanes) {
      const s = LANE_GEO[lane].arcs[c.index];
      for (const dir of [-1, 1]) {
        const a = s + dir * (R + 0.1);
        const b = s + dir * (R + 0.42);
        const frames = laneFrames(lane, Math.min(a, b), Math.max(a, b), 0.05);
        const bars = 5;
        const span = ROAD_WIDTH - 0.3;
        for (let i = 0; i < bars; i++) {
          const off = -span / 2 + ((i + 0.5) * span) / bars;
          group.add(flat(strip(frames, span / bars / 2 - 0.04, Y.marks, 1, off), M.paint));
        }
      }
    }
  }
}

// ---------------------------------------------------------------- start circles

function buildStarts(group, M) {
  const dynamic = new THREE.Group();
  dynamic.userData.dynamic = true;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const { pos } = laneSquare(lane, 0);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(START_RADIUS, START_RADIUS + 0.03, 0.06, 64), M.lanes[lane]);
    ring.position.set(pos.x, Y.plate, pos.z);
    ring.castShadow = true;
    ring.receiveShadow = true;
    group.add(ring);
    const paper = new THREE.CircleGeometry(START_RADIUS - 0.16, 64);
    paper.rotateX(-Math.PI / 2);
    paper.translate(pos.x, Y.plate + 0.031, pos.z);
    group.add(flat(paper, M.paper));
    const inner = new THREE.CircleGeometry(START_RADIUS - 0.28, 64);
    inner.rotateX(-Math.PI / 2);
    inner.translate(pos.x, Y.plate + 0.033, pos.z);
    group.add(flat(inner, M.navy));
    group.add(textAt('SALIDA', pos.x, pos.z - 0.42, { size: 0.2, weight: 900, color: UBA.gold, y: Y.plate + 0.035, spacing: 0.02 }));
  }
  group.add(dynamic);
  return dynamic;
}

export function paintStartNames(dynamic, roster) {
  for (const child of [...dynamic.children]) {
    dynamic.remove(child);
    child.geometry.dispose();
  }
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const t = roster.find((x) => x.lane === lane && x.enabled);
    if (!t) continue;
    const { pos } = laneSquare(lane, 0);
    const name = t.nombre.toUpperCase();
    dynamic.add(textAt(name, pos.x, pos.z + 0.44, { size: name.length > 12 ? 0.11 : 0.15, weight: 700, color: '#FFFFFF', y: Y.plate + 0.035 }));
  }
}

// ---------------------------------------------------------------- meta avenue

function buildMeta(group, M) {
  const frames = curveFrames(META_LINE, 260);
  group.add(flat(strip(frames, META_HALF, Y.avenue), M.gold));
  const ends = Array.from({ length: LANE_COUNT }, (_, l) => laneAt(l, LANE_GEO[l].length - META_HALF).p);
  const navyCells = [];
  const whiteCells = [];
  const cell = 0.22;
  let s = 0;
  let idx = 0;
  for (let i = 1; i < frames.length; i++) {
    s += frames[i].p.distanceTo(frames[i - 1].p);
    if (s < cell) continue;
    s = 0;
    const f = frames[i];
    for (const [row, off] of [
      [0, META_HALF - cell / 2],
      [1, META_HALF - cell * 1.5],
      [0, -META_HALF + cell / 2],
      [1, -META_HALF + cell * 1.5],
    ]) {
      const front = off > 0;
      const p = f.p.clone().addScaledVector(f.n, off);
      if (front && ends.some((e) => Math.abs(e.x - p.x) < ROAD_WIDTH / 2 + 0.2)) continue;
      ((idx + row) % 2 ? navyCells : whiteCells).push({ p, f });
    }
    idx++;
  }
  const cellsGeo = (cells) => {
    const pos = [];
    const uv = [];
    const ids = [];
    for (const { p, f } of cells) {
      const t = new THREE.Vector3(f.n.z, 0, -f.n.x);
      const h = cell / 2;
      const b = pos.length / 3;
      for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        pos.push(p.x + t.x * a * h + f.n.x * c * h, Y.avenue + 0.002, p.z + t.z * a * h + f.n.z * c * h);
        uv.push(0, 0);
      }
      ids.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
    }
    return geometryFrom(pos, uv, ids);
  };
  group.add(flat(cellsGeo(navyCells), M.navy));
  group.add(flat(cellsGeo(whiteCells), M.paint));

  // Each road meets the avenue at a checkered finish line.
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const end = LANE_GEO[lane].length - META_HALF;
    const rows = [end - 0.3, end - 0.15];
    rows.forEach((r, ri) => {
      const frames2 = laneFrames(lane, r, r + 0.15, 0.15);
      const cols = 6;
      for (let j = 0; j < cols; j++) {
        const off = -ROAD_WIDTH / 2 + 0.04 + ((j + 0.5) * (ROAD_WIDTH - 0.08)) / cols;
        group.add(flat(strip(frames2, (ROAD_WIDTH - 0.08) / cols / 2, Y.marks, 1, off), (j + ri) % 2 ? M.navy : M.paint));
      }
    });
  }

  const path = META_LINE.map((p) => ({ x: p.x, z: p.z }));
  const arcAtX = (x) => {
    let s2 = 0;
    for (let i = 1; i < path.length; i++) {
      const d = Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
      if (path[i].x >= x) return s2 + d * ((x - path[i - 1].x) / (path[i].x - path[i - 1].x));
      s2 += d;
    }
    return s2;
  };
  const xs = ends.map((e) => e.x).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 0; i < xs.length - 1; i++) gaps.push((xs[i] + xs[i + 1]) / 2);
  for (const x of gaps) {
    const centre = Math.abs(x) < 3;
    group.add(textMesh(centre ? 'META · PALACIO DE JUSTICIA' : 'META', { path, at: arcAtX(x), size: centre ? 0.5 : 0.56, weight: 900, color: UBA.navy, y: Y.avenue + 0.004, spacing: 0.03 }));
  }
}

// ---------------------------------------------------------------- river and bridges

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
    if (path[i].x > -1.6) break;
    s += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  }
  group.add(textMesh('RIACHUELO', { path, at: s, size: 0.46, weight: 700, italic: true, color: '#EAF5FB', y: Y.water + 0.003, spacing: 0.08 }));
}

function buildBridges(group, M) {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const { length } = LANE_GEO[lane];
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i <= 800; i++) {
      const s = (i / 800) * length;
      const { p } = laneAt(lane, s);
      const d = riverDistance(p.x, p.z);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (bestD > 0.4) continue;
    const half = RIVER_WIDTH / 2 + 0.55;
    for (const side of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const { p, normal } = laneAt(lane, best - half + (2 * half * i) / 16);
        pts.push(p.clone().addScaledVector(normal, side * (ROAD_WIDTH / 2 + 0.24)).setY(0.22));
      }
      const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.045, 8, false), M.rail);
      rail.castShadow = true;
      group.add(rail);
      for (let i = 0; i <= 4; i++) {
        const q = pts[Math.round((i / 4) * 16)];
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 10), M.rail);
        post.position.set(q.x, 0.11, q.z);
        post.castShadow = true;
        group.add(post);
      }
      const deck = laneFrames(lane, best - half, best + half, 0.08);
      group.add(flat(strip(deck, 0.09, Y.edge + 0.012, 1, side * (ROAD_WIDTH / 2 + 0.24)), M.rail));
    }
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
  const FONT = 'Bitter, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = UBA.goldLight;
  ctx.font = `900 ${0.78 * ppu}px ${FONT}`;
  ctx.fillText('JURISPRUDENCIA', (w / 2) * ppu, 0.95 * ppu);
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${0.62 * ppu}px ${FONT}`;
  ctx.fillText('EN RUTA', (w / 2) * ppu, 1.78 * ppu);
  ctx.fillStyle = UBA.sky;
  ctx.font = `italic 400 ${0.26 * ppu}px ${FONT}`;
  ctx.fillText('Facultad de Derecho · Universidad de Buenos Aires', (w / 2) * ppu, 2.62 * ppu);
  const tex = toTexture(c, { anisotropy: 16 });
  const g = new THREE.PlaneGeometry(w, h);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, Y.plate, (z0 + z1) / 2);
  group.add(flat(g, new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.4, clearcoat: 0.6 })));
}

// ---------------------------------------------------------------- public

export function buildRoadNetwork(roster) {
  const group = new THREE.Group();
  const M = makeMaterials();
  buildRiver(group, M);
  buildBridges(group, M);
  buildRoads(group, M);
  buildSquares(group, M);
  buildRoundabouts(group, M);
  const names = buildStarts(group, M);
  buildMeta(group, M);
  buildCartouche(group);
  const api = {
    group,
    recolor(r) {
      M.lanes.forEach((mat, lane) => {
        const t = r.find((x) => x.lane === lane && x.enabled);
        mat.color.set(t ? t.color : GREY);
      });
      paintStartNames(names, r);
    },
  };
  api.recolor(roster);
  return api;
}

export { CRUCES };
