import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTOS, CLAUSULAS, GIROS_JUEGO, GIROS_VUELTA, TERMINOS, VUELTA, ZONAS, casilla } from '../src/content/guion.js';
import { ALL_TURNS, CARS, LANE_SQUARES, LAP_SQUARES, ROUNDS, STOPS } from '../src/engine/flow.js';

const ANIMS = ['choque', 'martillo', 'alcance', 'perroTormenta', 'salto', 'pozo', 'amsterdam'];
const LAYOUTS = ['linea', 'renglones', 'columnas', 'etapas', 'extincion', 'tarjetas', 'enfrentadas'];
const FIGURES = ['escudo', 'boleto', 'cadena'];

test('thirteen slides in three zones, each with what its layout needs', () => {
  assert.equal(VUELTA.length, 13);
  assert.equal(STOPS, 13);
  assert.deepEqual(
    ZONAS.map((z) => [z.nombre, z.desde, z.hasta]),
    [
      ['Embarco', 1, 6],
      ['Viaje', 7, 10],
      ['Desembarco', 11, 13],
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
  assert.equal(VUELTA[4].partes, undefined, 'the obligations show at once');
  assert.equal(VUELTA[7].tarjetas.length + 1, VUELTA[7].partes, 'one click per card, then the box');
  assert.equal(VUELTA[11].columnas.length, VUELTA[11].partes, 'one click per column');
  assert.equal(VUELTA[1].recuadros.length, 4, 'four boxes in a row on square 2');
  assert.match(VUELTA[10].recuadro, /Art\. 1109/, 'jurisdiction box on square 11');
  assert.equal(VUELTA[0].hitos[2].nota, 'Ledesma y Uriarte Martínez');
  assert.ok(!VUELTA.some((v) => /Abusividad/.test(v.tema)), 'the old square 12 is gone');
});

test('slide titles follow the spec', () => {
  assert.deepEqual(
    VUELTA.map((v) => v.titulo),
    [
      'Historia y evolución del contrato',
      'Definición y régimen legal aplicable',
      'Personas y cosas: dos regímenes distintos',
      'Caracteres, adhesión y consumo',
      'Las etapas y las obligaciones',
      'Modos de extinción del contrato',
      'Responsabilidad',
      'Solo lo libera una causa ajena',
      'Cláusulas inválidas',
      '¿Quién responde?',
      'Un contrato que se celebra con un clic',
      '¿Intermediaria o empresa de transporte?',
      'El algoritmo',
    ],
  );
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

test('one spinner number per game turn, from 1 to 10; each car ends exactly on Destino', () => {
  for (const n of [...GIROS_JUEGO, ...GIROS_VUELTA]) assert.ok(Number.isInteger(n) && n >= 1 && n <= 10);
  assert.equal(GIROS_JUEGO.length, ALL_TURNS);
  for (let c = 0; c < CARS; c++) {
    const sum = GIROS_JUEGO.filter((_, t) => t % CARS === c).reduce((a, b) => a + b, 0);
    assert.equal(sum, LANE_SQUARES, `car ${c + 1}`);
  }
  assert.deepEqual(GIROS_JUEGO.slice(-CARS), [3, 4, 6, 1]);
});

test('casilla(turn) follows the interleaved order', () => {
  assert.equal(casilla(0).titulo, 'El viaje');
  assert.equal(casilla(1).titulo, 'Me chocaron de atrás');
  assert.equal(casilla(2).titulo, 'El pozo');
  assert.equal(casilla(4).titulo, 'La contestación y la primera instancia');
  assert.equal(casilla(5).titulo, 'El perro y la tormenta');
  assert.equal(casilla(10).titulo, 'La Justicia confirma');
  assert.equal(casilla(11).titulo, 'Llega la regulación (2026)');
  assert.equal(casilla(12), null, 'no card on the way to Destino');
});

test('verdicts follow the spec', () => {
  assert.match(AUTOS[1].sentencia, /primeros 2 accidentes/);
  assert.match(AUTOS[2].sentencia, /confirmada por la Justicia/);
});

test('the rewritten cards: hints moved, and the answers of the spec', () => {
  const g1 = AUTOS[0].casillas;
  assert.match(g1[0].respuesta, /a destino sano y salvo/);
  assert.match(g1[0].respuesta, /Art\. 1289 y Art 40 LDC/);
  assert.equal(g1[1].pregunta, '¿Corresponde esa reducción?');
  assert.match(g1[1].pista, /no hubo peritaje/);
  assert.match(g1[1].respuesta, /Art\. 1729/);
  assert.equal(g1[2].pista, undefined);
  assert.match(g1[2].pregunta, /mera intermediaria/);
  assert.doesNotMatch(g1[2].respuesta, /9\.000\.000/);
  assert.doesNotMatch(AUTOS[1].casillas[0].respuesta, /externo a la actividad/);
  assert.match(AUTOS[2].casillas[0].situacion, /por un pozo y le reclama a Uber/);
  assert.match(AUTOS[2].casillas[0].respuesta, /el resto son abusivas/);
  assert.match(AUTOS[2].casillas[1].pista, /controversias excluidas de arbitraje/);
  assert.match(AUTOS[2].casillas[1].respuesta, /Arts\. 1109, 2654, 2656/);
  assert.doesNotMatch(AUTOS[3].casillas[1].respuesta, /Élite Taxi/);
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
