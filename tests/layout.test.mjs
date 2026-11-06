import test from 'node:test';
import assert from 'node:assert/strict';

import { CARS, SQUARES } from '../src/engine/flow.js';
import {
  BARRIER_S,
  BOARD,
  BRANCHES,
  CAR_GAP,
  ENTRY,
  MAIN,
  PATHS,
  ROAD_WIDTH,
  SPINNER_CLEARANCE,
  SPINNER_POS,
  TILE,
  destinoSlot,
  distanceToRoads,
  forkRoute,
  forkSlot,
  plaqueAt,
  queueSlot,
  squareS,
} from '../src/scene/layout.js';

const range = (n, from = 0) => Array.from({ length: n }, (_, i) => from + i);
const samples = (path, step = 0.2) => range(Math.ceil(path.length / step) + 1).map((i) => path.at(Math.min(path.length, i * step)).p);

test('16 squares in order along the board road, with a visible gap between tiles', () => {
  for (const k of range(SQUARES - 1, 1)) {
    const gap = squareS(k + 1) - squareS(k) - TILE.length;
    assert.ok(gap >= 0.2, `squares ${k}-${k + 1} gap ${gap.toFixed(2)}`);
  }
  assert.ok(squareS(SQUARES) + TILE.length / 2 < MAIN.length, 'last square runs off the road');
});

test('waiting cars never stand on a square', () => {
  const firstEdge = squareS(1) - TILE.length / 2;
  const lastEdge = squareS(SQUARES) + TILE.length / 2;
  for (const c of range(CARS)) {
    assert.ok(queueSlot(c) > 0.3, `queue slot ${c} before the road`);
    assert.ok(queueSlot(c) + 0.6 < firstEdge, `queue slot ${c} on square 1`);
    assert.ok(destinoSlot(c) - 0.6 > lastEdge, `home slot ${c} on square 16`);
    assert.ok(forkSlot(c) > 0.3 && forkSlot(c) < ENTRY.length, `fork slot ${c} off the entry road`);
  }
  for (const c of range(CARS - 1)) assert.ok(queueSlot(c) - queueSlot(c + 1) >= CAR_GAP - 1e-9);
});

test('reading and accepting lead onto the board; negotiating is a dead end', () => {
  const start = ENTRY.at(ENTRY.length).p;
  for (const b of Object.values(BRANCHES)) assert.ok(b.at(0).p.distanceTo(start) < 0.05);
  for (const k of ['leer', 'aceptar']) assert.ok(BRANCHES[k].at(BRANCHES[k].length).p.distanceTo(MAIN.at(0).p) < 0.05, `${k} misses the board`);
  const end = BRANCHES.negociar.at(BARRIER_S).p;
  const nearest = Math.min(...samples(MAIN).map((p) => p.distanceTo(end)));
  assert.ok(nearest > ROAD_WIDTH, `negotiating road ends on the board road (${nearest.toFixed(2)})`);
});

test('fork routes are continuous where the paths join', () => {
  for (const k of ['negociar', 'leer', 'aceptar']) {
    const r = forkRoute(k);
    for (let u = 0.05; u < r.length; u += 0.05) {
      const d = r.at(u).p.distanceTo(r.at(u - 0.05).p);
      assert.ok(d < 0.08, `${k} jumps at ${u.toFixed(2)}`);
    }
  }
});

test('roads stay on the board and clear of the spinner', () => {
  for (const path of PATHS) {
    for (const p of samples(path)) {
      assert.ok(Math.abs(p.x) < BOARD.width / 2 - ROAD_WIDTH / 2 - 0.3, `${path.name} off board x=${p.x.toFixed(2)}`);
      assert.ok(Math.abs(p.z) < BOARD.depth / 2 - ROAD_WIDTH / 2 - 0.3, `${path.name} off board z=${p.z.toFixed(2)}`);
      const d = Math.hypot(p.x - SPINNER_POS.x, p.z - SPINNER_POS.z);
      assert.ok(d > SPINNER_CLEARANCE + ROAD_WIDTH / 2, `${path.name} hits the spinner d=${d.toFixed(2)}`);
    }
  }
});

test('the board road never runs next to itself', () => {
  const S = samples(MAIN, 0.25);
  for (let i = 0; i < S.length; i++) {
    for (let j = i + 1; j < S.length; j++) {
      if ((j - i) * 0.25 < ROAD_WIDTH * 3) continue;
      assert.ok(S[i].distanceTo(S[j]) > ROAD_WIDTH + 0.4, `board road touches itself at (${S[i].x.toFixed(1)}, ${S[i].z.toFixed(1)})`);
    }
  }
});

test('title plaques stand off every road', () => {
  for (const k of range(SQUARES, 1)) {
    const { pos } = plaqueAt(k);
    const d = distanceToRoads(pos.x, pos.z);
    assert.ok(d > ROAD_WIDTH / 2 + 0.4, `plaque ${k} on a road (${d.toFixed(2)})`);
  }
});

// A tile folds over itself when the road bends tighter than half its width.
test('no road bends tighter than a tile is wide', () => {
  const half = ROAD_WIDTH / 2;
  const tight = [];
  for (const path of PATHS) {
    for (let s = 0.1; s < path.length - 0.1; s += 0.05) {
      const a = path.at(s - 0.05).tangent;
      const b = path.at(s + 0.05).tangent;
      const radius = 0.1 / Math.max(1e-6, Math.acos(Math.min(1, a.dot(b))));
      if (radius < half) tight.push(`${path.name} at ${s.toFixed(2)} (radius ${radius.toFixed(2)})`);
    }
  }
  assert.deepEqual(tight, []);
});
