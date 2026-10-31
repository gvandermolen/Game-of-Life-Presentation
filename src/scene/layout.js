import * as THREE from 'three';
import { CROSSINGS, CRUCES, LANE_COUNT, LANE_LENGTH, LANE_POSITIONS, crossingAt, crossingById } from '../engine/board.js';

// World layout. Each team has its own winding road from a start circle at the
// front edge to the meta line at the back. Roads weave like a braid and cross
// each other exactly at the crossing squares (8, 18, 27).

export const BOARD = { width: 46.5, depth: 34, height: 1.1 };
export const ROAD_WIDTH = 1.3;
export const SPINNER_POS = new THREE.Vector3(0, 0, -0.6);
export const SPINNER_CLEARANCE = 3.4;
export const COURTHOUSE_POS = new THREE.Vector3(0, 0, -15.0);

const COLS = [-18.8, -12.9, -7.2, 7.2, 12.9, 18.8];
const Z_START = 14.3;
const Z_LEVELS = [7.4, -0.6, -8.4];
const Z_META = -12.9;
const BUMP = 1.5;

// Smooth, invertible domain warp: makes the lattice organic without adding crossings.
export function warp(x, z) {
  return [x + 1.1 * Math.sin(z * 0.33 + 0.6), z + 0.7 * Math.sin(x * 0.27 + 1.3)];
}

function crossingGeometry(c) {
  const xs = c.positions.map((p) => COLS[p]);
  const halfDx = (Math.max(...xs) - Math.min(...xs)) / 2;
  const x = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { x, z: Z_LEVELS[c.level], d: Math.min(3.8, Math.max(2.2, halfDx * 0.8)) };
}

const CROSS_GEO = new Map(CROSSINGS.map((c) => [c.id, crossingGeometry(c)]));

// Control points for one lane (unwarped), with the point index of each anchor square.
// `bump` is the sideways swing of the S-bends between crossings.
function controlPoints(lane, bump) {
  const P = LANE_POSITIONS[lane];
  const pts = [];
  const anchors = [];
  const push = (x, z) => pts.push([x, z]);
  const anchor = (k, x, z) => {
    anchors.push({ k, i: pts.length });
    push(x, z);
  };

  anchor(0, COLS[P[0]], Z_START);
  let col = COLS[P[0]];
  let fromZ = Z_START;
  let first = true;

  const span = (toZ, segment) => {
    const len = fromZ - toZ;
    if (len < 1.0) {
      push(col, (fromZ + toZ) / 2);
      return;
    }
    if (!first) push(col, fromZ);
    if (len > 1.6) push(col + Math.min(bump, len * 0.6) * (segment % 2 ? -1 : 1), (fromZ + toZ) / 2);
    push(col, toZ);
  };

  for (let level = 0; level < 3; level++) {
    const g = CROSS_GEO.get(crossingAt(lane, CRUCES[level]));
    span(g.z + g.d, level);
    first = false;
    anchor(CRUCES[level], g.x, g.z);
    col = COLS[P[level + 1]];
    fromZ = g.z - g.d;
  }
  const len = fromZ - Z_META;
  if (len > 1.0) push(col, fromZ);
  anchor(LANE_LENGTH, col, Z_META);
  return { pts, anchors };
}

const END_WEIGHT = 1.55;

function buildLane(lane, bump) {
  const { pts, anchors } = controlPoints(lane, bump);
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, z]) => {
      const [wx, wz] = warp(x, z);
      return new THREE.Vector3(wx, 0, wz);
    }),
    false,
    'centripetal',
  );
  const DIV = 4000;
  curve.arcLengthDivisions = DIV;
  const lengths = curve.getLengths(DIV);
  const total = lengths[DIV];
  const n = pts.length - 1;
  const uOf = (i) => lengths[Math.round((i / n) * DIV)] / total;

  const stations = new Array(LANE_LENGTH + 1);
  for (let a = 0; a < anchors.length - 1; a++) {
    const A = anchors[a];
    const B = anchors[a + 1];
    const uA = uOf(A.i);
    const uB = uOf(B.i);
    const steps = B.k - A.k;
    const w = Array.from({ length: steps }, (_, j) => (j === 0 || j === steps - 1 ? END_WEIGHT : 1));
    const sum = w.reduce((x, y) => x + y, 0);
    let acc = 0;
    stations[A.k] = uA;
    for (let j = 0; j < steps; j++) {
      acc += w[j];
      stations[A.k + j + 1] = uA + ((uB - uA) * acc) / sum;
    }
  }
  return { curve, stations, length: total };
}

// Short roads get wider S-bends so every road has a similar square spacing.
const TARGET_LENGTH = 42;
export const LANE_GEO = Array.from({ length: LANE_COUNT }, (_, lane) => {
  let geo = buildLane(lane, BUMP);
  for (let b = BUMP + 0.25; geo.length < TARGET_LENGTH && b <= 3.2; b += 0.25) geo = buildLane(lane, b);
  return geo;
});

const _t = new THREE.Vector3();

export function laneFrame(lane, u) {
  const { curve } = LANE_GEO[lane];
  const p = curve.getPointAt(u);
  curve.getTangentAt(u, _t);
  const tangent = new THREE.Vector3(_t.x, 0, _t.z).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
  return { p, tangent, normal };
}

export function headingOf(tangent) {
  return Math.atan2(-tangent.z, tangent.x);
}

// Centre of a square, plus its heading.
export function laneSquare(lane, k) {
  const id = crossingAt(lane, k);
  const { p, tangent, normal } = laneFrame(lane, LANE_GEO[lane].stations[k]);
  const pos = id ? crossingCenter(id) : p;
  return { pos, tangent, normal, heading: headingOf(tangent) };
}

// Length of a square along its road.
export function squareLength(lane, k) {
  const st = LANE_GEO[lane].stations;
  const L = LANE_GEO[lane].length;
  const a = st[Math.max(0, k - 1)];
  const c = st[Math.min(LANE_LENGTH, k + 1)];
  const prev = k > 0 ? (st[k] - a) * L : Infinity;
  const next = k < LANE_LENGTH ? (c - st[k]) * L : Infinity;
  return Math.max(0.75, Math.min(1.25, Math.min(prev, next) - 0.08));
}

export function crossingCenter(id) {
  const g = CROSS_GEO.get(id);
  const [x, z] = warp(g.x, g.z);
  return new THREE.Vector3(x, 0, z);
}

export function crossingRadius(id) {
  return crossingById(id).lanes.length > 2 ? 1.55 : 1.3;
}

// Meta line across the back of the board.
export const META_LINE = Array.from({ length: 60 }, (_, i) => {
  const x = -21.5 + (43 * i) / 59;
  const [wx, wz] = warp(x, Z_META);
  return new THREE.Vector3(wx, 0, wz);
});

// Road samples for "keep decorations off the road" checks.
export const ROAD_SAMPLES = LANE_GEO.flatMap(({ curve }) => Array.from({ length: 360 }, (_, i) => curve.getPointAt(i / 359)));

export function distanceToRoads(x, z) {
  let best = Infinity;
  for (const p of ROAD_SAMPLES) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) best = d;
  }
  for (const p of META_LINE) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
