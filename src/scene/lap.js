import * as THREE from 'three';
import { VUELTA, ZONAS } from '../content/guion.js';
import { LAP_POS, LAP_SQUARES } from '../engine/flow.js';
import { Path, ROAD_WIDTH, SALIDA_POS, roadDistance } from './layout.js';

// The road of the explanatory lap: it leaves the same Salida in front of the
// Facultad, crosses the Riachuelo and winds through town with 40 squares. Only
// 13 carry a slide, but all of them look the same (a number and a drawing), so
// the spins seem random. Square 40 is Destino.

export const LAP = new Path(
  'vuelta',
  [
    [SALIDA_POS.x, SALIDA_POS.z],
    [-17.5, 7.4],
    [-8.2, 7.4],
    [-8.2, 3.9],
    [4.8, 3.9],
    [4.8, 7.4],
    [17.6, 7.4],
    [17.6, -1.4],
    [8.2, -1.4],
    [8.2, -11.4],
    [-14.4, -11.4],
  ],
  2.4,
);

export const LAP_TILE = { length: 1.55, width: ROAD_WIDTH - 0.3 };

const FIRST = 2.2;
const LEAD_OUT = 1.6;
export const LAP_STEP = (LAP.length - FIRST - LEAD_OUT) / (LAP_SQUARES - 1);

// Arc length of lap square k (1..40). Square 0 is the Salida.
export function lapS(k) {
  return k <= 0 ? 0.25 : FIRST + (k - 1) * LAP_STEP;
}

// Content square n (1..13) of each lap position, or 0 for a passing square.
export const CONTENT_AT = new Map(LAP_POS.slice(0, VUELTA.length).map((pos, i) => [pos, i + 1]));

// Zones by lap square: each one runs from just after the previous zone's last
// content square to its own last one.
export const LAP_ZONES = ZONAS.map((z, i) => ({
  id: z.id,
  label: z.nombre.toUpperCase(),
  color: z.color,
  from: i ? LAP_POS[ZONAS[i - 1].hasta - 1] + 1 : 1,
  to: i === ZONAS.length - 1 ? LAP_SQUARES : LAP_POS[z.hasta - 1],
}));

export function lapZoneRange(z) {
  const half = LAP_STEP / 2;
  return [lapS(z.from) - half, z.to === LAP_SQUARES ? LAP.length : lapS(z.to) + half];
}

// Road signs at the start of each zone, on the outer side of the road.
export function zoneSignAt(z) {
  const s = lapS(z.from) - LAP_STEP / 2;
  const f = LAP.at(s);
  const side = f.normal.z > 0.2 ? -1 : 1;
  return { pos: f.p.clone().addScaledVector(f.normal, side * (ROAD_WIDTH / 2 + 0.7)), frame: f, side };
}

export const LAP_FLAG_POS = (() => {
  const { p, tangent, normal } = LAP.at(LAP.length);
  return p.clone().addScaledVector(tangent, 0.6).addScaledVector(normal, ROAD_WIDTH / 2 + 0.5);
})();

const SAMPLES = (() => {
  const n = Math.ceil(LAP.length / 0.25);
  return Array.from({ length: n + 1 }, (_, i) => {
    const { p } = LAP.at((i / n) * LAP.length);
    return { x: p.x, z: p.z, h: ROAD_WIDTH / 2 };
  });
})();

export const lapDistance = roadDistance(SAMPLES);

export const LAP_DESTINO = new THREE.Vector3().copy(LAP.at(LAP.length).p);
