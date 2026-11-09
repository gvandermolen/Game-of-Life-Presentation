import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTOS, CLAUSULAS, GIROS_JUEGO, GIROS_VUELTA, TERMINOS, VUELTA, ZONAS, casilla } from '../src/content/guion.js';
import { CARS, LAP_SQUARES, ROUNDS, STOPS, TURNS } from '../src/engine/flow.js';

const ANIMS = ['choque', 'martillo', 'alcance', 'perroTormenta', 'salto', 'pozo', 'amsterdam'];
const LAYOUTS = ['linea', 'renglones', 'columnas', 'etapas', 'extincion', 'tarjetas', 'enfrentadas'];
const FIGURES = ['escudo', 'boleto', 'cadena', 'mapa'];

test('fourteen slides in three zones, each with what its layout needs', () => {
  assert.equal(VUELTA.length, 14);
  assert.equal(STOPS, 14);
  assert.deepEqual(
    ZONAS.map((z) => [z.nombre, z.desde, z.hasta]),
    [
      ['Embarco', 1, 6],
      ['Viaje', 7, 10],
      ['Desembarco', 11, 14],
    ],
  );
  for (const [i, v] of VUELTA.entries()) {
    const id = `casilla ${i + 1}`;
    assert.ok(v.titulo && v.tema && v.icono, id);
    assert.ok(LAYOUTS.includes(v.diseno), `${id}: ${v.diseno}`);
    if (v.figura) assert.ok(FIGURES.includes(v.figura), `${id}: ${v.figura}`);
    const need = { linea: 'hitos', renglones: 'renglones', columnas: 'columnas', etapas: 'columnas', extincion: 'grupos', tarjetas: 'tarjetas', enfrentadas: 'columnas' }[v.diseno];
    assert.ok(Array.isArray(v[need]) && v[need].length, `${id} needs ${need}`);
  }
  assert.equal(VUELTA[4].columnas.flatMap((c) => c.renglones).length, VUELTA[4].partes, 'one click per obligation');
  assert.equal(VUELTA[7].tarjetas.length + 1, VUELTA[7].partes, 'one click per card, then the box');
  assert.equal(VUELTA[12].columnas.length, VUELTA[12].partes, 'one click per column');
});

test('slide titles follow the spec', () => {
  assert.equal(VUELTA[0].titulo, 'Historia y evolución del contrato');
  assert.equal(VUELTA[6].titulo, 'Llegar sano y salvo');
  assert.equal(VUELTA[7].titulo, 'Solo lo libera una causa ajena');
  assert.equal(VUELTA[10].titulo, 'Un contrato que se celebra con un clic');
  assert.equal(VUELTA[12].titulo, '¿Intermediaria o empresa de transporte?');
  assert.equal(VUELTA[13].titulo, 'El algoritmo');
});

test('the lap spins add up to Destino', () => {
  assert.equal(GIROS_VUELTA.length, STOPS + 1);
  assert.equal(
    GIROS_VUELTA.reduce((a, b) => a + b, 0),
    LAP_SQUARES,
  );
});

test('four cars with three complete squares each', () => {
  assert.equal(AUTOS.length, CARS);
  for (const a of AUTOS) {
    assert.ok(a.grupo && a.nombre && a.color && a.sentencia && a.caso, a.id);
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
  assert.deepEqual([0, 1, 2].map((i) => at(0, i)), ['choque', 'martillo', 'martillo']);
  assert.deepEqual([0, 1, 2].map((i) => at(1, i)), ['alcance', 'perroTormenta', 'salto']);
  assert.deepEqual([0, 1, 2].map((i) => at(2, i)), ['pozo', 'amsterdam', undefined]);
  assert.deepEqual([0, 1, 2].map((i) => at(3, i)), [undefined, 'martillo', undefined]);
  assert.ok(AUTOS[3].casillas[1].opciones.length === 4);
  assert.ok(AUTOS[1].casillas.every((c) => c.reloj), 'the late-for-the-exam clock on car 2');
});

test('one spinner number per game turn, from 1 to 10, never twice in a row', () => {
  for (const list of [GIROS_JUEGO, GIROS_VUELTA]) {
    list.forEach((n, i) => {
      assert.ok(Number.isInteger(n) && n >= 1 && n <= 10);
      if (i) assert.notEqual(n, list[i - 1]);
    });
  }
  assert.equal(GIROS_JUEGO.length, TURNS);
});

test('casilla(turn) follows the interleaved order', () => {
  assert.equal(casilla(0).titulo, 'El viaje');
  assert.equal(casilla(1).titulo, 'Me chocaron de atrás');
  assert.equal(casilla(2).titulo, 'El pozo');
  assert.equal(casilla(4).titulo, 'La contestación y la primera instancia');
  assert.equal(casilla(5).titulo, 'El perro y la tormenta');
  assert.equal(casilla(10).titulo, 'La Justicia confirma');
  assert.equal(casilla(11).titulo, 'Llega la regulación (2026)');
});

test('verdicts follow the spec', () => {
  assert.match(AUTOS[1].sentencia, /primeros 2 accidentes/);
  assert.match(AUTOS[2].sentencia, /confirmada por la Justicia/);
});

test('the terms switch to English, have no placeholders and no highlighted ending', () => {
  assert.ok(TERMINOS.castellano.length && TERMINOS.ingles.length);
  assert.ok(TERMINOS.segundos <= 16);
  assert.equal(TERMINOS.final, undefined);
  const all = [...TERMINOS.castellano, ...TERMINOS.ingles].join(' ');
  assert.doesNotMatch(all, /\*\*\*|\bpendiente\b|\bpending\b|\[/i);
  assert.match(TERMINOS.ingles.join(' '), /Amsterdam/);
  assert.equal(CLAUSULAS.lista.length, 5);
});
