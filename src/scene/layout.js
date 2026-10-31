import * as THREE from 'three';
import { LANE_COUNT, LANE_LENGTH, CRUCES } from '../engine/board.js';

// World layout of the board. Units are roughly "centimetres / 2" of a real board.
// The road is a horseshoe around the central spinner; lanes run in parallel and
// share full-width bands at the start, at each cruce and at the meta.

export const BOARD = { width: 46, depth: 33, height: 1.1 };
export const LANE_SPACING = 1.0;
export const ROAD_HALF = (LANE_COUNT / 2) * LANE_SPACING + 0.35;
export const BAND_LENGTH = 2.3;
export const SPINNER_POS = new THREE.Vector3(1.2, 0, -0.4);

const PATH = [
  [-18.5, 12.2],
  [-19.0, 5.0],
  [-18.2, -2.5],
  [-15.2, -9.0],
  [-9.0, -11.8],
  [-2.5, -10.6],
  [3.5, -12.0],
  [10.0, -12.2],
  [16.0, -9.6],
  [19.0, -3.6],
  [19.0, 3.8],
  [16.2, 9.6],
  [10.2, 12.2],
  [4.6, 12.4],
];

export const curve = new THREE.CatmullRomCurve3(
  PATH.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  'centripetal',
);
curve.arcLengthDivisions = 2000;

const isBand = (k) => k === 0 || k === LANE_LENGTH || CRUCES.includes(k);

// Normalised curve parameter (0..1) for each square index.
export const STATIONS = (() => {
  const s = [0];
  for (let k = 1; k <= LANE_LENGTH; k++) {
    const gap = isBand(k) || isBand(k - 1) ? 1.3 : 1;
    s.push(s[k - 1] + gap);
  }
  const start = 0.012;
  const end = 0.958;
  return s.map((v) => start + (v / s[LANE_LENGTH]) * (end - start));
})();

export function isBandIndex(k) {
  return isBand(k);
}

export function laneOffset(lane) {
  return (lane - (LANE_COUNT - 1) / 2) * LANE_SPACING;
}

const _t = new THREE.Vector3();

export function frameAt(u) {
  const p = curve.getPointAt(u);
  curve.getTangentAt(u, _t);
  const tangent = new THREE.Vector3(_t.x, 0, _t.z).normalize();
  // Right-hand normal on the ground plane.
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
  return { p, tangent, normal };
}

export function headingOf(tangent) {
  return Math.atan2(-tangent.z, tangent.x);
}

// Centre of a square in a lane, plus its heading.
export function laneSquare(lane, k) {
  const { p, tangent, normal } = frameAt(STATIONS[k]);
  const pos = p.clone().addScaledVector(normal, laneOffset(lane));
  return { pos, tangent, normal, heading: headingOf(tangent) };
}

export function bandFrame(k) {
  const { p, tangent, normal } = frameAt(STATIONS[k]);
  return { pos: p, tangent, normal, heading: headingOf(tangent) };
}

// Tile size for a lane square, so tiles never overlap on the inside of curves.
export function tileSize(lane, k) {
  const a = laneSquare(lane, Math.max(0, k - 1)).pos;
  const b = laneSquare(lane, k).pos;
  const c = laneSquare(lane, Math.min(LANE_LENGTH, k + 1)).pos;
  const step = Math.min(a.distanceTo(b) || 99, c.distanceTo(b) || 99);
  return { width: LANE_SPACING * 0.84, length: Math.max(0.7, Math.min(1.35, step - 0.42)) };
}

// Samples of the centreline, for "keep decorations off the road" checks.
export const ROAD_SAMPLES = Array.from({ length: 260 }, (_, i) => curve.getPointAt(i / 259));

export function distanceToRoad(x, z) {
  let best = Infinity;
  for (const p of ROAD_SAMPLES) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

export const MERGE_COUNT = CRUCES.length;
