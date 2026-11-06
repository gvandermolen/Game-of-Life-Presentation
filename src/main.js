import { AUTOS, GIROS, casilla } from './content/guion.js';
import { FORK, turnInfo } from './engine/flow.js';
import { Store } from './engine/store.js';
import { forkAceptar, forkLeer, forkNegociar, playMove } from './scene/fx.js';
import { DESTINO_POS, MAIN, destinoSlot, queueSlot, squareS } from './scene/layout.js';
import { Stage } from './scene/stage.js';
import { Cards } from './ui/cards.js';
import { Effects } from './ui/effects.js';
import { Hud } from './ui/hud.js';
import { Menu, Resume } from './ui/menu.js';
import { Finale, Fork, Phone, Transition } from './ui/scenes.js';
import { Sound } from './ui/sound.js';

// Phases shown full screen, without the board HUD.
const PRE = ['transicion', 'celular', 'celular2', 'clausulas'];

// Halfway between the house and the last parked car.
const ARRIVAL = DESTINO_POS.clone().lerp(MAIN.at(destinoSlot(0)).p, 0.5);

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

// The director: every click moves the script one step (store), plays the
// animation between the two steps, then makes the screen match the new step.
// Going back or jumping skips the animation and redraws the step directly.
class App {
  constructor() {
    this.root = document.getElementById('app');
    this.store = Store.load(safeStorage());
    this.sound = new Sound();
    this.busy = false;
    this.after = null;
  }

  async init() {
    await Promise.all(['400', '700', '900', 'italic 400', 'italic 700'].map((w) => document.fonts.load(`${w} 32px Bitter`))).catch(() => {});
    const s = this.store.settings;
    this.sound.set({ enabled: s.sonido, volume: s.volumen });

    this.stage = new Stage(document.getElementById('stage'), { quality: s.calidad, onSpinTick: () => this.sound.tick() });
    await this.stage.init();
    this.stage.setSpeed(s.velocidad);

    this.hud = new Hud(this.root, this);
    this.effects = new Effects(this.root, this);
    this.transition = new Transition(this.root);
    this.fork = new Fork(this.root, this);
    this.finale = new Finale(this.root, this);
    this.cards = new Cards(this.root, this);
    this.phone = new Phone(this.root, this);
    this.menu = new Menu(this.root, this);
    this.resume = new Resume(this.root, this);
    this.stage.onFrame = () => {
      this.hud.updateTags();
      this.effects.update();
    };
    // What the board animations may ask of the HTML layer.
    this.ui = {
      storm: (on) => this.effects.storm(on),
      lightning: () => this.effects.lightning(),
      bubble: (kind, pos, seconds) => this.effects.bubble(kind, pos, seconds),
      adhesion: () => this.fork.adhesion(),
      terms: () => this.fork.terms(),
    };

    const state = this.store.state;
    this.stage.snap(state);
    this.show(state);
    if (state.phase !== 'transicion') this.resume.show(state);

    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('pointerdown', () => this.sound.wake());
    document.getElementById('stage').addEventListener('click', () => {
      if (!this.busy && this.store.state.phase !== 'bifurcacion') this.next();
    });
  }

  // ---------------------------------------------------------------- actions

  next() {
    if (this.resume.isOpen()) return this.resume.hide();
    if (this.busy) return this.skip();
    const phase = this.store.state.phase;
    if (phase === 'bifurcacion' || phase === 'clausulas') return;
    const r = this.store.next();
    if (r) this.run(r);
  }

  choose(choice) {
    if (this.busy || this.resume.isOpen() || this.store.state.phase !== 'bifurcacion') return;
    const r = this.store.choose(choice);
    if (r) this.run(r, choice);
  }

  back() {
    if (this.busy) return this.finishThen(() => this.back());
    const r = this.store.back();
    if (r) this.redraw(r.next);
  }

  jump(state) {
    if (this.busy) return this.finishThen(() => this.jump(state));
    const r = this.store.jump(state);
    if (r) this.redraw(r.next);
  }

  restart() {
    if (this.busy) return this.finishThen(() => this.restart());
    this.store.restart();
    this.redraw(this.store.state);
  }

  // Space during an animation: a sign or the terms scroll is cut short on its
  // own (the last line of the terms still shows); anything else finishes the step.
  skip() {
    if (this.fork.skip()) return;
    this.stage.skipAnimations();
  }

  finishThen(fn) {
    this.after = fn;
    this.fork.skip();
    this.stage.skipAnimations();
  }

  async run({ prev, next }, choice) {
    this.busy = true;
    this.root.classList.add('busy');
    try {
      await this.play(prev, next, choice);
    } catch (err) {
      console.error(err);
    }
    this.stage.endSkip();
    this.busy = false;
    this.root.classList.remove('busy');
    if (!(next.phase === 'turno' && next.step !== 'listo')) this.stage.snap(next);
    this.show(next);
    if (this.after) {
      const fn = this.after;
      this.after = null;
      fn();
    }
  }

  redraw(state) {
    this.fork.closeAll();
    this.effects.clear();
    this.stage.snap(state);
    this.show(state);
  }

  // ---------------------------------------------------------------- screen

  // Make every overlay and the camera match a step. Safe to call repeatedly.
  show(state) {
    const p = state.phase;
    this.root.classList.toggle('pre', PRE.includes(p));
    this.transition.show(p === 'transicion');
    if (p === 'celular') this.phone.show('inicio');
    else if (p === 'celular2' || p === 'clausulas') this.phone.show('final', { clauses: p === 'clausulas' });
    else this.phone.hide();
    this.fork.show(p === 'bifurcacion' ? state : null);
    this.finale.arrival(p === 'llegada');
    this.finale.sentencias(p === 'sentencias' ? state.shown : 0);
    this.finale.ruedita(p === 'ruedita');
    if (p === 'turno' && state.step !== 'listo') this.cards.show(state.turn, state.step);
    else this.cards.close();
    this.hud.render(state);

    const st = this.stage;
    if (PRE.includes(p)) st.view('intro', 1.2);
    else if (p === 'bifurcacion') st.view('fork');
    else if (p === 'turno') {
      if (state.step === 'listo') st.view('overview', 1.4);
      else st.frameCard(st.pieces[turnInfo(state.turn).car].position);
    } else if (p === 'llegada') st.focusPoint(ARRIVAL, { dist: 12, height: 11 });
    else if (p === 'ruedita') st.view('spinner');
    else st.view('overview');
  }

  // ---------------------------------------------------------------- animations

  async play(prev, next, choice) {
    const st = this.stage;
    switch (prev.phase) {
      case 'transicion':
        this.transition.show(false);
        this.sound.whoosh();
        await st.wait(0.35);
        return;
      case 'celular':
        await this.phone.accept();
        this.root.classList.remove('pre');
        st.view('salida', 1.4);
        await st.wait(0.5);
        await st.appear(() => this.sound.pop());
        st.view('fork', 1.2);
        await st.wait(0.5);
        return;
      case 'bifurcacion':
        this.fork.hide();
        st.view(choice === 'negociar' ? 'barrier' : 'fork', 1.4);
        if (choice === 'negociar') await forkNegociar(st, { sound: this.sound, ui: this.ui });
        else if (choice === 'leer') await forkLeer(st, { ui: this.ui });
        else await forkAceptar(st);
        if (next.phase === 'turno') {
          st.view('overview', 1.2);
          await st.wait(0.6);
        }
        return;
      case 'turno':
        if (prev.step === 'listo') return this.playTurn(prev.turn);
        if (prev.step === 'pregunta') return this.cards.show(prev.turn, 'respuesta');
        this.cards.close();
        this.effects.clear();
        st.tidy();
        if (next.phase === 'llegada') {
          st.setActive(null);
          st.focusPoint(ARRIVAL, { dist: 12, height: 11, rate: 1.4 });
          await st.arrive();
          this.finale.arrival(true, { fanfare: true });
          await st.wait(0.8);
        }
        return;
      case 'llegada':
      case 'sentencias':
        if (next.phase === 'sentencias') {
          this.finale.arrival(false);
          this.finale.sentencias(next.shown, { animate: true });
          await st.wait(1.3);
        } else {
          this.finale.sentencias(0);
          st.view('spinner');
          await st.wait(0.7);
        }
        return;
      case 'ruedita':
        this.finale.ruedita(false);
        st.view('intro', 1.2);
        await st.wait(0.6);
        return;
      case 'celular2':
        this.phone.showClauses();
        await st.wait(0.6);
        return;
      default:
    }
  }

  // Spin (rigged), drive with the square's animation, reveal the plaque, open the card.
  async playTurn(t) {
    const st = this.stage;
    const { car, square } = turnInfo(t);
    const c = casilla(t);
    this.effects.clear();
    st.tidy();
    st.setActive(car);
    st.view('spinner', 2.0);
    await st.wait(0.7);
    this.sound.whoosh();
    await st.spin(GIROS[t]);
    this.sound.bonus();
    this.hud.showSpin(GIROS[t], AUTOS[car].grupo);
    await st.wait(1.0);
    st.follow(car, { dist: 11, height: 10.5, rate: 1.6 });
    const fromS = st.at[car]?.s ?? queueSlot(car);
    await playMove(st, c.anim, { car, fromS, toS: squareS(square), sound: this.sound, ui: this.ui });
    if (c.anim === 'martillo' || c.anim === 'sello') {
      st.focusPoint(st.pieces[car].position, { dist: 10, height: 9 });
      await (c.anim === 'martillo' ? this.effects.gavel() : this.effects.stamp());
    }
    await st.popPlaque(square);
    await st.wait(0.3);
    st.frameCard(st.pieces[car].position);
    this.cards.show(t, 'pregunta');
  }

  // ---------------------------------------------------------------- commands

  command(name) {
    switch (name) {
      case 'back':
        return this.back();
      case 'overview':
        return this.stage.view('overview');
      case 'sound':
        this.sound.wake();
        return this.updateSettings({ sonido: !this.store.settings.sonido });
      case 'full':
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => {});
        return;
      case 'menu':
        return this.menu.toggle();
      default:
    }
  }

  updateSettings(patch) {
    const before = this.store.settings.calidad;
    this.store.updateSettings(patch);
    const s = this.store.settings;
    this.sound.set({ enabled: s.sonido, volume: s.volumen });
    this.stage.setSpeed(s.velocidad);
    if (s.calidad !== before) return location.reload();
    this.hud.render(this.store.state);
  }

  onKey(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    this.sound.wake();
    const k = e.key;
    if (k === 'Escape') {
      if (this.menu.isOpen()) this.menu.close();
      else if (this.resume.isOpen()) this.resume.hide();
      return;
    }
    if (k === 'g' || k === 'G') return this.menu.toggle();
    if (this.menu.isOpen()) return;

    if (k === ' ' || k === 'ArrowRight' || k === 'PageDown' || k === 'Enter') {
      e.preventDefault();
      return this.next();
    }
    if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') {
      e.preventDefault();
      if (this.resume.isOpen()) return;
      return this.back();
    }
    if (/^[1-3]$/.test(k)) return this.choose(FORK[Number(k) - 1]);
    switch (k.toLowerCase()) {
      case 'v':
        return this.command('overview');
      case 'm':
        return this.command('sound');
      case 'f':
        return this.command('full');
      default:
    }
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
