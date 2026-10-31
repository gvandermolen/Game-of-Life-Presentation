import test from 'node:test';
import assert from 'node:assert/strict';

import { LANES, LANE_LENGTH, CRUCES, squareAt } from '../src/engine/board.js';
import { createGame, reduce, replay, currentTeam } from '../src/engine/reducer.js';
import { defaultRoster } from '../src/engine/roster.js';
import { Session, memoryStorage, STORAGE_KEY } from '../src/engine/session.js';
import { describeHistory } from '../src/engine/describe.js';

const two = () => defaultRoster().map((t, i) => ({ ...t, enabled: i < 2 }));

function landOn(state, teamIdx, pos) {
  const s = structuredClone(state);
  s.teams[teamIdx].pos = pos;
  return s;
}

test('every lane has the same square counts and fixed cruces', () => {
  const count = (lane) => lane.reduce((m, t) => ((m[t] = (m[t] || 0) + 1), m), {});
  const first = count(LANES[0]);
  for (const lane of LANES) {
    assert.equal(lane.length, LANE_LENGTH + 1);
    assert.deepEqual(count(lane), first);
    for (const c of CRUCES) assert.equal(lane[c], 'cruce');
    assert.equal(lane[0], 'salida');
    assert.equal(lane[LANE_LENGTH], 'meta');
  }
  assert.notDeepEqual(LANES[0], LANES[1]);
});

test('cruces are mandatory stops', () => {
  const s0 = createGame(two());
  const s1 = reduce(s0, { type: 'SPIN', value: 10 });
  assert.equal(s1.teams[0].pos, CRUCES[0]);
});

test('arriving on an occupied cruce triggers a collision', () => {
  let s = createGame(two());
  s = landOn(s, 1, CRUCES[0]);
  s = reduce(s, { type: 'SPIN', value: 10 });
  assert.equal(s.phase, 'collision');
  assert.deepEqual(s.pending.teams, ['colectivo', 'taxi']);

  const after = reduce(s, { type: 'COLLISION', winner: 'colectivo' });
  assert.equal(after.teams[0].pos, CRUCES[0]);
  assert.equal(after.teams[1].pos, CRUCES[0] - 2);
  assert.equal(currentTeam(after).id, 'taxi');
});

test('collision with perderTurno makes the loser skip', () => {
  let s = createGame(two(), { colision: { penalidad: 'perderTurno', casillas: 2 } });
  s = landOn(s, 1, CRUCES[0]);
  s = reduce(s, { type: 'SPIN', value: 10 });
  s = reduce(s, { type: 'COLLISION', winner: 'colectivo' });
  // taxi loses its turn, so it is colectivo again
  assert.equal(currentTeam(s).id, 'colectivo');
  assert.ok(s.events.some((e) => e.type === 'skipped' && e.team === 'taxi'));
});

test('card squares wait for a verdict and apply effects', () => {
  let s = createGame(two());
  const lane = s.teams[0].lane;
  const pos = LANES[lane].indexOf('pregunta');
  s = landOn(s, 0, pos - 1);
  s = reduce(s, { type: 'SPIN', value: 1 });
  assert.equal(s.phase, 'card');
  assert.equal(s.pending.tipo, 'pregunta');
  assert.equal(reduce(s, { type: 'SPIN', value: 3 }), s, 'spin ignored while a card is open');
  const ok = reduce(s, { type: 'VERDICT', result: 'ok' });
  assert.equal(ok.teams[0].pos, pos + 1);
  assert.equal(ok.phase, 'spin');
});

test('multa moves back, bonus gives another spin, control skips a turn', () => {
  const lane = 0;
  const base = createGame(two());
  const at = (type) => LANES[lane].indexOf(type);

  let s = reduce(landOn(base, 0, at('multa') - 1), { type: 'SPIN', value: 1 });
  assert.equal(s.teams[0].pos, at('multa') - 2);

  s = reduce(landOn(base, 0, at('bonus') - 1), { type: 'SPIN', value: 1 });
  assert.equal(currentTeam(s).id, 'colectivo');

  s = reduce(landOn(base, 0, at('control') - 1), { type: 'SPIN', value: 1 });
  assert.equal(s.teams[0].skip, 1);
});

test('first to reach the meta wins', () => {
  let s = landOn(createGame(two()), 0, LANE_LENGTH - 2);
  s = reduce(s, { type: 'SPIN', value: 5 });
  assert.equal(s.phase, 'finished');
  assert.equal(s.winner, 'colectivo');
});

test('replay is deterministic', () => {
  const h = [3, 5, 2, 7, 1, 9, 4, 6].map((value) => ({ type: 'SPIN', value }));
  const a = replay(createGame(two()), h);
  const b = replay(createGame(two()), h);
  assert.deepEqual(a, b);
});

function playSome(session, spins) {
  for (const value of spins) {
    const st = session.state;
    if (st.phase === 'card') session.dispatch({ type: 'VERDICT', result: 'ok' });
    else if (st.phase === 'collision') session.dispatch({ type: 'COLLISION', winner: st.pending.teams[0] });
    session.dispatch({ type: 'SPIN', value });
  }
}

test('session undo, redo, jump and restart', () => {
  const storage = memoryStorage();
  const sess = new Session(storage, null);
  sess.restart({ roster: two() });
  playSome(sess, [3, 4, 5, 6, 2, 2]);
  const full = structuredClone(sess.state);
  const len = sess.data.history.length;

  sess.undo();
  assert.equal(sess.data.history.length, len - 1);
  sess.redo();
  assert.deepEqual(sess.state, full);

  sess.jumpToMove(2);
  assert.equal(sess.state.moves, 2);
  sess.jumpTo(len);
  assert.deepEqual(sess.state, full);

  const reloaded = Session.load(storage);
  assert.deepEqual(reloaded.state, full);

  sess.restart();
  assert.equal(sess.state.moves, 0);
  assert.ok(JSON.parse(storage.getItem(STORAGE_KEY)).history.length === 0);
});

test('export / import round-trip and history labels', () => {
  const a = new Session(memoryStorage(), null);
  playSome(a, [2, 3, 4]);
  const b = new Session(memoryStorage(), null);
  b.importJSON(a.exportJSON());
  assert.deepEqual(b.state, a.state);
  const labels = describeHistory(a.data.roster, a.data.rules, a.data.history);
  assert.equal(labels.length, a.data.history.length);
  assert.match(labels[0].label, /gira 2/);
});

test('squareAt clamps out of range', () => {
  assert.equal(squareAt(0, -4), 'salida');
  assert.equal(squareAt(0, 99), 'meta');
});
