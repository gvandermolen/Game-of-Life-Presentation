import { TITULO } from '../content/guion.js';
import { START, choose, isValid, next, same } from './flow.js';

export const STORE_VERSION = 2;
export const STORAGE_KEY = 'destino-sano-y-salvo.v2';

export const DEFAULT_SETTINGS = {
  titulo: TITULO,
  calidad: 'alto', // 'alto' | 'medio' | 'bajo'
  sonido: true,
  volumen: 0.7,
  velocidad: 1, // animation speed multiplier
};

const MAX_BACK = 400;

function valid(data) {
  return data && data.v === STORE_VERSION && isValid(data.state) && Array.isArray(data.back) && data.back.every(isValid) && (!data.fwd || data.fwd.every(isValid));
}

// Current script position plus the way back (and forward again after going back).
// Persisted on every change so a reload resumes where the class was.
export class Store {
  constructor(storage, data) {
    this.storage = storage;
    this.data = valid(data) ? data : Store.fresh();
    this.data.settings = { ...DEFAULT_SETTINGS, ...this.data.settings };
    if (typeof this.data.settings.titulo !== 'string' || !this.data.settings.titulo.trim()) this.data.settings.titulo = TITULO;
    this.data.fwd ||= [];
  }

  static fresh(settings = DEFAULT_SETTINGS) {
    return { v: STORE_VERSION, state: START, back: [], fwd: [], settings: { ...settings } };
  }

  static load(storage) {
    let data = null;
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch {
      data = null;
    }
    return new Store(storage, data);
  }

  get state() {
    return this.data.state;
  }

  get settings() {
    return this.data.settings;
  }

  save() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage blocked (private mode): the game keeps running in memory.
    }
  }

  // Move to `state`, remembering where we were. Returns { prev, next } or null.
  go(state) {
    const prev = this.data.state;
    if (same(prev, state)) return null;
    this.data.back.push(prev);
    if (this.data.back.length > MAX_BACK) this.data.back.shift();
    this.data.fwd = [];
    this.data.state = state;
    this.save();
    return { prev, next: state };
  }

  next() {
    return this.go(next(this.state));
  }

  choose(choice) {
    return this.go(choose(this.state, choice));
  }

  canBack() {
    return this.data.back.length > 0;
  }

  canForward() {
    return this.data.fwd.length > 0;
  }

  back() {
    if (!this.canBack()) return null;
    const prev = this.data.state;
    this.data.fwd.push(prev);
    this.data.state = this.data.back.pop();
    this.save();
    return { prev, next: this.data.state };
  }

  forward() {
    if (!this.canForward()) return null;
    const prev = this.data.state;
    this.data.back.push(prev);
    this.data.state = this.data.fwd.pop();
    this.save();
    return { prev, next: this.data.state };
  }

  jump(state) {
    return this.go(state);
  }

  restart() {
    this.data = Store.fresh(this.data.settings);
    this.save();
  }

  updateSettings(patch) {
    this.data.settings = { ...this.data.settings, ...patch };
    this.save();
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
