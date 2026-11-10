import { CASILLAS_JUEGO, CASILLAS_VUELTA, GIROS_JUEGO, GIROS_VUELTA, VUELTA } from '../content/guion.js';

// The class is a fixed script. A state is a small plain object saying where in
// the script we are; `next` and `choose` are the only ways forward. Everything
// on screen (where each car is, which board is out, which overlay is open) is
// derived from the state, so going back or jumping just swaps states.
//
//   vuelta  the explanatory lap: one car, 13 slides, then Destino ('meta')
//   juego   phone, fork (one car at a time), 12 card turns, a last round that
//           takes each car to Destino, the arrival and the finale

export const CARS = 4;
// Rounds with a card; then one more round to Destino.
export const ROUNDS = 3;
export const TURNS = CARS * ROUNDS;
export const ALL_TURNS = TURNS + CARS;
export const STOPS = VUELTA.length;
export const LANE_SQUARES = CASILLAS_JUEGO;
export const LAP_SQUARES = CASILLAS_VUELTA;
export const FORK = ['negociar', 'leer', 'aceptar'];

// The steps of a game turn, one click each. The drive to Destino has no card:
// spin, and the next click drives the car home and hands over.
export const TURN_STEPS = ['listo', 'girado', 'movido', 'pregunta', 'respuesta'];
export const FINAL_STEPS = ['listo', 'girado'];

export function stepsOf(turn) {
  return turn < TURNS ? TURN_STEPS : FINAL_STEPS;
}

export const START = Object.freeze({ phase: 'vuelta', stop: 0, step: 'listo' });

const cumulative = (list) => list.reduce((out, n) => [...out, (out.at(-1) || 0) + n], []);

// Lap position (1..40) of each content square, and of Destino last.
export const LAP_POS = cumulative(GIROS_VUELTA);

// Position (1..20) of each car after each of its spins: its three card squares,
// then Destino.
export const LANE_POS = Array.from({ length: CARS }, (_, c) => cumulative(GIROS_JUEGO.filter((_, t) => t % CARS === c)));

export function partsOf(stop) {
  return VUELTA[stop - 1]?.partes || 1;
}

// Turn t is played by car t % 4 in round t / 4; round 3 is the drive to Destino.
export function turnInfo(t) {
  const car = t % CARS;
  const round = Math.floor(t / CARS);
  return { car, round, square: LANE_POS[car][round], spin: GIROS_JUEGO[t], final: t >= TURNS };
}

export function next(s) {
  switch (s.phase) {
    case 'vuelta':
      if (s.step === 'listo') return s.stop < STOPS ? { phase: 'vuelta', stop: s.stop + 1, step: 'titulo' } : { phase: 'meta' };
      if (s.step === 'titulo') return { phase: 'vuelta', stop: s.stop, step: 'texto', part: 1 };
      return s.part < partsOf(s.stop) ? { phase: 'vuelta', stop: s.stop, step: 'texto', part: s.part + 1 } : { phase: 'vuelta', stop: s.stop, step: 'listo' };
    case 'meta':
      return { phase: 'celular' };
    case 'celular':
      return { phase: 'bifurcacion', car: 0, tried: [] };
    case 'turno': {
      const steps = stepsOf(s.turn);
      const i = steps.indexOf(s.step);
      if (i < steps.length - 1) return { phase: 'turno', turn: s.turn, step: steps[i + 1] };
      return s.turn + 1 < ALL_TURNS ? { phase: 'turno', turn: s.turn + 1, step: 'listo' } : { phase: 'llegada' };
    }
    case 'llegada':
      return { phase: 'sentencias', shown: 1 };
    case 'sentencias':
      return s.shown < CARS ? { phase: 'sentencias', shown: s.shown + 1 } : { phase: 'ruedita', lista: false };
    case 'ruedita':
      return s.lista ? { phase: 'celular2' } : { phase: 'ruedita', lista: true };
    case 'celular2':
      return { phase: 'clausulas' };
    default:
      // 'bifurcacion' waits for a choice; 'clausulas' is the end.
      return s;
  }
}

// Each car chooses its own road. Negotiating bounces it back to choose again;
// the other two roads take it to its place at Inicio. After the fourth car,
// the board.
export function choose(s, choice) {
  if (s.phase !== 'bifurcacion' || !FORK.includes(choice)) return s;
  if (choice === 'negociar') return { phase: 'bifurcacion', car: s.car, tried: [...s.tried, choice] };
  return s.car + 1 < CARS ? { phase: 'bifurcacion', car: s.car + 1, tried: [] } : { phase: 'turno', turn: 0, step: 'listo' };
}

// Turns whose move has already been played in this state.
export function playedTurns(s) {
  if (s.phase === 'turno') return ['listo', 'girado'].includes(s.step) ? s.turn : s.turn + 1;
  return ['llegada', 'sentencias', 'ruedita', 'celular2', 'clausulas'].includes(s.phase) ? ALL_TURNS : 0;
}

// Spins car c has played once `played` turns are done (4 once at Destino).
export function roundsDone(c, played) {
  return played > c ? Math.floor((played - 1 - c) / CARS) + 1 : 0;
}

// Where each game car is: hidden (lap and phone), queued at the fork (slot 0 is
// the front), at its place at Inicio, on a square of the road, or at Destino.
export function carPlaces(s) {
  const out = [];
  for (let c = 0; c < CARS; c++) {
    if (['vuelta', 'meta', 'celular'].includes(s.phase)) out.push({ at: 'oculto' });
    else if (s.phase === 'bifurcacion') out.push(c < s.car ? { at: 'inicio' } : { at: 'horquilla', slot: c - s.car });
    else if (s.phase === 'turno') {
      const done = roundsDone(c, playedTurns(s));
      if (!done) out.push({ at: 'inicio' });
      else if (done > ROUNDS) out.push({ at: 'destino' });
      else out.push({ at: 'casilla', square: LANE_POS[c][done - 1] });
    } else out.push({ at: 'destino' });
  }
  return out;
}

// Where the lap car is: on the lap road at a position (0 is the start), or
// hidden once the game has begun.
export function lapPlace(s) {
  if (s.phase === 'vuelta') return { at: 'vuelta', pos: s.stop ? LAP_POS[s.stop - 1] : 0 };
  if (s.phase === 'meta') return { at: 'vuelta', pos: LAP_SQUARES };
  return { at: 'oculto' };
}

// Which board is out: the lap road or the game road.
export function world(s) {
  return ['vuelta', 'meta'].includes(s.phase) ? 'vuelta' : 'juego';
}

// Content squares of the lap already visited.
export function visited(s) {
  if (s.phase === 'vuelta') return s.stop;
  return STOPS;
}

// The number the spinner shows in this state: the last spin played, if any.
export function spinShown(s) {
  if (s.phase === 'vuelta') return s.stop ? GIROS_VUELTA[s.stop - 1] : null;
  if (s.phase === 'meta') return GIROS_VUELTA.at(-1);
  if (s.phase === 'turno') {
    const t = s.step === 'listo' ? s.turn - 1 : s.turn;
    return t >= 0 ? GIROS_JUEGO[t] : null;
  }
  if (['llegada', 'sentencias'].includes(s.phase)) return GIROS_JUEGO.at(-1);
  return null;
}

export function activeCar(s) {
  if (s.phase === 'turno') return turnInfo(s.turn).car;
  if (s.phase === 'bifurcacion') return s.car;
  return null;
}

export function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const PHASES = ['vuelta', 'meta', 'celular', 'bifurcacion', 'turno', 'llegada', 'sentencias', 'ruedita', 'celular2', 'clausulas'];
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

// A saved state that this version of the script can show.
export function isValid(s) {
  if (!s || !PHASES.includes(s.phase)) return false;
  switch (s.phase) {
    case 'vuelta':
      if (!int(s.stop, 0, STOPS)) return false;
      if (s.step === 'listo') return true;
      if (!s.stop) return false;
      if (s.step === 'titulo') return true;
      return s.step === 'texto' && int(s.part, 1, partsOf(s.stop));
    case 'bifurcacion':
      return int(s.car, 0, CARS - 1) && Array.isArray(s.tried);
    case 'turno':
      return int(s.turn, 0, ALL_TURNS - 1) && stepsOf(s.turn).includes(s.step);
    case 'sentencias':
      return int(s.shown, 1, CARS);
    case 'ruedita':
      return typeof s.lista === 'boolean';
    default:
      return true;
  }
}

// Every stop of the script, for the chapter list and for tests.
export function walkthrough() {
  const out = [];
  let s = START;
  for (let guard = 0; guard < 400; guard++) {
    out.push(s);
    const n = s.phase === 'bifurcacion' ? choose(s, 'aceptar') : next(s);
    if (same(n, s)) break;
    s = n;
  }
  return out;
}
