import * as THREE from 'three';
import { CARS, SQUARES } from '../engine/flow.js';

// World layout. One road for everyone: it leaves the Facultad de Derecho at the
// front-left, crosses the Riachuelo, splits in three at the fork (negotiate,
// read, accept), and the two roads that lead somewhere merge into the board: a
// single loop of 16 squares around the spinner that ends at home.

export const BOARD = { width: 46.5, depth: 34, height: 1.1 };
export const ROAD_WIDTH = 2.0;
export const TILE = { length: 2.4, width: ROAD_WIDTH - 0.28 };
export const CAR_GAP = 1.6;
export const SPINNER_POS = new THREE.Vector3(-2.5, 0, -1.5);
export const SPINNER_CLEARANCE = 3.4;

const FILLET = 3.2;

const S = [-17.5, 15.0];
const F = [-17.5, 8.6];
const STEM = [-17.5, 7.3];
const I = [-14.6, -2.8];

export const SALIDA_POS = new THREE.Vector3(S[0], 0, S[1]);
export const SALIDA_RADIUS = 1.35;

// Corners of a control polygon become circular arcs, as large as the legs allow.
function fillet(points, radius) {
  const out = [];
  const put = (x, z) => {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - x, last[1] - z) > 0.02) out.push([x, z]);
  };
  const line = (a, b) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2));
    for (let j = 0; j <= n; j++) put(a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n);
  };
  let prevEnd = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const A = points[i - 1];
    const P = points[i];
    const B = points[i + 1];
    const d1 = Math.hypot(P[0] - A[0], P[1] - A[1]);
    const d2 = Math.hypot(B[0] - P[0], B[1] - P[1]);
    const u1 = [(P[0] - A[0]) / d1, (P[1] - A[1]) / d1];
    const u2 = [(B[0] - P[0]) / d2, (B[1] - P[1]) / d2];
    const turn = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    const avail1 = i === 1 ? d1 : d1 / 2;
    const avail2 = i === points.length - 2 ? d2 : d2 / 2;
    const t = Math.min(radius * Math.tan(turn / 2), avail1, avail2);
    if (turn < 1e-3 || t < 1e-3) {
      line(prevEnd, P);
      prevEnd = P;
      continue;
    }
    const r = t / Math.tan(turn / 2);
    const s = Math.sign(u1[0] * u2[1] - u1[1] * u2[0]);
    const a = [P[0] - u1[0] * t, P[1] - u1[1] * t];
    const c = [a[0] - u1[1] * s * r, a[1] + u1[0] * s * r];
    line(prevEnd, a);
    const steps = Math.max(2, Math.ceil((turn * r) / 0.1));
    const vx = a[0] - c[0];
    const vz = a[1] - c[1];
    for (let j = 0; j <= steps; j++) {
      const phi = (s * turn * j) / steps;
      put(c[0] + vx * Math.cos(phi) - vz * Math.sin(phi), c[1] + vx * Math.sin(phi) + vz * Math.cos(phi));
    }
    prevEnd = out[out.length - 1];
  }
  line(prevEnd, points[points.length - 1]);
  return out;
}

const _t = new THREE.Vector3();

export function headingOf(tangent) {
  return Math.atan2(-tangent.z, tangent.x);
}

export class Path {
  constructor(name, points, radius = FILLET) {
    this.name = name;
    this.control = points;
    const dense = fillet(points, radius);
    this.curve = new THREE.CatmullRomCurve3(dense.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    this.curve.arcLengthDivisions = 6000;
    this.length = this.curve.getLength();
  }

  // Point, tangent, left-hand normal and heading at arc length s.
  at(s) {
    const u = Math.min(1, Math.max(0, s / this.length));
    const p = this.curve.getPointAt(u);
    this.curve.getTangentAt(u, _t);
    const tangent = new THREE.Vector3(_t.x, 0, _t.z).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    return { p, tangent, normal, heading: headingOf(tangent) };
  }

  frames(s0, s1, step = 0.12) {
    const n = Math.max(2, Math.ceil(Math.abs(s1 - s0) / step) + 1);
    return Array.from({ length: n }, (_, i) => {
      const { p, normal } = this.at(s0 + ((s1 - s0) * i) / (n - 1));
      return { p, n: normal };
    });
  }
}

export const ENTRY = new Path('entrada', [S, F]);

export const BRANCHES = {
  negociar: new Path('negociar', [F, STEM, [-20.4, 4.4], [-20.4, 1.7]], 2.4),
  leer: new Path('leer', [F, STEM, [-17.5, 2.6], [-14.6, -0.3], I], 2.4),
  aceptar: new Path('aceptar', [F, STEM, [-14.6, 4.4], I], 2.4),
};

export const MAIN = new Path('tablero', [I, [-14.6, -8.6], [9.5, -8.6], [9.5, 5.6], [-8.6, 5.6]]);

// Barrier at the dead end of the negotiating road.
export const BARRIER_S = BRANCHES.negociar.length - 0.35;

// The gantry with the three road signs spans the branches just past the split.
export const GANTRY_Z = 4.7;

// Cars wait at the fork in a column on the entry road, car 1 in front.
export function forkSlot(i) {
  return ENTRY.length - 0.95 - i * CAR_GAP;
}

// After the fork the cars queue on the first stretch of the board.
export const QUEUE_FRONT = 0.9 + (CARS - 1) * CAR_GAP;
export function queueSlot(i) {
  return QUEUE_FRONT - i * CAR_GAP;
}

const FIRST = QUEUE_FRONT + 2.5;
const LEAD_OUT = 1.3 + (CARS - 1) * CAR_GAP + 2.5;
export const SQUARE_STEP = (MAIN.length - FIRST - LEAD_OUT) / (SQUARES - 1);

// Arc length of square k (1..16) along the board.
export function squareS(k) {
  return FIRST + (k - 1) * SQUARE_STEP;
}

// At home the car that arrives first (from the last square) parks furthest in.
export function destinoSlot(c) {
  return MAIN.length - 1.3 - (CARS - 1 - c) * CAR_GAP;
}

export const DESTINO_POS = (() => {
  const { p, tangent } = MAIN.at(MAIN.length);
  return p.clone().addScaledVector(tangent, 2.1);
})();

// Three coloured stretches of road, like the explanatory lap.
export const ZONES = [
  { id: 'embarco', label: 'EMBARCO', from: 1, to: 5, color: '#91BDE1' },
  { id: 'viaje', label: 'VIAJE', from: 6, to: 11, color: '#F7A600' },
  { id: 'desembarco', label: 'DESEMBARCO', from: 12, to: 16, color: '#3BC3AD' },
];

export function zoneRange(z) {
  const half = SQUARE_STEP / 2;
  return [squareS(z.from) - half, squareS(z.to) + half];
}

// Paths in drawing order, with the route a car follows for each fork choice.
export const PATHS = [ENTRY, BRANCHES.negociar, BRANCHES.leer, BRANCHES.aceptar, MAIN];

// Several paths joined end to end; u is the distance along the whole route.
export class Route {
  constructor(paths) {
    this.paths = paths;
    this.offsets = [];
    let total = 0;
    for (const p of paths) {
      this.offsets.push(total);
      total += p.length;
    }
    this.length = total;
  }

  at(u) {
    let i = this.paths.length - 1;
    while (i > 0 && u < this.offsets[i]) i--;
    return this.paths[i].at(u - this.offsets[i]);
  }

  offsetOf(path) {
    return this.offsets[this.paths.indexOf(path)];
  }
}

export function forkRoute(choice) {
  return choice === 'negociar' ? new Route([ENTRY, BRANCHES.negociar]) : new Route([ENTRY, BRANCHES[choice], MAIN]);
}

// Road samples for "keep decorations off the road" checks.
export const ROAD_SAMPLES = PATHS.flatMap((path) => {
  const n = Math.ceil(path.length / 0.25);
  return Array.from({ length: n + 1 }, (_, i) => path.at((i / n) * path.length).p);
});

export function distanceToRoads(x, z) {
  let best = Infinity;
  for (const p of ROAD_SAMPLES) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// Square centre and frame.
export function squareFrame(k) {
  return MAIN.at(squareS(k));
}

// Side of the road (+1 along the normal, -1 against it) facing away from the
// audience, so the title plaques stand behind their square and never hide it.
// Along the right-hand side of the loop that is the outside.
function awaySide(normal) {
  if (normal.z < -0.3) return 1;
  if (normal.z > 0.3) return -1;
  return normal.x > 0 ? 1 : -1;
}

export const PLAQUE_OFFSET = ROAD_WIDTH / 2 + 0.75;

export function plaqueAt(k) {
  const f = squareFrame(k);
  const side = awaySide(f.normal);
  return { pos: f.p.clone().addScaledVector(f.normal, side * PLAQUE_OFFSET), side, frame: f };
}

// Zone names sit on the other side of the road from the plaques.
export function zoneLabelAt(zone) {
  const mid = (squareS(zone.from) + squareS(zone.to)) / 2;
  const f = MAIN.at(mid);
  const side = -awaySide(f.normal);
  return f.p.clone().addScaledVector(f.normal, side * (ROAD_WIDTH / 2 + 0.75));
}

// Point where a road crosses the line z = const (the gantry spans the branches there).
export function pathCrossingZ(path, z) {
  let best = null;
  const n = Math.ceil(path.length / 0.05);
  for (let i = 0; i <= n; i++) {
    const { p } = path.at((i / n) * path.length);
    if (!best || Math.abs(p.z - z) < Math.abs(best.z - z)) best = p;
  }
  return best;
}
