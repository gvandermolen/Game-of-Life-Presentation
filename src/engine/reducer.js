import { LANE_LENGTH, crossingAt, isCruce, squareAt } from './board.js';
import { DEFAULT_RULES, mergeRules } from './rules.js';

// The whole game is `history.reduce(reduce, createGame(roster))`.
// Actions must carry every random value (e.g. the spin result) so replay is exact.

export function createGame(roster, rules = DEFAULT_RULES) {
  const active = roster.filter((t) => t.enabled);
  return {
    rules: mergeRules(DEFAULT_RULES, rules),
    teams: active.map((t) => ({
      id: t.id,
      lane: t.lane,
      pos: 0,
      skip: 0,
      finished: false,
      place: null,
    })),
    turn: 0,
    phase: active.length ? 'spin' : 'idle',
    pending: null,
    counters: { pregunta: 0, dilema: 0, apelacion: 0, colision: 0 },
    moves: 0,
    winner: null,
    finishedCount: 0,
    lastSpin: null,
    events: [],
  };
}

export function currentTeam(state) {
  return state.teams[state.turn] || null;
}

export function teamById(state, id) {
  return state.teams.find((t) => t.id === id) || null;
}

function clampPos(p) {
  return Math.max(0, Math.min(LANE_LENGTH, p));
}

function finishTeam(s, team) {
  team.pos = LANE_LENGTH;
  team.finished = true;
  s.finishedCount += 1;
  team.place = s.finishedCount;
  s.events.push({ type: 'finish', team: team.id, place: team.place });
  if (!s.winner) {
    s.winner = team.id;
    s.phase = 'finished';
    s.pending = null;
    return true;
  }
  return false;
}

function nextTurn(s) {
  s.pending = null;
  const n = s.teams.length;
  if (s.teams.every((t) => t.finished)) {
    s.phase = 'finished';
    return;
  }
  for (let guard = 0; guard < 200; guard++) {
    s.turn = (s.turn + 1) % n;
    const t = s.teams[s.turn];
    if (t.finished) continue;
    if (t.skip > 0) {
      t.skip -= 1;
      s.events.push({ type: 'skipped', team: t.id });
      continue;
    }
    break;
  }
  s.phase = 'spin';
  s.events.push({ type: 'turn', team: s.teams[s.turn].id });
}

function shift(s, team, delta, reason) {
  if (!delta) return false;
  const from = team.pos;
  const to = clampPos(from + delta);
  if (to === from) return false;
  team.pos = to;
  s.events.push({ type: 'shift', team: team.id, from, to, reason });
  if (to >= LANE_LENGTH) return finishTeam(s, team);
  return false;
}

function land(s, team) {
  const pos = team.pos;
  const type = squareAt(team.lane, pos);
  s.events.push({ type: 'land', team: team.id, pos, square: type });
  const fx = s.rules.efectos;

  switch (type) {
    case 'cruce': {
      const id = crossingAt(team.lane, pos);
      const others = s.teams.filter((t) => t !== team && !t.finished && crossingAt(t.lane, t.pos) === id);
      if (others.length) {
        const teams = [team.id, ...others.map((t) => t.id)];
        s.phase = 'collision';
        s.pending = { kind: 'colision', cruce: id, teams, seq: s.counters.colision++ };
        s.events.push({ type: 'collision', cruce: id, teams });
        return;
      }
      return nextTurn(s);
    }
    case 'pregunta':
    case 'dilema':
    case 'apelacion':
      s.phase = 'card';
      s.pending = { kind: 'carta', tipo: type, team: team.id, seq: s.counters[type]++ };
      s.events.push({ type: 'card', tipo: type, team: team.id });
      return;
    case 'multa':
      if (shift(s, team, fx.multa, 'multa')) return;
      return nextTurn(s);
    case 'bonus':
      s.phase = 'spin';
      s.events.push({ type: 'extraSpin', team: team.id });
      return;
    case 'control':
      team.skip += fx.controlTurnos;
      s.events.push({ type: 'skipNext', team: team.id, n: fx.controlTurnos });
      return nextTurn(s);
    default:
      return nextTurn(s);
  }
}

function doSpin(s, value) {
  const team = currentTeam(s);
  const v = Math.max(1, Math.min(s.rules.spinnerMax, Math.round(value)));
  s.moves += 1;
  s.lastSpin = { team: team.id, value: v };
  s.events.push({ type: 'spin', team: team.id, value: v });

  const from = team.pos;
  const path = [];
  let p = from;
  for (let i = 0; i < v; i++) {
    p += 1;
    path.push(p);
    if (p >= LANE_LENGTH) break;
    if (s.rules.crucesObligatorios && isCruce(p)) break;
  }
  team.pos = clampPos(p);
  s.events.push({ type: 'move', team: team.id, from, path });

  if (team.pos >= LANE_LENGTH) {
    if (finishTeam(s, team)) return;
    return nextTurn(s);
  }
  land(s, team);
}

function doVerdict(s, result) {
  const team = teamById(s, s.pending.team);
  const tipo = s.pending.tipo;
  s.events.push({ type: 'verdict', team: team.id, tipo, result });
  const fx = s.rules.efectos;
  const delta = result === 'ok' ? fx[`${tipo}Ok`] : result === 'fail' ? fx[`${tipo}Fail`] : 0;
  if (shift(s, team, delta, `${tipo}-${result}`)) return;
  nextTurn(s);
}

function doCollision(s, winner) {
  const { teams } = s.pending;
  const losers = winner ? teams.filter((id) => id !== winner) : [];
  s.events.push({ type: 'collisionVerdict', winner: winner || null, losers });
  const { penalidad, casillas } = s.rules.colision;
  for (const id of losers) {
    const t = teamById(s, id);
    if (penalidad === 'perderTurno' || penalidad === 'ambas') {
      t.skip += 1;
      s.events.push({ type: 'skipNext', team: id, n: 1 });
    }
    if (penalidad === 'retroceder' || penalidad === 'ambas') {
      shift(s, t, -Math.abs(casillas), 'colision');
    }
  }
  nextTurn(s);
}

export function reduce(state, action) {
  const s = structuredClone(state);
  s.events = [];

  switch (action.type) {
    case 'SPIN':
      if (s.phase !== 'spin') return state;
      doSpin(s, action.value);
      return s;
    case 'VERDICT':
      if (s.phase !== 'card') return state;
      doVerdict(s, action.result);
      return s;
    case 'COLLISION':
      if (s.phase !== 'collision') return state;
      if (action.winner && !s.pending.teams.includes(action.winner)) return state;
      doCollision(s, action.winner);
      return s;
    case 'RULES':
      s.rules = mergeRules(s.rules, action.rules);
      s.events.push({ type: 'rules' });
      return s;
    case 'SET_POS': {
      const t = teamById(s, action.team);
      if (!t) return state;
      const from = t.pos;
      t.pos = clampPos(action.pos);
      if (t.pos < LANE_LENGTH && t.finished) {
        t.finished = false;
        t.place = null;
        s.finishedCount = Math.max(0, s.finishedCount - 1);
        if (s.winner === t.id) {
          s.winner = null;
          if (s.phase === 'finished') s.phase = 'spin';
        }
      }
      s.events.push({ type: 'shift', team: t.id, from, to: t.pos, reason: 'manual' });
      if (t.pos >= LANE_LENGTH && !t.finished) finishTeam(s, t);
      return s;
    }
    case 'SET_TURN': {
      const idx = s.teams.findIndex((t) => t.id === action.team);
      if (idx < 0 || s.teams[idx].finished) return state;
      s.turn = idx;
      s.pending = null;
      if (s.phase !== 'finished') s.phase = 'spin';
      s.events.push({ type: 'turn', team: action.team });
      return s;
    }
    case 'PASS':
      if (s.phase === 'finished' || s.phase === 'idle') return state;
      nextTurn(s);
      return s;
    default:
      return state;
  }
}

export function replay(initial, history, upTo = history.length) {
  let s = initial;
  for (let i = 0; i < upTo; i++) s = reduce(s, history[i]);
  return s;
}
