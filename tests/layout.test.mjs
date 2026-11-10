import test from 'node:test';
import assert from 'node:assert/strict';

import { CARS, LANE_POS, LANE_SQUARES, LAP_POS, LAP_SQUARES } from '../src/engine/flow.js';
import {
  BARRIER_S,
  BOARD,
  BRANCHES,
  CAR_GAP,
  DESTINO_LINE,
  DESTINO_S,
  ENTRY,
  GAME_HALF,
  INICIO_LINE,
  INICIO_S,
  LANES,
  LANE_GAP,
  LANE_TILE,
  LANES_HALF,
  MAIN,
  PASS_OFFSET,
  PATHS,
  RIVER_WIDTH,
  ROAD_WIDTH,
  SPINNER_CLEARANCE,
  SPINNER_POS,
  TAPER,
  ZONES,
  boardHalf,
  distanceToRoads,
  forkRoute,
  forkSlot,
  freeSide,
  passingLane,
  riverDistance,
  squareS,
  zoneLabelAt,
} from '../src/scene/layout.js';
import { CONTENT_AT, LAP, LAP_STEP, LAP_TILE, LAP_ZONES, lapDistance, lapS, zoneSignAt } from '../src/scene/lap.js';

const range = (n, from = 0) => Array.from({ length: n }, (_, i) => from + i);
const samples = (path, step = 0.2) => range(Math.ceil(path.length / step) + 1).map((i) => path.at(Math.min(path.length, i * step)).p);

// Diameter of a game piece on the board (base radius 0.54 at the game scale).
const PIECE = 2 * 0.54 * 1.05;

test('19 squares on one road, in order, with a visible gap between tiles; square 20 is Destino', () => {
  for (const k of range(LANE_SQUARES - 2, 1)) {
    const gap = squareS(k + 1) - squareS(k) - LANE_TILE.length;
    assert.ok(gap >= 0.6, `squares ${k}-${k + 1} gap ${gap.toFixed(2)}`);
  }
  assert.ok(squareS(LANE_SQUARES - 1) + LANE_TILE.length / 2 < DESTINO_LINE - 2, 'square 19 before Destino opens');
  assert.equal(squareS(LANE_SQUARES), DESTINO_S);
  assert.ok(DESTINO_LINE + 0.6 < DESTINO_S && DESTINO_S < MAIN.length, 'cars at Destino past the line');
});

test('one car wide on the squares; four side by side at Inicio and Destino', () => {
  assert.ok(INICIO_S > TAPER, 'road still opening at Inicio');
  assert.ok(INICIO_S + PIECE / 2 < INICIO_LINE, 'car on the Inicio line');
  assert.ok(INICIO_LINE + 0.3 < squareS(1) - LANE_TILE.length / 2, 'Inicio line on square 1');
  assert.ok(LANE_GAP > PIECE + 0.15, `places ${LANE_GAP} for pieces ${PIECE.toFixed(2)}`);
  for (const s of [INICIO_S, DESTINO_S]) {
    for (const c of range(CARS - 1)) {
      const d = LANES[c].at(s).p.distanceTo(LANES[c + 1].at(s).p);
      assert.ok(d > PIECE + 0.1, `places ${c}-${c + 1} at ${s.toFixed(1)}: ${d.toFixed(2)}`);
    }
    assert.ok(LANES[0].at(s).p.distanceTo(MAIN.at(s).p) + PIECE / 2 < boardHalf(s), 'outer car on the asphalt');
  }
  for (const k of range(LANE_SQUARES - 1, 1)) {
    for (const c of range(CARS)) assert.ok(LANES[c].at(squareS(k)).p.distanceTo(MAIN.at(squareS(k)).p) < 0.01, `car ${c} centred on square ${k}`);
  }
});

test('a car passing a parked one steps aside without touching it, and is back on line at its square', () => {
  assert.ok(PASS_OFFSET > PIECE + 0.05, `pass offset ${PASS_OFFSET} for pieces ${PIECE.toFixed(2)}`);
  const parked = squareS(8);
  const lane = passingLane(3, squareS(5), squareS(11), [parked, squareS(12), squareS(4)]);
  assert.deepEqual(lane.passing, [parked], 'only the cars in between');
  for (let s = squareS(5); s <= squareS(11); s += 0.05) {
    assert.ok(lane.at(s).p.distanceTo(MAIN.at(parked).p) > PIECE, `touches the parked car at ${s.toFixed(2)}`);
  }
  for (const k of [5, 11]) assert.ok(lane.at(squareS(k)).p.distanceTo(MAIN.at(squareS(k)).p) < 0.01, `off its square ${k}`);
  assert.ok(PASS_OFFSET + PIECE / 2 < GAME_HALF + 0.5, 'passing stays near the asphalt');
});

test('card squares are on the road, and props have a free side everywhere', () => {
  for (const [c, list] of LANE_POS.entries()) for (const k of list) assert.ok(k >= 1 && k <= LANE_SQUARES, `car ${c} square ${k}`);
  for (const k of range(LANE_SQUARES - 1, 1)) assert.ok([1, -1].includes(freeSide(squareS(k))));
});

test('reading and accepting lead into every lane; negotiating is a dead end', () => {
  const start = ENTRY.at(ENTRY.length).p;
  for (const b of Object.values(BRANCHES)) assert.ok(b.at(0).p.distanceTo(start) < 0.05);
  for (const k of ['leer', 'aceptar']) assert.ok(BRANCHES[k].at(BRANCHES[k].length).p.distanceTo(MAIN.at(0).p) < 0.05, `${k} misses the board`);
  const end = BRANCHES.negociar.at(BARRIER_S).p;
  const nearest = Math.min(...samples(MAIN).map((p, i) => p.distanceTo(end) - boardHalf(i * 0.2)));
  assert.ok(nearest > 1, `negotiating road ends on the board (${nearest.toFixed(2)})`);
});

test('fork routes are continuous where the paths join, for every lane', () => {
  for (const k of ['negociar', 'leer', 'aceptar']) {
    for (const c of range(CARS)) {
      const r = forkRoute(k, c);
      for (let u = 0.05; u < r.length; u += 0.05) {
        const d = r.at(u).p.distanceTo(r.at(u - 0.05).p);
        assert.ok(d < 0.09, `${k} lane ${c} jumps at ${u.toFixed(2)}`);
      }
    }
  }
});

test('cars waiting at the fork stay on the entry road, a car apart', () => {
  for (const c of range(CARS)) assert.ok(forkSlot(c) > 0.3 && forkSlot(c) < ENTRY.length, `fork slot ${c}`);
});

test('roads stay on the board and clear of the spinner', () => {
  const check = (name, p, half) => {
    assert.ok(Math.abs(p.x) < BOARD.width / 2 - half - 0.3, `${name} off board x=${p.x.toFixed(2)}`);
    assert.ok(Math.abs(p.z) < BOARD.depth / 2 - half - 0.3, `${name} off board z=${p.z.toFixed(2)}`);
    const d = Math.hypot(p.x - SPINNER_POS.x, p.z - SPINNER_POS.z);
    assert.ok(d > SPINNER_CLEARANCE + half, `${name} hits the spinner d=${d.toFixed(2)}`);
  };
  for (const path of [...PATHS.filter((p) => p !== MAIN), LAP]) for (const p of samples(path)) check(path.name, p, ROAD_WIDTH / 2);
  samples(MAIN).forEach((p, i) => check('tablero', p, boardHalf(i * 0.2)));
});

const closeToItself = (path, half, step = 0.25) => {
  const S = samples(path, step);
  const bad = [];
  for (let i = 0; i < S.length; i++) {
    for (let j = i + 1; j < S.length; j++) {
      if ((j - i) * step < half * 6) continue;
      if (S[i].distanceTo(S[j]) < 2 * half + 0.4) bad.push(`(${S[i].x.toFixed(1)}, ${S[i].z.toFixed(1)})`);
    }
  }
  return bad;
};

test('neither road runs next to itself', () => {
  assert.deepEqual(closeToItself(MAIN, LANES_HALF).slice(0, 3), []);
  assert.deepEqual(closeToItself(LAP, ROAD_WIDTH / 2).slice(0, 3), []);
});

test('the board keeps clear of the river', () => {
  samples(MAIN).forEach((p, i) => {
    assert.ok(riverDistance(p.x, p.z) > RIVER_WIDTH / 2 + boardHalf(i * 0.2) + 0.4, `board on the river at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
  });
});

// A tile folds over itself when a lane bends tighter than half its width.
test('no road or lane bends tighter than a tile is wide', () => {
  const tight = [];
  const check = (path, half, from = 0.1) => {
    for (let s = from; s < path.length - 0.1; s += 0.05) {
      const a = path.at(s - 0.05).tangent;
      const b = path.at(s + 0.05).tangent;
      const radius = 0.1 / Math.max(1e-6, Math.acos(Math.min(1, a.dot(b))));
      if (radius < half) tight.push(`${path.name} at ${s.toFixed(2)} (radius ${radius.toFixed(2)})`);
    }
  };
  for (const path of [...PATHS, LAP]) check(path, ROAD_WIDTH / 2);
  check(MAIN, LANE_TILE.width / 2 + 0.05, squareS(1) - LANE_TILE.length);
  assert.deepEqual(tight.slice(0, 5), []);
});

test('zone names stand off the board', () => {
  for (const z of ZONES) {
    const p = zoneLabelAt(z);
    assert.ok(distanceToRoads(p.x, p.z) > ROAD_WIDTH / 2 + 0.3, `${z.label} on a road`);
    assert.ok(riverDistance(p.x, p.z) > RIVER_WIDTH / 2 + 0.3, `${z.label} on the river`);
  }
});

test('lap: 40 squares of one size with gaps, content squares where the spins land', () => {
  assert.ok(LAP_STEP - LAP_TILE.length >= 0.3, `lap gap ${(LAP_STEP - LAP_TILE.length).toFixed(2)}`);
  assert.equal(CONTENT_AT.size, 13);
  assert.deepEqual([...CONTENT_AT.keys()], LAP_POS.slice(0, 13));
  assert.ok(lapS(LAP_SQUARES) < LAP.length);
});

test('lap zones cover the 40 squares in order, with their signs off the road', () => {
  assert.equal(LAP_ZONES[0].from, 1);
  assert.equal(LAP_ZONES.at(-1).to, LAP_SQUARES);
  for (let i = 1; i < LAP_ZONES.length; i++) assert.equal(LAP_ZONES[i].from, LAP_ZONES[i - 1].to + 1);
  assert.deepEqual(
    LAP_ZONES.map((z) => z.to),
    [18, 29, 40],
  );
  for (const z of LAP_ZONES.slice(1)) {
    const { pos } = zoneSignAt(z);
    assert.ok(lapDistance(pos.x, pos.z) > ROAD_WIDTH / 2 + 0.3, `${z.label} sign on the road`);
  }
});
