import assert from 'node:assert/strict';
import test from 'node:test';
import { CARS, START, TURNS, activeCar, carPlaces, choose, next, revealed, turnInfo, walkthrough } from '../src/engine/flow.js';
import { Store, memoryStorage } from '../src/engine/store.js';

test('the script runs from the transition sign to the clauses', () => {
  const phases = walkthrough().map((s) => s.phase);
  assert.equal(phases[0], 'transicion');
  assert.equal(phases.at(-1), 'clausulas');
  assert.equal(phases.filter((p) => p === 'turno').length, TURNS * 3);
  assert.equal(phases.filter((p) => p === 'sentencias').length, CARS);
  for (const p of ['celular', 'bifurcacion', 'llegada', 'ruedita', 'celular2']) assert.ok(phases.includes(p), p);
});

test('turns are interleaved: car t % 4 lands on square t + 1', () => {
  for (let t = 0; t < TURNS; t++) {
    const { car, square } = turnInfo(t);
    assert.equal(car, t % 4);
    assert.equal(square, t + 1);
    const after = carPlaces({ phase: 'turno', turn: t, step: 'pregunta' });
    assert.deepEqual(after[car], { at: 'casilla', square: t + 1 });
    const before = carPlaces({ phase: 'turno', turn: t, step: 'listo' });
    assert.notDeepEqual(before[car], after[car]);
  }
});

test('car 2 lands right after car 1 in the first round, so it can be rear-ended', () => {
  const places = carPlaces({ phase: 'turno', turn: 1, step: 'pregunta' });
  assert.deepEqual(places[0], { at: 'casilla', square: 1 });
  assert.deepEqual(places[1], { at: 'casilla', square: 2 });
  assert.equal(places[2].at, 'cola');
});

test('no two cars ever share a square', () => {
  for (const s of walkthrough()) {
    const squares = carPlaces(s).filter((p) => p.at === 'casilla').map((p) => p.square);
    assert.equal(new Set(squares).size, squares.length, JSON.stringify(s));
  }
});

test('the fork can be tried in any order; negotiating always returns to it', () => {
  let s = { phase: 'bifurcacion', tried: [] };
  s = choose(s, 'negociar');
  assert.equal(s.phase, 'bifurcacion');
  s = choose(s, 'negociar');
  assert.deepEqual(s.tried, ['negociar', 'negociar']);
  for (const c of ['leer', 'aceptar']) {
    const t = choose(s, c);
    assert.deepEqual(t, { phase: 'turno', turn: 0, step: 'listo' });
  }
  assert.equal(next(s), s, 'the fork waits for a choice');
  assert.equal(choose(START, 'leer'), START, 'choices outside the fork are ignored');
});

test('revealed squares and the active car follow the turn', () => {
  assert.equal(revealed({ phase: 'turno', turn: 5, step: 'listo' }), 5);
  assert.equal(revealed({ phase: 'turno', turn: 5, step: 'respuesta' }), 6);
  assert.equal(revealed({ phase: 'llegada' }), TURNS);
  assert.equal(activeCar({ phase: 'turno', turn: 6, step: 'listo' }), 2);
  assert.equal(activeCar({ phase: 'llegada' }), null);
});

test('store: back, forward, jump and persistence', () => {
  const storage = memoryStorage();
  const st = new Store(storage);
  st.next();
  st.next();
  assert.equal(st.state.phase, 'bifurcacion');
  st.choose('negociar');
  st.choose('leer');
  assert.equal(st.state.phase, 'turno');
  st.back();
  assert.deepEqual(st.state, { phase: 'bifurcacion', tried: ['negociar'] });
  st.forward();
  assert.equal(st.state.phase, 'turno');
  st.jump({ phase: 'turno', turn: 9, step: 'listo' });
  assert.equal(st.state.turn, 9);
  assert.equal(st.canForward(), false);

  const again = Store.load(storage);
  assert.deepEqual(again.state, { phase: 'turno', turn: 9, step: 'listo' });
  again.back();
  assert.equal(again.state.phase, 'turno');
  assert.equal(again.state.turn, 0);
  again.restart();
  assert.deepEqual(again.state, START);
  assert.equal(again.canBack(), false);
});

test('store ignores saved data from another version', () => {
  const storage = memoryStorage();
  storage.setItem('juego-de-los-contratos.v1', JSON.stringify({ v: 99, state: { phase: 'llegada' }, back: [] }));
  assert.deepEqual(Store.load(storage).state, START);
});
