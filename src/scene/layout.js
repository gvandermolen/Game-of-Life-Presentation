import * as THREE from 'three';
import { CROSSINGS, CRUCES, LANE_COUNT, LANE_LENGTH, LANE_POSITIONS, crossingAt, crossingById } from '../engine/board.js';

// World layout. Each team has its own winding road from a start circle at the
// front edge to the meta line at the back. Roads weave like a braid and cross
// each other exactly at the crossing squares (8, 17, 25).

export const BOARD = { width: 46.5, depth: 34, height: 1.1 };
export const ROAD_WIDTH = 1.3;
export const SPINNER_POS = new THREE.Vector3(0, 0, -0.6);
export const SPINNER_CLEARANCE = 3.4;
export const COURTHOUSE_POS = new THREE.Vector3(0, 0, -15.55);

const COLS = [-18.8, -12.9, -7.2, 7.2, 12.9, 18.8];
const Z_START = 14.8;
const Z_LEVELS = [7.9, 0.2, -6.6];
const Z_META = -13.25;
const META_RUN = 1.5;
const FILLET_RADIUS = 1.4;
// Kept small: a strong shear would squash the rounded bends.
const WARP_X = 0.45;
const WARP_Z = 0.45;

// Smooth, gentle domain warp: takes the ruler-straight edge off the lattice.
// Near the meta avenue the sideways sway fades out and is replaced by a lean that
// keeps every road exactly perpendicular to the (gently curved) avenue.
export function warp(x, z) {
  const t = Math.min(1, Math.max(0, (z - Z_META) / 3.5));
  const f = t * t * (3 - 2 * t);
  const lean = (1 - f) * (z - Z_META) * WARP_Z * 0.27 * Math.cos(x * 0.27 + 1.3);
  return [x + WARP_X * Math.sin(z * 0.33 + 0.6) * f - lean, z + WARP_Z * Math.sin(x * 0.27 + 1.3)];
}

function crossingGeometry(c) {
  const xs = c.positions.map((p) => COLS[p]);
  const halfDx = (Math.max(...xs) - Math.min(...xs)) / 2;
  const x = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { x, z: Z_LEVELS[c.level], d: Math.min(2.8, Math.max(2.2, halfDx * 0.45)) };
}

const CROSS_GEO = new Map(CROSSINGS.map((c) => [c.id, crossingGeometry(c)]));

// Clear road (arc length) kept between an anchor and the nearest ordinary square.
export const START_RADIUS = 1.12;
export const META_HALF = 0.85;

// Straight road kept next to each anchor, so roads leave the start circle, enter
// roundabouts and meet the meta avenue head-on.
function anchorRun(lane, k) {
  if (k === 0) return START_RADIUS + 0.3;
  if (k === LANE_LENGTH) return META_RUN;
  return crossingRadius(crossingAt(lane, k)) + 0.5;
}

// Replace every corner of the control polygon (except anchors) with a circular
// arc, as large as the neighbouring legs allow. Returns dense points and the new
// index of each anchor.
function filletPath(lane, pts, anchors) {
  const runAt = new Map(anchors.map((a) => [a.i, anchorRun(lane, a.k)]));
  const clean = [];
  const remap = new Map();
  pts.forEach(([x, z], i) => {
    const last = clean[clean.length - 1];
    if (last && Math.hypot(last.x - x, last.z - z) < 0.05 && !runAt.has(i)) return;
    if (runAt.has(i)) remap.set(i, clean.length);
    clean.push({ x, z, run: runAt.get(i) });
  });
  const out = [];
  const outAnchor = new Map();
  const put = (p) => {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.02) out.push(p);
  };
  const line = (a, b) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2));
    for (let j = 1; j < n; j++) put({ x: a.x + ((b.x - a.x) * j) / n, z: a.z + ((b.z - a.z) * j) / n });
  };
  let minRadius = Infinity;
  let prevEnd = clean[0];
  out.push({ x: clean[0].x, z: clean[0].z });
  outAnchor.set(0, 0);
  for (let i = 1; i < clean.length; i++) {
    const P = clean[i];
    if (P.run !== undefined || i === clean.length - 1) {
      line(prevEnd, P);
      if (Math.hypot(out[out.length - 1].x - P.x, out[out.length - 1].z - P.z) <= 0.02) out.pop();
      outAnchor.set(i, out.length);
      out.push({ x: P.x, z: P.z });
      prevEnd = P;
      continue;
    }
    const A = clean[i - 1];
    const B = clean[i + 1];
    const d1 = Math.hypot(P.x - A.x, P.z - A.z);
    const d2 = Math.hypot(B.x - P.x, B.z - P.z);
    const u1 = { x: (P.x - A.x) / d1, z: (P.z - A.z) / d1 };
    const u2 = { x: (B.x - P.x) / d2, z: (B.z - P.z) / d2 };
    const turn = Math.acos(Math.max(-1, Math.min(1, u1.x * u2.x + u1.z * u2.z)));
    const avail1 = A.run !== undefined ? d1 - A.run : d1 / 2;
    const avail2 = B.run !== undefined ? d2 - B.run : d2 / 2;
    const t = Math.max(0, Math.min(FILLET_RADIUS * Math.tan(turn / 2), avail1, avail2));
    if (turn > 0.05) minRadius = Math.min(minRadius, t / Math.tan(turn / 2));
    if (turn < 1e-3 || t < 1e-3) {
      line(prevEnd, P);
      put({ x: P.x, z: P.z });
      prevEnd = P;
      continue;
    }
    const r = t / Math.tan(turn / 2);
    const s = Math.sign(u1.x * u2.z - u1.z * u2.x);
    const a = { x: P.x - u1.x * t, z: P.z - u1.z * t };
    const c = { x: a.x - u1.z * s * r, z: a.z + u1.x * s * r };
    line(prevEnd, a);
    const steps = Math.max(2, Math.ceil((turn * r) / 0.08));
    const vx = a.x - c.x;
    const vz = a.z - c.z;
    for (let j = 0; j <= steps; j++) {
      const phi = (s * turn * j) / steps;
      put({ x: c.x + vx * Math.cos(phi) - vz * Math.sin(phi), z: c.z + vx * Math.sin(phi) + vz * Math.cos(phi) });
    }
    prevEnd = out[out.length - 1];
  }
  return {
    pts: out.map((p) => [p.x, p.z]),
    anchors: anchors.map((a) => ({ k: a.k, i: outAnchor.get(remap.get(a.i)) })),
    minRadius: Math.min(minRadius, FILLET_RADIUS),
  };
}
const GAP_START = START_RADIUS + 0.7;
const GAP_META = META_HALF + 0.75;
const gapCrossing = (id) => crossingRadius(id) + 0.95;

function anchorGap(lane, k) {
  if (k === 0) return GAP_START;
  if (k === LANE_LENGTH) return GAP_META;
  return gapCrossing(crossingAt(lane, k));
}

// Stretches between anchors (start, three roundabouts, meta). Each lane keeps to its
// own column between roundabouts; a stretch that needs more road for its squares
// snakes about that column as a serpentine of `m` zigs of half-width `a`.
function stretches(lane) {
  const P = LANE_POSITIONS[lane];
  const out = [];
  let A = { k: 0, x: COLS[P[0]], z: Z_START, d: 0.9 };
  for (let level = 0; level <= 3; level++) {
    const col = COLS[P[level]];
    let B;
    if (level < 3) {
      const g = CROSS_GEO.get(crossingAt(lane, CRUCES[level]));
      B = { k: CRUCES[level], x: g.x, z: g.z, d: g.d * 0.55, dStraight: g.d };
    } else {
      B = { k: LANE_LENGTH, x: col, z: Z_META, d: META_RUN + 1.0, lead: Z_META + META_RUN + 0.6 };
    }
    out.push({ A, B, col, seg: level });
    A = B;
  }
  return out;
}

function stretchVertices({ A, B, col, seg }, m, a, lane, flipped = false) {
  const zTop = A.z - (m === 0 && A.dStraight ? A.dStraight : A.d);
  const zBot = B.z + (m === 0 && B.dStraight ? B.dStraight : B.d);
  const pts = [];
  if (m === 0) {
    pts.push([col, zTop], [col, zBot]);
  } else {
    const dirIn = Math.abs(col - A.x) > 0.3 ? Math.sign(col - A.x) : 0;
    const dirOut = B.lead === undefined && Math.abs(B.x - col) > 0.3 ? Math.sign(B.x - col) : 0;
    const flip = m % 2 ? 1 : -1;
    const s1 = (dirIn || (dirOut ? -dirOut * flip : (lane + seg) % 2 ? 1 : -1)) * (flipped ? -1 : 1);
    for (let j = 1; j <= m; j++) {
      const side = j % 2 ? s1 : -s1;
      pts.push([col + side * a, zTop + ((zBot - zTop) * (j - 0.5)) / m]);
    }
  }
  if (B.lead !== undefined) pts.push([col, B.lead]);
  return pts;
}

function warpedLength(pts) {
  let total = 0;
  let prev = warp(...pts[0]);
  for (let i = 1; i < pts.length; i++) {
    const w = warp(...pts[i]);
    total += Math.hypot(w[0] - prev[0], w[1] - prev[1]);
    prev = w;
  }
  return total;
}

const MIN_SPACING = 1.0;
const MAX_ZIG = 2.5;

// Warped samples of a path, about every 0.25 units, with their arc length.
function sampled(pts) {
  const out = [];
  let s = 0;
  let prev = null;
  let lastKept = -Infinity;
  for (const p of pts) {
    const w = warp(...p);
    if (prev) s += Math.hypot(w[0] - prev[0], w[1] - prev[1]);
    if (s - lastKept >= 0.25) {
      out.push({ x: w[0], z: w[1], s });
      lastKept = s;
    }
    prev = w;
  }
  return { pts: out, length: s };
}

const CENTERS = CROSSINGS.map((c) => {
  const g = CROSS_GEO.get(c.id);
  const [x, z] = warp(g.x, g.z);
  return { id: c.id, lanes: c.lanes, x, z, r: crossingRadius(c.id) };
});
const STARTS = Array.from({ length: LANE_COUNT }, (_, l) => warp(COLS[LANE_POSITIONS[l][0]], Z_START));

// A stretch is usable if it keeps clear of roads already laid, other roundabouts,
// start circles, the spinner and the board edge.
function clearOf(lane, st, path, placed) {
  const gapA = anchorGap(lane, st.A.k);
  const gapB = anchorGap(lane, st.B.k);
  for (const p of path.pts) {
    if (Math.abs(p.x) > BOARD.width / 2 - ROAD_WIDTH / 2 - 0.5 || Math.abs(p.z) > BOARD.depth / 2 - ROAD_WIDTH / 2 - 0.5) return false;
    if (Math.hypot(p.x - SPINNER_POS.x, p.z - SPINNER_POS.z) < SPINNER_CLEARANCE + ROAD_WIDTH / 2 + 0.2) return false;
    const inner = p.s > gapA && p.s < path.length - gapB;
    if (inner) {
      for (const c of CENTERS) if (Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.95) return false;
      for (const [x, z] of STARTS) if (Math.hypot(p.x - x, p.z - z) < START_RADIUS + 0.7) return false;
    }
    for (const other of placed) {
      const shared = CENTERS.filter((c) => c.lanes.includes(lane) && c.lanes.includes(other.lane));
      if (shared.some((c) => Math.hypot(p.x - c.x, p.z - c.z) < c.r + 1.2)) continue;
      for (const q of other.pts) {
        if (shared.some((c) => Math.hypot(q.x - c.x, q.z - c.z) < c.r + 1.2)) continue;
        if ((p.x - q.x) ** 2 + (p.z - q.z) ** 2 < (ROAD_WIDTH + 0.3) ** 2) return false;
      }
    }
  }
  return true;
}

// Pick the serpentine with the gentlest curves that fits the stretch's squares
// without crowding anything already on the board.
function designStretch(st, lane, placed) {
  const count = st.B.k - st.A.k - 1;
  const gaps = anchorGap(lane, st.A.k) + anchorGap(lane, st.B.k);
  const cands = [];
  for (let m = 0; m <= 5; m++) {
    for (const flipped of m ? [false, true] : [false]) for (let a = m ? 0.4 : 0; a <= (m ? MAX_ZIG + 1e-6 : 0); a += 0.1) {
      const pts = [[st.A.x, st.A.z], ...stretchVertices(st, m, a, lane, flipped), [st.B.x, st.B.z]];
      const f = filletPath(lane, pts, [{ k: st.A.k, i: 0 }, { k: st.B.k, i: pts.length - 1 }]);
      const path = sampled(f.pts);
      const spacing = (path.length - gaps) / Math.max(1, count - 1);
      const score = spacing >= MIN_SPACING ? f.minRadius * 10 - m * a * 0.05 - (flipped ? 0.5 : 0) : spacing - 100;
      cands.push({ score, m, a, flipped, spacing, r: f.minRadius, path });
    }
  }
  cands.sort((x, y) => y.score - x.score);
  return cands.find((c) => clearOf(lane, st, c.path, placed)) || cands[0];
}

// Every lane's stretch for one band of the board is designed before the next band;
// within a band the lanes that need the most extra road choose first.
function designAll() {
  const sts = Array.from({ length: LANE_COUNT }, (_, lane) => stretches(lane));
  const designs = sts.map(() => []);
  const placed = [];
  for (let seg = 0; seg < 4; seg++) {
    const need = (lane) => {
      const st = sts[lane][seg];
      const count = st.B.k - st.A.k - 1;
      const pts = [[st.A.x, st.A.z], ...stretchVertices(st, 0, 0, lane), [st.B.x, st.B.z]];
      return anchorGap(lane, st.A.k) + anchorGap(lane, st.B.k) + (count - 1) * MIN_SPACING - sampled(pts).length;
    };
    const order = [...Array(LANE_COUNT).keys()].sort((x, y) => need(y) - need(x));
    for (const lane of order) {
      const d = designStretch(sts[lane][seg], lane, placed);
      designs[lane][seg] = d;
      placed.push({ lane, pts: d.path.pts });
    }
  }
  return { sts, designs };
}

const DESIGN = designAll();

function buildLane(lane) {
  const pts = [];
  const anchors = [];
  DESIGN.sts[lane].forEach((st, i) => {
    const { m, a, flipped } = DESIGN.designs[lane][i];
    if (i === 0) {
      anchors.push({ k: st.A.k, i: 0 });
      pts.push([st.A.x, st.A.z]);
    }
    pts.push(...stretchVertices(st, m, a, lane, flipped));
    anchors.push({ k: st.B.k, i: pts.length });
    pts.push([st.B.x, st.B.z]);
  });
  const dense = filletPath(lane, pts, anchors);
  const curve = new THREE.CatmullRomCurve3(
    dense.pts.map(([x, z]) => {
      const [wx, wz] = warp(x, z);
      return new THREE.Vector3(wx, 0, wz);
    }),
    false,
    'centripetal',
  );
  const DIV = 16000;
  curve.arcLengthDivisions = DIV;
  const lengths = curve.getLengths(DIV);
  const total = lengths[DIV];
  const n = dense.pts.length - 1;
  const arcOfPoint = (i) => lengths[Math.round((i / n) * DIV)];

  // Arc length of every square centre.
  const arcs = new Array(LANE_LENGTH + 1);
  const spacing = new Array(LANE_LENGTH + 1).fill(Infinity);
  const A_ = dense.anchors;
  for (let j = 0; j < A_.length - 1; j++) {
    const A = A_[j];
    const B = A_[j + 1];
    const sA = arcOfPoint(A.i);
    const sB = arcOfPoint(B.i);
    arcs[A.k] = sA;
    arcs[B.k] = sB;
    const m = B.k - A.k - 1;
    const s0 = sA + anchorGap(lane, A.k);
    const s1 = sB - anchorGap(lane, B.k);
    const step = m > 1 ? (s1 - s0) / (m - 1) : Infinity;
    for (let q = 0; q < m; q++) {
      arcs[A.k + 1 + q] = m > 1 ? s0 + step * q : (s0 + s1) / 2;
      spacing[A.k + 1 + q] = m > 1 ? step : s1 - s0;
    }
  }
  const stations = arcs.map((v) => v / total);
  return { curve, stations, arcs, spacing, length: total };
}

export const LANE_GEO = Array.from({ length: LANE_COUNT }, (_, lane) => buildLane(lane));

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
  return Math.max(0.7, Math.min(1.15, LANE_GEO[lane].spacing[k] - 0.14));
}

// Point and frame at an arc length along a lane.
export function laneAt(lane, s) {
  return laneFrame(lane, Math.min(1, Math.max(0, s / LANE_GEO[lane].length)));
}

// Arc intervals where a lane's road surface is drawn: from the start circle to the
// front edge of the meta avenue, interrupted inside each roundabout.
export function roadIntervals(lane) {
  const { arcs, length } = LANE_GEO[lane];
  const out = [];
  let from = 0;
  for (const k of CRUCES) {
    const R = crossingRadius(crossingAt(lane, k)) - 0.1;
    out.push([from, arcs[k] - R]);
    from = arcs[k] + R;
  }
  out.push([from, length - META_HALF + 0.04]);
  return out;
}

export function crossingCenter(id) {
  const g = CROSS_GEO.get(id);
  const [x, z] = warp(g.x, g.z);
  return new THREE.Vector3(x, 0, z);
}

export function crossingRadius(id) {
  return crossingById(id).lanes.length > 2 ? 1.65 : 1.35;
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
