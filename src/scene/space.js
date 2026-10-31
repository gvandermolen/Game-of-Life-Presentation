import * as THREE from 'three';
import { CROSSINGS, LANE_COUNT } from '../engine/board.js';
import { BOARD, ROAD_WIDTH, SPINNER_POS, crossingCenter, crossingRadius, distanceToRoads, laneSquare } from './layout.js';

// Shared furniture positions and the "is this spot free for a prop?" test.

const W = BOARD.width;
const D = BOARD.depth;

export const RIVER_WIDTH = 1.15;
export const RIVER = Array.from({ length: 90 }, (_, i) => {
  const x = -W / 2 - 0.2 + ((W + 0.4) * i) / 89;
  return new THREE.Vector3(x, 0, 11.3 + 0.75 * Math.sin(x * 0.3 + 0.5));
});

export const CARTOUCHE = { x0: -5.2, x1: 5.2, z0: 13.0, z1: 16.3 };
export const COURT_PLAZA = { x0: -5.6, x1: 5.6, z0: -17, z1: -14.1 };

export function riverDistance(x, z) {
  let best = Infinity;
  for (const p of RIVER) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
  return best;
}

const inRect = (r, x, z, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;

const _v = new THREE.Vector3();

export function isFree(x, z, r, { road = 0.35, river = 0.6 } = {}) {
  if (Math.abs(x) > W / 2 - 0.6 - r || Math.abs(z) > D / 2 - 0.6 - r) return false;
  if (Math.hypot(x - SPINNER_POS.x, z - SPINNER_POS.z) < 3.6 + r) return false;
  if (inRect(CARTOUCHE, x, z, r + 0.3) || inRect(COURT_PLAZA, x, z, r + 0.3)) return false;
  if (river !== null && riverDistance(x, z) < RIVER_WIDTH / 2 + river + r) return false;
  _v.set(x, 0, z);
  for (const c of CROSSINGS) if (crossingCenter(c.id).distanceTo(_v) < crossingRadius(c.id) + 0.5 + r) return false;
  for (let lane = 0; lane < LANE_COUNT; lane++) if (laneSquare(lane, 0).pos.distanceTo(_v) < 1.25 + r) return false;
  return distanceToRoads(x, z) > ROAD_WIDTH / 2 + road + r;
}
