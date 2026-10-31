import test from 'node:test';
import assert from 'node:assert/strict';

import { CROSSINGS, LANE_COUNT, LANE_LENGTH, crossingAt } from '../src/engine/board.js';
import { BOARD, LANE_GEO, ROAD_WIDTH, SPINNER_CLEARANCE, SPINNER_POS, crossingCenter, laneSquare } from '../src/scene/layout.js';

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
  const centers = CROSSINGS.map((c) => ({ c: crossingCenter(c.id), lanes: c.lanes }));
  const minGap = ROAD_WIDTH + 0.15;
  for (let a = 0; a < LANE_COUNT; a++) {
    for (let b = a + 1; b < LANE_COUNT; b++) {
      const shared = centers.filter((x) => x.lanes.includes(a) && x.lanes.includes(b)).map((x) => x.c);
      for (const p of S[a]) {
        if (shared.some((c) => c.distanceTo(p) < 2.6)) continue;
        for (const q of S[b]) {
          if (shared.some((c) => c.distanceTo(q) < 2.6)) continue;
          const d = p.distanceTo(q);
          assert.ok(d > minGap, `lanes ${a} and ${b} touch outside a crossing at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) d=${d.toFixed(2)}`);
        }
      }
    }
  }
});

test('each lane crosses other roads three times, every crossing has 2 or 3 roads', () => {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const ids = [8, 18, 27].map((k) => crossingAt(lane, k));
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
      assert.ok(a.distanceTo(b) > 0.6, `lane ${lane} squares ${k - 1}-${k} too close: ${a.distanceTo(b).toFixed(2)}`);
    }
  }
});
