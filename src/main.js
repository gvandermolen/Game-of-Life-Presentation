import { DECK_STORAGE_KEY, validateDeck } from './content/deck.js';
import { SQUARE_TYPES } from './engine/board.js';
import { newSessionData, Session } from './engine/session.js';
import { SQUARE_STYLE } from './scene/palette.js';
import { Stage } from './scene/stage.js';
import { Cards } from './ui/cards.js';
import { ConfigDrawer } from './ui/config.js';
import { download, pickFile } from './ui/dom.js';
import { Hud } from './ui/hud.js';
import { Splash, Winner } from './ui/overlays.js';
import { Sound } from './ui/sound.js';

const LAND_SOUND = { multa: 'penalty', bonus: 'bonus', control: 'penalty' };

function safeStorage() {
  try {
    const k = '__test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return null;
  }
}

class App {
  constructor() {
    this.root = document.getElementById('app');
    this.storage = safeStorage();
    this.session = Session.load(this.storage);
    this.deck = this.loadStoredDeck();
    this.sound = new Sound();
    this.busy = false;
    this.started = false;
  }

  async init() {
    await Promise.all(['400', '700', '900', 'italic 400', 'italic 700'].map((w) => document.fonts.load(`${w} 32px Bitter`))).catch(() => {});
    const settings = this.session.data.settings;
    this.sound.set({ enabled: settings.sonido, volume: settings.volumen });

    this.stage = new Stage(document.getElementById('stage'), { quality: settings.calidad, onSpinTick: () => this.sound.tick() });
    await this.stage.init(this.session.data.roster);
    this.stage.setSpeed(settings.velocidad);
    this.stage.snap(this.session.state);

    this.hud = new Hud(this.root, this);
    this.cards = new Cards(this.root, this);
    this.winner = new Winner(this.root, this);
    this.config = new ConfigDrawer(this.root, this);
    this.splash = new Splash(this.root, this);
    this.hud.render(this.session.state);
    this.splash.render();
    this.root.classList.add('pre');
    this.stage.view('intro', 0.4);

    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('pointerdown', () => this.sound.unlock(), { once: false });
  }

  name(id) {
    return this.session.data.roster.find((t) => t.id === id)?.nombre || id;
  }

  color(id) {
    return this.session.data.roster.find((t) => t.id === id)?.color;
  }

  start({ restart = false } = {}) {
    this.sound.unlock();
    if (restart) this.session.restart();
    this.started = true;
    this.splash.hide();
    this.root.classList.remove('pre');
    this.stage.snap(this.session.state);
    this.stage.view('overview', 0.9);
    this.sound.whoosh();
    this.afterState(this.session.state);
  }

  // ---- actions ----

  async act(action) {
    if (this.busy) return;
    const { prev, next, applied } = this.session.dispatch(action);
    if (!applied) return;
    this.cards.close();
    this.busy = true;
    this.hud.renderTurn(prev, this.session.data.roster, true);
    try {
      await this.play(prev, next, action);
    } finally {
      this.busy = false;
    }
    this.afterState(this.session.state);
  }

  spin() {
    const st = this.session.state;
    if (st.phase !== 'spin') return;
    const value = 1 + Math.floor(Math.random() * st.rules.spinnerMax);
    this.act({ type: 'SPIN', value });
  }

  verdict(result) {
    if (this.session.state.phase === 'card') this.act({ type: 'VERDICT', result });
  }

  collision(winner) {
    if (this.session.state.phase === 'collision') this.act({ type: 'COLLISION', winner });
  }

  // Undo / jump / restart: no animation, everything snaps to the replayed state.
  rewind(fn) {
    this.stage.skipAnimations();
    fn();
    this.cards.close();
    this.winner.close();
    this.hud.clearToasts();
    this.stage.snap(this.session.state);
    this.stage.view('overview');
    this.afterState(this.session.state);
  }

  newGame(roster) {
    this.rewind(() => this.session.restart({ roster }));
    this.stage.setRoster(roster);
    this.stage.recolor(roster);
    this.stage.snap(this.session.state);
    this.splash.render();
    this.hud.toast('Nueva partida');
  }

  factoryReset() {
    const fresh = newSessionData();
    this.session.data = fresh;
    this.rewind(() => this.session.restart({ roster: fresh.roster, rules: fresh.rules }));
    this.stage.setRoster(fresh.roster);
    this.stage.recolor(fresh.roster);
    this.stage.snap(this.session.state);
    this.clearDeck();
    this.updateSettings(fresh.settings);
  }

  afterState(state) {
    this.hud.render(state);
    this.config.refresh();
    if (!this.started) return;
    this.stage.setActive(state.phase === 'finished' ? null : state.teams[state.turn]?.id);
    const focus = state.pending?.team || state.pending?.teams?.[0];
    if (focus && this.stage.piecePosition(focus)) this.stage.frameAbove(this.stage.piecePosition(focus));
    if (state.phase === 'card') this.cards.openQuestion(state);
    else if (state.phase === 'collision') this.cards.openCollision(state);
    else if (state.phase === 'finished' && state.winner && !this.winner.isOpen()) this.winner.open(state);
  }

  // ---- animation director ----

  async play(prev, next, action) {
    const st = this.stage;
    const events = next.events;

    if (action.type === 'SET_POS' || action.type === 'SET_TURN' || action.type === 'RULES' || action.type === 'PASS') {
      for (const ev of events) {
        if (ev.type === 'skipped') this.hud.toast(`${this.name(ev.team)} pierde este turno`, 'var(--coral)');
      }
      await st.settle(next);
      if (action.type !== 'RULES') st.view('overview');
      return;
    }

    for (const ev of events) {
      switch (ev.type) {
        case 'spin': {
          this.sound.whoosh();
          await st.wait(0.35);
          await st.spin(ev.value);
          this.sound.bonus();
          this.hud.showSpin(ev.value, this.name(ev.team));
          await st.wait(0.9);
          break;
        }
        case 'move': {
          await st.wait(0.15);
          await st.walk(ev.team, ev.path, next, () => this.sound.hop());
          this.hud.renderTeams(next, this.session.data.roster);
          break;
        }
        case 'land': {
          const label = SQUARE_TYPES[ev.square].label;
          if (ev.square !== 'libre' && ev.square !== 'cruce') {
            this.hud.toast(`${this.name(ev.team)} cae en ${label}`, SQUARE_STYLE[ev.square].color);
          }
          if (LAND_SOUND[ev.square]) this.sound[LAND_SOUND[ev.square]]();
          await st.wait(0.35);
          break;
        }
        case 'shift': {
          const back = ev.to < ev.from;
          const why = ev.reason === 'multa' ? 'Multa' : ev.reason === 'colision' ? 'Choque' : back ? 'Retrocede' : 'Avanza';
          this.hud.toast(`${why}: ${this.name(ev.team)} ${back ? 'retrocede' : 'avanza'} ${Math.abs(ev.to - ev.from)}`, back ? 'var(--coral)' : 'var(--green)');
          await st.slide(ev.team, next);
          break;
        }
        case 'collision': {
          this.sound.crash();
          this.hud.toast(`¡Choque en el cruce! ${ev.teams.map((id) => this.name(id)).join(' vs ')}`, 'var(--coral)', 3200);
          await st.settle(next);
          await st.crash(ev.cruce, ev.teams);
          await st.wait(0.4);
          break;
        }
        case 'verdict':
          ev.result === 'ok' ? this.sound.good() : ev.result === 'fail' ? this.sound.bad() : null;
          break;
        case 'collisionVerdict':
          if (ev.winner) this.hud.toast(`Prevalece ${this.name(ev.winner)}`, this.color(ev.winner));
          else this.hud.toast('Sin responsable: nadie es penalizado');
          break;
        case 'extraSpin':
          this.hud.toast(`Bonus: ${this.name(ev.team)} gira otra vez`, 'var(--green)');
          break;
        case 'skipNext':
          this.hud.toast(`${this.name(ev.team)} pierde ${ev.n > 1 ? `${ev.n} turnos` : 'su próximo turno'}`, 'var(--coral)');
          break;
        case 'skipped':
          this.hud.toast(`${this.name(ev.team)} pierde este turno`, 'var(--coral)');
          break;
        case 'finish':
          this.sound.fanfare();
          this.hud.toast(`${this.name(ev.team)} llega a la Meta`, 'var(--gold)', 3500);
          await st.celebrate(ev.team);
          break;
        case 'turn':
          await st.settle(next);
          await st.wait(0.2);
          st.view('overview', 1.4);
          break;
        default:
      }
    }
    await st.settle(next);
  }

  // ---- commands & keyboard ----

  command(name) {
    switch (name) {
      case 'undo':
        if (this.session.canUndo()) this.rewind(() => this.session.undo());
        break;
      case 'redo':
        if (this.session.canRedo()) this.rewind(() => this.session.redo());
        break;
      case 'overview':
        this.stage.view('overview');
        break;
      case 'legend':
        this.updateSettings({ leyenda: !this.session.data.settings.leyenda });
        break;
      case 'sound':
        this.sound.unlock();
        this.updateSettings({ sonido: !this.session.data.settings.sonido });
        break;
      case 'full':
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => {});
        break;
      case 'config':
        this.config.toggle();
        break;
      default:
    }
  }

  primary() {
    if (this.splash.isOpen()) return this.start();
    if (this.busy) return this.stage.skipAnimations();
    if (this.winner.isOpen()) return this.winner.close();
    const st = this.session.state;
    if (st.phase === 'spin') this.spin();
  }

  onKey(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    this.sound.unlock();
    const k = e.key;

    if (k === 'Escape') {
      if (this.config.isOpen()) this.config.close();
      else if (this.winner.isOpen()) this.winner.close();
      return;
    }
    if (k === 'c' || k === 'C') return this.command('config');
    if (this.config.isOpen()) return;

    if (k === ' ' || k === 'ArrowRight' || k === 'PageDown' || k === 'Enter') {
      e.preventDefault();
      if (!this.busy && this.cards.isOpen() && this.cards.key(e)) return;
      if (this.cards.isOpen() && !this.busy) return;
      return this.primary();
    }
    if (this.splash.isOpen() || this.busy) return;
    if (this.cards.isOpen() && this.cards.key(e)) return;

    switch (k.toLowerCase()) {
      case 'z':
        return this.command(e.shiftKey ? 'redo' : 'undo');
      case 'y':
        return this.command('redo');
      case 'v':
        return this.command('overview');
      case 'l':
        return this.command('legend');
      case 'm':
        return this.command('sound');
      case 'f':
        return this.command('full');
      default:
    }
    if (/^[1-6]$/.test(k) && !this.cards.isOpen()) {
      const t = this.session.state.teams[Number(k) - 1];
      if (t) this.stage.follow(t.id, { rate: 1.8 });
    }
  }

  // ---- settings & data ----

  updateSettings(patch, { quiet = false } = {}) {
    const before = this.session.data.settings.calidad;
    this.session.updateSettings(patch);
    const s = this.session.data.settings;
    this.sound.set({ enabled: s.sonido, volume: s.volumen });
    this.stage.setSpeed(s.velocidad);
    if (s.calidad !== before) {
      location.reload();
      return;
    }
    this.hud.render(this.session.state);
    if (!quiet) this.config.refresh();
    this.splash.render();
  }

  updateTeam(id, patch) {
    this.session.updateRosterCosmetics(id, patch);
    if (patch.color) this.stage.recolor(this.session.data.roster);
    this.hud.render(this.session.state);
  }

  exportSession() {
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    download(`partida_${stamp}.json`, this.session.exportJSON());
  }

  async importSession() {
    const text = await pickFile();
    if (!text) return;
    try {
      this.rewind(() => this.session.importJSON(text));
      this.stage.setRoster(this.session.data.roster);
      this.stage.recolor(this.session.data.roster);
      this.stage.snap(this.session.state);
      this.hud.toast('Partida importada');
    } catch (err) {
      this.hud.toast(`No se pudo importar: ${err.message}`, 'var(--coral)', 4000);
    }
  }

  loadStoredDeck() {
    try {
      const raw = this.storage?.getItem(DECK_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async loadDeck() {
    const text = await pickFile();
    if (!text) return;
    try {
      const deck = JSON.parse(text);
      const err = validateDeck(deck);
      if (err) throw new Error(err);
      this.deck = deck;
      this.storage?.setItem(DECK_STORAGE_KEY, JSON.stringify(deck));
      this.hud.toast(`Contenido cargado: ${deck.cartas.length} cartas`);
    } catch (err) {
      this.hud.toast(`Contenido inválido: ${err.message}`, 'var(--coral)', 4500);
    }
    this.config.refresh();
  }

  clearDeck() {
    this.deck = null;
    this.storage?.removeItem(DECK_STORAGE_KEY);
    this.config?.refresh();
  }
}

const app = new App();
window.__juego = app;
app.init().catch((err) => {
  console.error(err);
  document.getElementById('app').insertAdjacentHTML(
    'beforeend',
    `<div style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:18px Bitter,Georgia,serif;text-align:center;padding:40px">No se pudo iniciar el tablero 3D.<br>Probá con Chrome, Edge o Safari actualizados.<br><small style="opacity:.6">${String(err.message || err)}</small></div>`,
  );
});
