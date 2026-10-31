import { SQUARE_TYPES } from './board.js';
import { createGame, reduce } from './reducer.js';

const RESULT = { ok: 'correcta', fail: 'incorrecta', void: 'anulada' };

function teamName(roster, id) {
  return roster.find((t) => t.id === id)?.nombre || id;
}

function describeOne(action, prev, next, roster) {
  const n = (id) => teamName(roster, id);
  switch (action.type) {
    case 'SPIN': {
      const ev = next.events.find((e) => e.type === 'land');
      const fin = next.events.find((e) => e.type === 'finish');
      const where = fin ? 'llega a la Meta' : ev ? `casilla ${ev.pos} (${SQUARE_TYPES[ev.square].label})` : '';
      return `${n(prev.teams[prev.turn].id)} gira ${next.lastSpin.value} → ${where}`;
    }
    case 'VERDICT':
      return `${n(prev.pending.team)}: ${SQUARE_TYPES[prev.pending.tipo].label} ${RESULT[action.result]}`;
    case 'COLLISION':
      return action.winner ? `Choque en cruce ${prev.pending.cruce}: prevalece ${n(action.winner)}` : `Choque en cruce ${prev.pending.cruce}: sin responsable`;
    case 'RULES':
      return 'Cambio de reglas';
    case 'SET_POS':
      return `Ajuste manual: ${n(action.team)} a casilla ${action.pos}`;
    case 'SET_TURN':
      return `Ajuste manual: turno de ${n(action.team)}`;
    case 'PASS':
      return 'Turno pasado por los expositores';
    default:
      return action.type;
  }
}

// One entry per recorded action, with the move number it belongs to.
export function describeHistory(roster, rules, history) {
  let s = createGame(roster, rules);
  const out = [];
  history.forEach((action, i) => {
    const next = reduce(s, action);
    out.push({ index: i + 1, move: next.moves, label: describeOne(action, s, next, roster) });
    s = next;
  });
  return out;
}
