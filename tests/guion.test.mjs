import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTOS, CLAUSULAS, GIROS, TERMINOS, casilla } from '../src/content/guion.js';
import { CARS, ROUNDS, TURNS } from '../src/engine/flow.js';

const ANIMS = ['choque', 'martillo', 'alcance', 'perro', 'tormenta', 'salto', 'amsterdam', 'sello'];

test('four cars with four complete squares each', () => {
  assert.equal(AUTOS.length, CARS);
  for (const a of AUTOS) {
    assert.ok(a.grupo && a.nombre && a.color && a.sentencia, a.id);
    assert.equal(a.casillas.length, ROUNDS, a.id);
    for (const c of a.casillas) {
      assert.ok(c.titulo && c.situacion && c.pregunta && c.respuesta, `${a.id} ${c.titulo}`);
      if (c.anim) assert.ok(ANIMS.includes(c.anim), c.anim);
      if (c.opciones) assert.ok(c.correctas.every((i) => i < c.opciones.length));
    }
  }
  assert.equal(AUTOS[3].vehiculo, 'taxi');
});

test('every animation in the spec is scripted on the right square', () => {
  const at = (car, sq) => AUTOS[car].casillas[sq].anim;
  assert.equal(at(0, 0), 'choque');
  assert.equal(at(0, 2), 'martillo');
  assert.equal(at(0, 3), 'martillo');
  assert.deepEqual([0, 1, 2, 3].map((i) => at(1, i)), ['alcance', 'perro', 'tormenta', 'salto']);
  assert.equal(at(2, 2), 'amsterdam');
  assert.equal(at(3, 1), 'sello');
});

test('one spinner number per turn, never the same twice in a row', () => {
  assert.equal(GIROS.length, TURNS);
  GIROS.forEach((n, i) => {
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 10);
    if (i) assert.notEqual(n, GIROS[i - 1]);
  });
});

test('casilla(turn) follows the interleaved order', () => {
  assert.equal(casilla(0).titulo, 'El choque');
  assert.equal(casilla(1).titulo, 'Me chocaron de atrás');
  assert.equal(casilla(4).titulo, 'La contestación de Cabify');
  assert.equal(casilla(15).titulo, 'Llega la regulación (2026)');
});

test('terms switch to English and stop on the arbitration line', () => {
  assert.ok(TERMINOS.castellano.length && TERMINOS.ingles.length);
  assert.match(TERMINOS.final, /arbitration in Amsterdam, in English/);
  assert.equal(CLAUSULAS.lista.length, 5);
});
