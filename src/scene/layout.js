import * as THREE from 'three';
import { CARS, LANE_SQUARES } from '../engine/flow.js';

// World layout of the game. The road leaves the Facultad de Derecho at the
// front-left, crosses the Riachuelo and splits in three at the fork (negotiate,
// read, accept). The two roads that lead somewhere merge into the board, which
// opens into four parallel lanes, one per car, from Inicio round the spinner to
// Destino in front of home. The lap of the explanation has its own road
// (lap.js); both share the board, the river and the Facultad.

export const BOARD = { width: 46.5, depth: 34, height: 1.1 };
export const ROAD_WIDTH = 2.0;
export const TILE = { length: 2.4, width: ROAD_WIDTH - 0.28 };
export const CAR_GAP = 1.6;
export const SPINNER_POS = new THREE.Vector3(-2.5, 0, -1.5);
export const SPINNER_CLEARANCE = 3.4;

// Lanes of the board.
export const LANE_GAP = 1.45;
export const LANE_TILE = { length: 2.0, width: LANE_GAP - 0.3 };
export const LANES_HALF = (CARS * LANE_GAP) / 2;
// Distance over which the lanes fan out from the single road.
export const TAPER = 4.6;

const FILLET = 3.2;

const S = [-17.5, 15.0];
const F = [-17.5, 8.6];
const STEM = [-17.5, 7.3];
const I = [-14.6, -2.8];

export const SALIDA_POS = new THREE.Vector3(S[0], 0, S[1]);
export const SALIDA_RADIUS = 1.35;

// Corners of a control polygon become circular arcs, as large as the legs allow.
export function fillet(points, radius) {
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

// Centre line of the four lanes, round the spinner.
export const MAIN = new Path('tablero', [I, [-14.6, -11.2], [11.5, -11.2], [11.5, 5.9], [-6.2, 5.9]], 4.6);

const smooth = (x) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

// How far the lanes have opened at s (0 at the merge, 1 once fully apart).
export function spread(s) {
  return smooth(s / TAPER);
}

export function laneOffset(c, s) {
  return (c - (CARS - 1) / 2) * LANE_GAP * spread(s);
}

// Half width of the asphalt of the board at s.
export function boardHalf(s) {
  return ROAD_WIDTH / 2 + (LANES_HALF - ROAD_WIDTH / 2) * spread(s);
}

// One car's lane: the centre line shifted sideways. Arc length is measured on
// the centre line, so the same s is the same square in every lane.
export class Lane {
  constructor(c) {
    this.c = c;
    this.name = `carril ${c + 1}`;
    this.length = MAIN.length;
  }

  point(s) {
    const f = MAIN.at(s);
    return f.p.addScaledVector(f.normal, laneOffset(this.c, s));
  }

  at(s) {
    const t = Math.min(this.length, Math.max(0, s));
    const p = this.point(t);
    const a = this.point(Math.max(0, t - 0.05));
    const b = this.point(Math.min(this.length, t + 0.05));
    const tangent = b.sub(a).setY(0).normalize();
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

export const LANES = Array.from({ length: CARS }, (_, c) => new Lane(c));

// Barrier at the dead end of the negotiating road.
export const BARRIER_S = BRANCHES.negociar.length - 0.35;

// The gantry with the three road signs spans the branches just past the split.
export const GANTRY_Z = 4.7;

// Cars wait at the fork in a column on the entry road, the next one in front.
export function forkSlot(i) {
  return ENTRY.length - 0.95 - i * CAR_GAP;
}

// Where the cars wait in their lanes before the Inicio line.
export const INICIO_S = TAPER + 0.7;
export const INICIO_LINE = INICIO_S + 1.15;
const FIRST = INICIO_LINE + 1.45;
const LEAD_OUT = 3.6;
export const SQUARE_STEP = (MAIN.length - FIRST - LEAD_OUT) / (LANE_SQUARES - 1);
export const DESTINO_LINE = FIRST + (LANE_SQUARES - 1) * SQUARE_STEP + SQUARE_STEP / 2 + 0.2;
export const DESTINO_S = MAIN.length - 1.1;

// Arc length of square k (1..20), the same in every lane.
export function squareS(k) {
  return FIRST + (k - 1) * SQUARE_STEP;
}

export const DESTINO_POS = (() => {
  const { p, tangent } = MAIN.at(MAIN.length);
  return p.clone().addScaledVector(tangent, 3.1);
})();

// "DESTINO" is painted on the ground in front of home, towards the audience.
export const DESTINO_LABEL = DESTINO_POS.clone().add(new THREE.Vector3(0, 0, 2.75));

// Three coloured stretches of road, like the lap.
export const ZONES = [
  { id: 'embarco', label: 'EMBARCO', from: 1, to: 6, color: '#91BDE1' },
  { id: 'viaje', label: 'VIAJE', from: 7, to: 13, color: '#F7A600' },
  { id: 'desembarco', label: 'DESEMBARCO', from: 14, to: 20, color: '#3BC3AD' },
];

export function zoneRange(z) {
  const half = SQUARE_STEP / 2;
  return [squareS(z.from) - half, squareS(z.to) + half];
}

// Centre lines in drawing order. The board is drawn as one wide road.
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

// The route car c follows for a fork choice: negotiating is a dead end, the
// other two roads lead into its lane.
export function forkRoute(choice, c = 0) {
  return choice === 'negociar' ? new Route([ENTRY, BRANCHES.negociar]) : new Route([ENTRY, BRANCHES[choice], LANES[c]]);
}

// Road samples with the local half width, for "keep decorations off the road".
function samplesOf(path, half) {
  const n = Math.ceil(path.length / 0.25);
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = (i / n) * path.length;
    const { p } = path.at(s);
    return { x: p.x, z: p.z, h: half(s) };
  });
}

// Distance from a point to the nearest road edge, plus half a standard road, so
// `distance > ROAD_WIDTH / 2 + margin` reads the same for narrow and wide roads.
export function roadDistance(samples) {
  return (x, z) => {
    let best = Infinity;
    for (const p of samples) {
      const d = Math.hypot(p.x - x, p.z - z) - p.h;
      if (d < best) best = d;
    }
    return best + ROAD_WIDTH / 2;
  };
}

export const ROAD_SAMPLES = [
  ...[ENTRY, BRANCHES.negociar, BRANCHES.leer, BRANCHES.aceptar].flatMap((p) => samplesOf(p, () => ROAD_WIDTH / 2)),
  ...samplesOf(MAIN, boardHalf),
];

export const distanceToRoads = roadDistance(ROAD_SAMPLES);

// The Riachuelo runs across the front of the board.
export const RIVER_WIDTH = 1.15;
export const RIVER = Array.from({ length: 90 }, (_, i) => {
  const x = -BOARD.width / 2 - 0.2 + ((BOARD.width + 0.4) * i) / 89;
  return new THREE.Vector3(x, 0, 11.3 + 0.75 * Math.sin(x * 0.3 + 0.5));
});

export function riverDistance(x, z) {
  let best = Infinity;
  for (const p of RIVER) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
  return best;
}

// Zone names sit beside their stretch: outside the lanes, or inside where the
// outside runs along the river.
export function zoneLabelAt(zone) {
  const mid = (squareS(zone.from) + squareS(zone.to)) / 2;
  const f = MAIN.at(mid);
  const out = f.p.clone().addScaledVector(f.normal, -(LANES_HALF + 0.95));
  if (riverDistance(out.x, out.z) > RIVER_WIDTH / 2 + 0.9) return out;
  return f.p.clone().addScaledVector(f.normal, LANES_HALF + 0.95);
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
