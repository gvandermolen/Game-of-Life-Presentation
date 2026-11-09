import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CARS,
  LANE_POS,
  LAP_POS,
  START,
  STOPS,
  TURNS,
  activeCar,
  carPlaces,
  choose,
  isValid,
  lapPlace,
  next,
  partsOf,
  turnInfo,
  walkthrough,
  world,
} from '../src/engine/flow.js';
import { STORAGE_KEY, Store, memoryStorage } from '../src/engine/store.js';

const phases = () => walkthrough().map((s) => s.phase);

test('the class runs from the lap to the clauses, with no transition sign', () => {
  const p = phases();
  assert.equal(p[0], 'vuelta');
  assert.equal(p.at(-1), 'clausulas');
  assert.ok(!p.includes('transicion'));
  const meta = p.indexOf('meta');
  assert.equal(p[meta + 1], 'celular', 'from the lap arrival straight to the phone');
  assert.ok(p.lastIndexOf('vuelta') < meta && meta < p.indexOf('bifurcacion'));
  assert.equal(p.filter((x) => x === 'turno').length, TURNS * 5);
  assert.equal(p.filter((x) => x === 'sentencias').length, CARS);
  assert.equal(p.filter((x) => x === 'ruedita').length, 2);
  for (const x of ['llegada', 'celular2']) assert.ok(p.includes(x), x);
});

test('each lap square: spin opens the title, then the text by parts, then it closes', () => {
  const lap = walkthrough().filter((s) => s.phase === 'vuelta');
  for (let stop = 1; stop <= STOPS; stop++) {
    const mine = lap.filter((s) => s.stop === stop);
    assert.deepEqual(mine[0], { phase: 'vuelta', stop, step: 'titulo' });
    assert.equal(mine.filter((s) => s.step === 'texto').length, partsOf(stop));
    assert.deepEqual(mine.at(-1), { phase: 'vuelta', stop, step: 'listo' });
  }
  assert.equal(partsOf(5), 3);
  assert.equal(partsOf(8), 4);
  assert.equal(partsOf(13), 2);
  assert.equal(partsOf(1), 1);
});

test('lap spins land on the content squares of the spec, and the last one on Destino', () => {
  assert.deepEqual(LAP_POS, [3, 5, 9, 10, 13, 18, 20, 23, 25, 29, 30, 33, 35, 38, 40]);
  assert.deepEqual(lapPlace(START), { at: 'vuelta', pos: 0 });
  assert.deepEqual(lapPlace({ phase: 'vuelta', stop: 4, step: 'titulo' }), { at: 'vuelta', pos: 10 });
  assert.deepEqual(lapPlace({ phase: 'meta' }), { at: 'vuelta', pos: 40 });
  assert.deepEqual(lapPlace({ phase: 'celular' }), { at: 'oculto' });
  assert.equal(world({ phase: 'meta' }), 'vuelta');
  assert.equal(world({ phase: 'celular' }), 'juego');
});

test('game spins land each car on its three card squares', () => {
  assert.deepEqual(LANE_POS, [
    [4, 11, 17],
    [5, 9, 14],
    [3, 11, 14],
    [6, 8, 18],
  ]);
  for (let t = 0; t < TURNS; t++) {
    const { car, round, square } = turnInfo(t);
    assert.equal(car, t % 4);
    assert.equal(square, LANE_POS[car][round]);
  }
});

test('a turn takes five clicks: spin, move, card, answer, next car', () => {
  let s = { phase: 'turno', turn: 0, step: 'listo' };
  const steps = [];
  while (s.phase === 'turno' && s.turn === 0) {
    steps.push(s.step);
    s = next(s);
  }
  assert.deepEqual(steps, ['listo', 'girado', 'movido', 'pregunta', 'respuesta']);
  assert.deepEqual(s, { phase: 'turno', turn: 1, step: 'listo' });
  const before = carPlaces({ phase: 'turno', turn: 0, step: 'girado' });
  const after = carPlaces({ phase: 'turno', turn: 0, step: 'movido' });
  assert.deepEqual(before[0], { at: 'inicio' }, 'the spin alone does not move the car');
  assert.deepEqual(after[0], { at: 'casilla', square: 4 });
});

test('car 1 waits right behind car 2 when car 2 is rear-ended', () => {
  const places = carPlaces({ phase: 'turno', turn: 1, step: 'movido' });
  assert.deepEqual(places[0], { at: 'casilla', square: 4 });
  assert.deepEqual(places[1], { at: 'casilla', square: 5 });
  assert.deepEqual(places[2], { at: 'inicio' });
});

test('back from the answer returns to the question of the same square', () => {
  const st = new Store(memoryStorage());
  st.jump({ phase: 'turno', turn: 5, step: 'pregunta' });
  st.next();
  assert.equal(st.state.step, 'respuesta');
  const placesAnswer = carPlaces(st.state);
  st.back();
  assert.deepEqual(st.state, { phase: 'turno', turn: 5, step: 'pregunta' });
  assert.deepEqual(carPlaces(st.state), placesAnswer, 'no car moves');
});

test('the fork: each car on its own, negotiating chooses again', () => {
  let s = next({ phase: 'celular' });
  assert.deepEqual(s, { phase: 'bifurcacion', car: 0, tried: [] });
  assert.deepEqual(carPlaces(s).map((p) => p.slot), [0, 1, 2, 3]);
  s = choose(s, 'negociar');
  assert.deepEqual(s, { phase: 'bifurcacion', car: 0, tried: ['negociar'] });
  s = choose(s, 'leer');
  assert.deepEqual(s, { phase: 'bifurcacion', car: 1, tried: [] });
  assert.deepEqual(carPlaces(s), [{ at: 'inicio' }, { at: 'horquilla', slot: 0 }, { at: 'horquilla', slot: 1 }, { at: 'horquilla', slot: 2 }]);
  assert.equal(activeCar(s), 1);
  s = choose(s, 'aceptar');
  s = choose(s, 'negociar');
  s = choose(s, 'negociar');
  assert.deepEqual(s.tried, ['negociar', 'negociar']);
  s = choose(s, 'leer');
  assert.equal(s.car, 3);
  s = choose(s, 'aceptar');
  assert.deepEqual(s, { phase: 'turno', turn: 0, step: 'listo' });
  assert.equal(next({ phase: 'bifurcacion', car: 2, tried: [] }).car, 2, 'the fork waits for a choice');
  assert.equal(choose(START, 'leer'), START, 'choices outside the fork are ignored');
});

test('the final reveal shows the spins, then the phone', () => {
  assert.deepEqual(next({ phase: 'sentencias', shown: 4 }), { phase: 'ruedita', lista: false });
  assert.deepEqual(next({ phase: 'ruedita', lista: false }), { phase: 'ruedita', lista: true });
  assert.deepEqual(next({ phase: 'ruedita', lista: true }), { phase: 'celular2' });
});

test('no two cars ever share a square, and every state of the script is valid', () => {
  for (const s of walkthrough()) {
    assert.ok(isValid(s), JSON.stringify(s));
    const squares = carPlaces(s).filter((p) => p.at === 'casilla');
    assert.ok(squares.every((p) => p.square >= 1 && p.square <= 20));
  }
  assert.equal(isValid({ phase: 'bifurcacion' }), false);
  assert.equal(isValid({ phase: 'turno', turn: 3 }), false);
  assert.equal(isValid({ phase: 'transicion' }), false);
  assert.equal(isValid({ phase: 'vuelta', stop: 5, step: 'texto', part: 9 }), false);
});

test('store: back, forward, jump and persistence', () => {
  const storage = memoryStorage();
  const st = new Store(storage);
  st.jump({ phase: 'celular' });
  st.next();
  assert.equal(st.state.phase, 'bifurcacion');
  st.choose('negociar');
  st.choose('leer');
  assert.deepEqual(st.state, { phase: 'bifurcacion', car: 1, tried: [] });
  st.back();
  assert.deepEqual(st.state, { phase: 'bifurcacion', car: 0, tried: ['negociar'] });
  st.forward();
  assert.equal(st.state.car, 1);
  st.jump({ phase: 'turno', turn: 9, step: 'listo' });
  assert.equal(st.state.turn, 9);
  assert.equal(st.canForward(), false);

  const again = Store.load(storage);
  assert.deepEqual(again.state, { phase: 'turno', turn: 9, step: 'listo' });
  again.back();
  assert.equal(again.state.phase, 'bifurcacion');
  again.restart();
  assert.deepEqual(again.state, START);
  assert.equal(again.canBack(), false);
  assert.equal(again.settings.titulo, 'Destino: Sano y Salvo');
});

test('store ignores saved data from another version or of the wrong shape', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ v: 99, state: { phase: 'llegada' }, back: [] }));
  assert.deepEqual(Store.load(storage).state, START);
  storage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, state: { phase: 'bifurcacion' }, back: [] }));
  assert.deepEqual(Store.load(storage).state, START);
  storage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, state: { phase: 'llegada' }, back: [{ phase: 'transicion' }] }));
  assert.deepEqual(Store.load(storage).state, START);
});
