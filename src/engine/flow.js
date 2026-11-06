// The game is a fixed script. A state is a small plain object saying where in
// the script we are; `next` and `choose` are the only ways forward. Everything
// on screen (where each car is, which squares are revealed, which overlay is
// open) is derived from the state, so going back or jumping just swaps states.

export const CARS = 4;
export const ROUNDS = 4;
export const TURNS = CARS * ROUNDS;
export const SQUARES = TURNS;
export const FORK = ['negociar', 'leer', 'aceptar'];

export const START = Object.freeze({ phase: 'transicion' });

// Turn t is played by car t % 4 and lands on square t + 1: car 1 owns squares
// 1, 5, 9, 13, car 2 owns 2, 6, 10, 14, and so on.
export function turnInfo(t) {
  return { car: t % CARS, round: Math.floor(t / CARS), square: t + 1 };
}

export function next(s) {
  switch (s.phase) {
    case 'transicion':
      return { phase: 'celular' };
    case 'celular':
      return { phase: 'bifurcacion', tried: [] };
    case 'turno':
      if (s.step === 'listo') return { phase: 'turno', turn: s.turn, step: 'pregunta' };
      if (s.step === 'pregunta') return { phase: 'turno', turn: s.turn, step: 'respuesta' };
      return s.turn + 1 < TURNS ? { phase: 'turno', turn: s.turn + 1, step: 'listo' } : { phase: 'llegada' };
    case 'llegada':
      return { phase: 'sentencias', shown: 1 };
    case 'sentencias':
      return s.shown < CARS ? { phase: 'sentencias', shown: s.shown + 1 } : { phase: 'ruedita' };
    case 'ruedita':
      return { phase: 'celular2' };
    case 'celular2':
      return { phase: 'clausulas' };
    default:
      // 'bifurcacion' waits for a choice; 'clausulas' is the end.
      return s;
  }
}

// Negotiating bounces the cars back to the fork; the other two roads lead to the board.
export function choose(s, choice) {
  if (s.phase !== 'bifurcacion' || !FORK.includes(choice)) return s;
  if (choice === 'negociar') return { phase: 'bifurcacion', tried: [...s.tried, choice] };
  return { phase: 'turno', turn: 0, step: 'listo' };
}

// Turns whose move has already been played in this state.
export function playedTurns(s) {
  if (s.phase === 'turno') return s.step === 'listo' ? s.turn : s.turn + 1;
  return ['llegada', 'sentencias', 'ruedita', 'celular2', 'clausulas'].includes(s.phase) ? TURNS : 0;
}

// Where each car is: hidden (before the phone), queued at the fork, queued at
// the start of the board, on a square, or parked at the destination.
export function carPlaces(s) {
  const out = [];
  for (let c = 0; c < CARS; c++) {
    if (s.phase === 'transicion' || s.phase === 'celular') out.push({ at: 'oculto' });
    else if (s.phase === 'bifurcacion') out.push({ at: 'horquilla', slot: c });
    else if (s.phase === 'turno') {
      const played = playedTurns(s);
      const done = played > c ? Math.floor((played - 1 - c) / CARS) + 1 : 0;
      out.push(done ? { at: 'casilla', square: (done - 1) * CARS + c + 1 } : { at: 'cola', slot: c });
    } else out.push({ at: 'destino', slot: c });
  }
  return out;
}

// Squares whose stage title is already shown on the board.
export function revealed(s) {
  return playedTurns(s);
}

export function activeCar(s) {
  return s.phase === 'turno' ? turnInfo(s.turn).car : null;
}

export function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Every stop of the script, for the chapter list and for tests.
export function walkthrough() {
  const out = [];
  let s = START;
  for (let guard = 0; guard < 200; guard++) {
    out.push(s);
    const n = s.phase === 'bifurcacion' ? choose(s, 'aceptar') : next(s);
    if (same(n, s)) break;
    s = n;
  }
  return out;
}
