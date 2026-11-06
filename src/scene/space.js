import * as THREE from 'three';
import { SQUARES } from '../engine/flow.js';
import { BOARD, DESTINO_POS, GANTRY_Z, ROAD_WIDTH, SALIDA_POS, SALIDA_RADIUS, SPINNER_POS, ZONES, distanceToRoads, plaqueAt, zoneLabelAt } from './layout.js';

// Shared furniture positions and the "is this spot free for a prop?" test.

const W = BOARD.width;
const D = BOARD.depth;

export const RIVER_WIDTH = 1.15;
export const RIVER = Array.from({ length: 90 }, (_, i) => {
  const x = -W / 2 - 0.2 + ((W + 0.4) * i) / 89;
  return new THREE.Vector3(x, 0, 11.3 + 0.75 * Math.sin(x * 0.3 + 0.5));
});

export const CARTOUCHE = { x0: -5.2, x1: 5.2, z0: 13.0, z1: 16.3 };
export const FACULTAD = { x: -11.4, z: 14.8, x0: -14.5, x1: -8.3, z0: 12.9, z1: 16.7 };
export const GANTRY = { x0: -23, x1: -12, z0: GANTRY_Z - 0.7, z1: GANTRY_Z + 0.7 };
export const CASA_RADIUS = 1.9;

export function riverDistance(x, z) {
  let best = Infinity;
  for (const p of RIVER) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
  return best;
}

const inRect = (r, x, z, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;

// Circles kept clear for the title plaques and the zone names.
export const RESERVED = [
  ...Array.from({ length: SQUARES }, (_, i) => {
    const { pos } = plaqueAt(i + 1);
    return { x: pos.x, z: pos.z, r: 1.2 };
  }),
  ...ZONES.map((z) => {
    const p = zoneLabelAt(z);
    return { x: p.x, z: p.z, r: 1.6 };
  }),
  { x: DESTINO_POS.x, z: DESTINO_POS.z, r: CASA_RADIUS },
  { x: SALIDA_POS.x, z: SALIDA_POS.z, r: SALIDA_RADIUS + 0.2 },
];

export function isFree(x, z, r, { road = 0.35, river = 0.6 } = {}) {
  if (Math.abs(x) > W / 2 - 0.6 - r || Math.abs(z) > D / 2 - 0.6 - r) return false;
  if (Math.hypot(x - SPINNER_POS.x, z - SPINNER_POS.z) < 3.6 + r) return false;
  if (inRect(CARTOUCHE, x, z, r + 0.3) || inRect(FACULTAD, x, z, r + 0.2) || inRect(GANTRY, x, z, r)) return false;
  if (river !== null && riverDistance(x, z) < RIVER_WIDTH / 2 + river + r) return false;
  for (const c of RESERVED) if (Math.hypot(c.x - x, c.z - z) < c.r + r) return false;
  return distanceToRoads(x, z) > ROAD_WIDTH / 2 + road + r;
}
