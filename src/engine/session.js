import { createGame, reduce, replay } from './reducer.js';
import { defaultRoster } from './roster.js';
import { DEFAULT_RULES } from './rules.js';

export const SESSION_VERSION = 1;
export const STORAGE_KEY = 'jurisprudencia-en-ruta.session.v1';

export const DEFAULT_SETTINGS = {
  titulo: 'Jurisprudencia en Ruta',
  subtitulo: 'Transporte tradicional y plataformas · Facultad de Derecho · UBA',
  calidad: 'alto', // 'alto' | 'medio' | 'bajo'
  sonido: true,
  volumen: 0.7,
  velocidad: 1, // animation speed multiplier
  leyenda: true,
};

export function newSessionData(roster = defaultRoster(), rules = DEFAULT_RULES, settings = DEFAULT_SETTINGS) {
  return {
    v: SESSION_VERSION,
    roster: structuredClone(roster),
    rules: structuredClone(rules),
    history: [],
    redo: [],
    settings: { ...DEFAULT_SETTINGS, ...settings },
    savedAt: Date.now(),
  };
}

export function validateSessionData(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.v !== SESSION_VERSION) return false;
  if (!Array.isArray(data.roster) || !Array.isArray(data.history)) return false;
  return data.roster.every((t) => typeof t.id === 'string' && Number.isInteger(t.lane));
}

// Session wraps the persisted data and caches the replayed state.
export class Session {
  constructor(storage, data) {
    this.storage = storage;
    this.data = data && validateSessionData(data) ? data : newSessionData();
    this.data.redo ||= [];
    this.listeners = new Set();
    this.recompute();
  }

  static load(storage) {
    let data = null;
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch {
      data = null;
    }
    return new Session(storage, data);
  }

  initial() {
    return createGame(this.data.roster, this.data.rules);
  }

  recompute() {
    this.state = replay(this.initial(), this.data.history);
  }

  save() {
    this.data.savedAt = Date.now();
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage full or blocked (e.g. private mode): the game keeps running in memory.
    }
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(info) {
    for (const fn of this.listeners) fn(this.state, info);
  }

  // Returns { prev, next, applied }. Rejected actions are not recorded.
  dispatch(action) {
    const prev = this.state;
    const next = reduce(prev, action);
    if (next === prev) return { prev, next, applied: false };
    this.data.history.push(action);
    this.data.redo = [];
    this.state = next;
    this.save();
    this.emit({ kind: 'action', action, prev });
    return { prev, next, applied: true };
  }

  canUndo() {
    return this.data.history.length > 0;
  }

  canRedo() {
    return this.data.redo.length > 0;
  }

  undo() {
    if (!this.canUndo()) return false;
    this.data.redo.push(this.data.history.pop());
    this.recompute();
    this.save();
    this.emit({ kind: 'rewind' });
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    this.data.history.push(this.data.redo.pop());
    this.recompute();
    this.save();
    this.emit({ kind: 'rewind' });
    return true;
  }

  // Keep only the first `n` actions; the rest go to the redo stack.
  jumpTo(n) {
    const h = this.data.history;
    const target = Math.max(0, Math.min(h.length + this.data.redo.length, n));
    while (h.length > target) this.data.redo.push(h.pop());
    while (h.length < target && this.data.redo.length) h.push(this.data.redo.pop());
    this.recompute();
    this.save();
    this.emit({ kind: 'rewind' });
  }

  // Jump to the state right after the N-th spin (0 = start of game).
  jumpToMove(move) {
    const all = [...this.data.history, ...[...this.data.redo].reverse()];
    let spins = 0;
    let idx = 0;
    if (move > 0) {
      idx = all.length;
      for (let i = 0; i < all.length; i++) {
        if (all[i].type === 'SPIN') spins++;
        if (spins === move) {
          idx = i + 1;
          // Include the follow-up decisions of that move (cards, collisions).
          while (idx < all.length && all[idx].type !== 'SPIN') idx++;
          break;
        }
      }
    }
    this.jumpTo(idx);
  }

  restart({ roster, rules } = {}) {
    if (roster) this.data.roster = structuredClone(roster);
    if (rules) this.data.rules = structuredClone(rules);
    this.data.history = [];
    this.data.redo = [];
    this.recompute();
    this.save();
    this.emit({ kind: 'restart' });
  }

  updateSettings(patch) {
    this.data.settings = { ...this.data.settings, ...patch };
    this.save();
    this.emit({ kind: 'settings' });
  }

  updateRosterCosmetics(id, patch) {
    const t = this.data.roster.find((r) => r.id === id);
    if (!t) return;
    if (patch.nombre != null) t.nombre = patch.nombre;
    if (patch.color != null) t.color = patch.color;
    this.save();
    this.emit({ kind: 'settings' });
  }

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(text) {
    const data = JSON.parse(text);
    if (!validateSessionData(data)) throw new Error('Archivo de partida inválido');
    data.redo ||= [];
    this.data = data;
    this.recompute();
    this.save();
    this.emit({ kind: 'restart' });
  }
}

export function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
