import test from 'node:test';
import assert from 'node:assert/strict';

import { CROSSINGS, CRUCES, LANE_COUNT, LANE_LENGTH, crossingAt } from '../src/engine/board.js';
import {
  BOARD,
  LANE_GEO,
  ROAD_WIDTH,
  SPINNER_CLEARANCE,
  SPINNER_POS,
  START_RADIUS,
  crossingCenter,
  crossingRadius,
  laneAt,
  laneSquare,
  roadIntervals,
  squareClashes,
  squareLength,
} from '../src/scene/layout.js';

const samples = (lane, n = 500) => Array.from({ length: n }, (_, i) => LANE_GEO[lane].curve.getPointAt(i / (n - 1)));

test('crossing squares sit exactly where the roads cross', () => {
  for (const c of CROSSINGS) {
    const center = crossingCenter(c.id);
    for (const lane of c.lanes) {
      const p = LANE_GEO[lane].curve.getPointAt(LANE_GEO[lane].stations[c.index]);
      assert.ok(p.distanceTo(center) < 0.05, `lane ${lane} misses crossing ${c.id}`);
    }
  }
});

test('roads only touch at their shared crossings', () => {
  const S = Array.from({ length: LANE_COUNT }, (_, l) => samples(l));
  const centers = CROSSINGS.map((c) => ({ c: crossingCenter(c.id), lanes: c.lanes, r: crossingRadius(c.id) + 1.2 }));
  const minGap = ROAD_WIDTH + 0.15;
  for (let a = 0; a < LANE_COUNT; a++) {
    for (let b = a + 1; b < LANE_COUNT; b++) {
      const shared = centers.filter((x) => x.lanes.includes(a) && x.lanes.includes(b));
      for (const p of S[a]) {
        if (shared.some((x) => x.c.distanceTo(p) < x.r)) continue;
        for (const q of S[b]) {
          if (shared.some((x) => x.c.distanceTo(q) < x.r)) continue;
          const d = p.distanceTo(q);
          assert.ok(d > minGap, `lanes ${a} and ${b} touch outside a crossing at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) d=${d.toFixed(2)}`);
        }
      }
    }
  }
});

test('each lane crosses other roads three times, every crossing has 2 or 3 roads', () => {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const ids = CRUCES.map((k) => crossingAt(lane, k));
    assert.equal(new Set(ids).size, 3);
  }
  for (const c of CROSSINGS) assert.ok(c.lanes.length >= 2 && c.lanes.length <= 3);
});

test('roads stay on the board and clear of the spinner', () => {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (const p of samples(lane, 400)) {
      assert.ok(Math.abs(p.x) < BOARD.width / 2 - ROAD_WIDTH / 2 - 0.3, `lane ${lane} off board x=${p.x}`);
      assert.ok(Math.abs(p.z) < BOARD.depth / 2 - ROAD_WIDTH / 2 - 0.3, `lane ${lane} off board z=${p.z}`);
      const d = Math.hypot(p.x - SPINNER_POS.x, p.z - SPINNER_POS.z);
      assert.ok(d > SPINNER_CLEARANCE + ROAD_WIDTH / 2, `lane ${lane} hits spinner d=${d.toFixed(2)}`);
    }
  }
});

test('squares are evenly usable (not crammed)', () => {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (let k = 1; k <= LANE_LENGTH; k++) {
      const a = laneSquare(lane, k - 1).pos;
      const b = laneSquare(lane, k).pos;
      assert.ok(a.distanceTo(b) > 0.7, `lane ${lane} squares ${k - 1}-${k} too close: ${a.distanceTo(b).toFixed(2)}`);
    }
  }
});

test('ordinary squares stay clear of roundabouts, start circles and the meta', () => {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (let k = 1; k < LANE_LENGTH; k++) {
      if (crossingAt(lane, k)) continue;
      const p = laneSquare(lane, k).pos;
      const half = squareLength(lane, k) / 2;
      for (const c of CROSSINGS) {
        const d = p.distanceTo(crossingCenter(c.id));
        assert.ok(d - half > crossingRadius(c.id) + 0.3, `lane ${lane} square ${k} inside roundabout ${c.id}`);
      }
      for (let other = 0; other < LANE_COUNT; other++) {
        assert.ok(p.distanceTo(laneSquare(other, 0).pos) - half > START_RADIUS, `lane ${lane} square ${k} on a start circle`);
      }
      const { arcs, length } = LANE_GEO[lane];
      assert.ok(length - arcs[k] - half > 1.0, `lane ${lane} square ${k} on the meta`);
    }
  }
});

test('squares never overlap each other, even where two lanes enter a roundabout side by side', () => {
  const clashes = squareClashes().map(({ a, b }) => `lane ${a.lane} square ${a.k} on lane ${b.lane} square ${b.k}`);
  assert.deepEqual(clashes, []);
});

test('neighbouring squares on a lane keep a visible gap', () => {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (let k = 1; k < LANE_LENGTH - 1; k++) {
      if (crossingAt(lane, k) || crossingAt(lane, k + 1)) continue;
      const gap = LANE_GEO[lane].arcs[k + 1] - LANE_GEO[lane].arcs[k] - (squareLength(lane, k) + squareLength(lane, k + 1)) / 2;
      assert.ok(gap >= 0.1, `lane ${lane} squares ${k}-${k + 1}: ${gap.toFixed(2)}`);
    }
  }
});

// A square folds over itself when the road bends tighter than half its width.
test('no drawn road bends tighter than a square is wide', () => {
  const half = ROAD_WIDTH / 2 - 0.09;
  const tight = [];
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (const [from, to] of roadIntervals(lane)) {
      for (let s = from + 0.05; s < to - 0.05; s += 0.05) {
        const a = laneAt(lane, s - 0.05).tangent;
        const b = laneAt(lane, s + 0.05).tangent;
        const radius = 0.1 / Math.max(1e-6, Math.acos(Math.min(1, a.dot(b))));
        if (radius < half) tight.push(`lane ${lane} at ${s.toFixed(2)} (radius ${radius.toFixed(2)})`);
      }
    }
  }
  assert.deepEqual(tight, []);
});
