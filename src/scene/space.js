import { BOARD, DESTINO_LABEL, DESTINO_POS, GANTRY_Z, RIVER, RIVER_WIDTH, ROAD_WIDTH, SALIDA_POS, SALIDA_RADIUS, SPINNER_POS, ZONES, distanceToRoads, riverDistance, zoneLabelAt } from './layout.js';
import { LAP_FLAG_POS, LAP_ZONES, lapDistance, zoneSignAt } from './lap.js';

// Shared furniture positions and, for each of the two worlds (the lap and the
// game), the "is this spot free for a prop?" test.

export { RIVER, RIVER_WIDTH, riverDistance };

const W = BOARD.width;
const D = BOARD.depth;

export const CARTOUCHE = { x0: -5.2, x1: 5.2, z0: 13.0, z1: 16.3 };
export const FACULTAD = { x: -11.4, z: 14.8, x0: -14.5, x1: -8.3, z0: 12.9, z1: 16.7 };
export const GANTRY = { x0: -23, x1: -12, z0: GANTRY_Z - 0.7, z1: GANTRY_Z + 0.7 };
export const CASA_RADIUS = 2.3;

const inRect = (r, x, z, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;

export class Space {
  constructor({ roads, reserved = [], rects = [] }) {
    this.distanceToRoads = roads;
    this.reserved = reserved;
    this.rects = rects;
  }

  isFree(x, z, r, { road = 0.35, river = 0.6 } = {}) {
    if (Math.abs(x) > W / 2 - 0.6 - r || Math.abs(z) > D / 2 - 0.6 - r) return false;
    if (Math.hypot(x - SPINNER_POS.x, z - SPINNER_POS.z) < 3.6 + r) return false;
    if (inRect(CARTOUCHE, x, z, r + 0.3) || inRect(FACULTAD, x, z, r + 0.2)) return false;
    if (this.rects.some((rect) => inRect(rect, x, z, r))) return false;
    if (river !== null && riverDistance(x, z) < RIVER_WIDTH / 2 + river + r) return false;
    for (const c of this.reserved) if (Math.hypot(c.x - x, c.z - z) < c.r + r) return false;
    return this.distanceToRoads(x, z) > ROAD_WIDTH / 2 + road + r;
  }
}

const SALIDA = { x: SALIDA_POS.x, z: SALIDA_POS.z, r: SALIDA_RADIUS + 0.2 };

export const GAME_SPACE = new Space({
  roads: distanceToRoads,
  rects: [GANTRY],
  reserved: [
    ...ZONES.map((z) => {
      const p = zoneLabelAt(z);
      return { x: p.x, z: p.z, r: 1.6 };
    }),
    { x: DESTINO_POS.x, z: DESTINO_POS.z, r: CASA_RADIUS },
    { x: DESTINO_LABEL.x - 0.9, z: DESTINO_LABEL.z, r: 0.75 },
    { x: DESTINO_LABEL.x + 0.9, z: DESTINO_LABEL.z, r: 0.75 },
    SALIDA,
  ],
});

export const LAP_SPACE = new Space({
  roads: lapDistance,
  reserved: [
    ...LAP_ZONES.slice(1).map((z) => {
      const { pos } = zoneSignAt(z);
      return { x: pos.x, z: pos.z, r: 0.9 };
    }),
    { x: LAP_FLAG_POS.x, z: LAP_FLAG_POS.z, r: 1.2 },
    SALIDA,
  ],
});
