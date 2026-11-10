import { AUTOS, AUTO_VUELTA, GIROS_JUEGO, GIROS_VUELTA, TITULO, casilla } from './content/guion.js';
import { FORK, LAP_POS, LAP_SQUARES, turnInfo } from './engine/flow.js';
import { Store } from './engine/store.js';
import { forkAceptar, forkLeer, forkNegociar, playMove } from './scene/fx.js';
import { INICIO_S, squareS } from './scene/layout.js';
import { LAP_CAR, Stage } from './scene/stage.js';
import { Cards } from './ui/cards.js';
import { Effects } from './ui/effects.js';
import { Hud } from './ui/hud.js';
import { Menu, Resume } from './ui/menu.js';
import { Finale, Fork, Phone } from './ui/scenes.js';
import { Slides } from './ui/slides.js';
import { Sound } from './ui/sound.js';

// Phases shown full screen, without the board HUD.
const PRE = ['celular', 'celular2', 'clausulas'];

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
    document.title = s.titulo;

    this.stage = new Stage(document.getElementById('stage'), { quality: s.calidad, title: s.titulo, onSpinTick: () => this.sound.tick() });
    await this.stage.init();
    this.stage.setSpeed(s.velocidad);

    this.hud = new Hud(this.root, this);
    this.effects = new Effects(this.root, this);
    this.slides = new Slides(this.root, this);
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
      bubble: (kind, pos, seconds, extra) => this.effects.bubble(kind, pos, seconds, extra),
      gavel: () => this.effects.gavel(),
      adhesion: () => this.fork.adhesion(),
      terms: () => this.fork.terms(),
    };

    const state = this.store.state;
    this.stage.snap(state);
    this.show(state);
    if (!(state.phase === 'vuelta' && state.stop === 0)) this.resume.show(state);

    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('pointerdown', () => this.sound.wake());
    document.getElementById('stage').addEventListener('click', () => {
      if (!this.busy && this.store.state.phase !== 'bifurcacion') this.next();
    });
  }

  // ---------------------------------------------------------------- actions

  next() {
    if (this.resume.isOpen()) return this.resume.hide();
    if (this.menu.isOpen()) return this.menu.close();
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

  // Space during an animation: the terms scroll is cut short on its own;
  // anything else finishes the step.
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
    // Mid-turn the board keeps what the animation left (a branch on the roof,
    // a bump on the head) until the card closes.
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
    if (p === 'celular') this.phone.show('inicio');
    else if (p === 'celular2' || p === 'clausulas') this.phone.show('final', { clauses: p === 'clausulas' });
    else this.phone.hide();
    this.slides.show(p === 'vuelta' ? state : null);
    this.slides.arrival(p === 'meta');
    this.fork.show(p === 'bifurcacion' ? state : null);
    this.finale.arrival(p === 'llegada');
    this.finale.sentencias(p === 'sentencias' ? state.shown : 0);
    this.finale.ruedita(p === 'ruedita' ? state : null);
    if (p === 'turno' && ['pregunta', 'respuesta'].includes(state.step)) this.cards.show(state.turn, state.step);
    else this.cards.close();
    this.hud.render(state);

    const st = this.stage;
    if (PRE.includes(p)) st.view('intro', 1.2);
    else if (p === 'vuelta') {
      if (state.step === 'listo') st.view('overview', 1.3);
      else st.frameSlide(st.pieces[LAP_CAR].position);
    } else if (p === 'meta') st.view('meta', 1.4);
    else if (p === 'bifurcacion') st.view('fork');
    else if (p === 'turno') {
      if (state.step === 'listo') st.view('overview', 1.4);
      else if (state.step === 'girado') st.view('spinner');
      else st.frameCard(st.pieces[turnInfo(state.turn).car].position);
    } else if (p === 'llegada') st.view('casa', 1.4);
    else if (p === 'ruedita') st.view('spinner');
    else st.view('overview');
  }

  // ---------------------------------------------------------------- animations

  async play(prev, next, choice) {
    const st = this.stage;
    switch (prev.phase) {
      case 'vuelta':
        if (prev.step === 'listo') return this.playLap(prev.stop + 1);
        if (next.step === 'listo') {
          this.slides.close();
          this.sound.whoosh();
          st.view('overview', 1.3);
          await st.wait(0.45);
        }
        return;
      case 'meta':
        this.slides.arrival(false);
        this.sound.whoosh();
        await st.wait(0.3);
        return;
      case 'celular':
        await this.phone.accept();
        this.root.classList.remove('pre');
        st.setWorld('juego');
        st.pieces[LAP_CAR].visible = false;
        st.view('salida', 1.4);
        await st.wait(0.5);
        await st.appear(() => this.sound.pop());
        st.view('fork', 1.2);
        await st.wait(0.5);
        return;
      case 'bifurcacion': {
        const car = prev.car;
        this.fork.hide();
        st.setActive(car);
        st.view(choice === 'negociar' ? 'barrier' : 'fork', 1.4);
        if (choice === 'negociar') await forkNegociar(st, { car, sound: this.sound, ui: this.ui });
        else if (choice === 'leer') await forkLeer(st, { car, ui: this.ui });
        else await forkAceptar(st, { car });
        if (next.phase === 'turno') {
          st.view('overview', 1.2);
          await st.wait(0.6);
        }
        return;
      }
      case 'turno':
        return this.playTurn(prev, next);
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
        if (next.phase === 'ruedita') {
          this.finale.ruedita(next);
          this.sound.bonus();
          await st.wait(0.6);
          return;
        }
        this.finale.ruedita(null);
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

  // Spin (rigged) and hop the class car square by square to content square n,
  // or to Destino after the last one; then the slide title, or the arrival sign.
  async playLap(n) {
    const st = this.stage;
    const value = GIROS_VUELTA[n - 1];
    const from = n > 1 ? LAP_POS[n - 2] : 0;
    const to = LAP_POS[n - 1];
    st.tidy();
    st.setActive(LAP_CAR);
    st.view('spinner', 2.0);
    await st.wait(0.6);
    this.sound.whoosh();
    await st.spin(value);
    this.sound.bonus();
    this.hud.showSpin(value, AUTO_VUELTA.nombre);
    await st.wait(0.8);
    st.follow(LAP_CAR, { dist: 13, height: 13, rate: 2.4 });
    await st.hopLap(from, to, () => this.sound.tick());
    if (to === LAP_SQUARES) {
      st.view('meta', 1.4);
      await st.raiseFlag();
      this.slides.arrival(true, { fanfare: true });
      await st.wait(0.8);
      return;
    }
    st.frameSlide(st.pieces[LAP_CAR].position);
    await st.wait(0.35);
  }

  // One click per step: spin, move (with the square's animation), the card,
  // the answer, then close and hand over to the next car. In the last round
  // the click after the spin drives the car to Destino.
  async playTurn(prev, next) {
    const st = this.stage;
    const t = prev.turn;
    const { car, square, final } = turnInfo(t);
    switch (prev.step) {
      case 'listo':
        this.effects.clear();
        st.tidy();
        st.setActive(car);
        st.view('spinner', 2.0);
        await st.wait(0.7);
        this.sound.whoosh();
        await st.spin(GIROS_JUEGO[t]);
        this.sound.bonus();
        this.hud.showSpin(GIROS_JUEGO[t], AUTOS[car].grupo);
        await st.wait(0.6);
        return;
      case 'girado': {
        const c = casilla(t);
        const fromS = st.at[car]?.s ?? INICIO_S;
        const toS = squareS(square);
        const lane = st.passing(car, fromS, toS);
        st.follow(car, { dist: 11, height: 10.5, rate: 2.6 });
        await playMove(st, c?.anim, { car, fromS, toS, lane, sound: this.sound, ui: this.ui, casilla: c });
        if (next.phase === 'llegada') {
          st.setActive(null);
          st.view('casa', 1.4);
          this.finale.arrival(true, { fanfare: true });
          await st.wait(0.8);
          return;
        }
        await st.wait(final ? 0.5 : 0.3);
        return;
      }
      case 'movido':
      case 'pregunta':
        return;
      default:
        this.cards.close();
        this.effects.clear();
        st.tidy();
    }
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
    if ('titulo' in patch) {
      const title = s.titulo || TITULO;
      document.title = title;
      this.hud.setTitle(title);
      this.stage.setTitle(title);
    }
    this.hud.render(this.store.state);
  }

  onKey(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape' || (e.key === 'Enter' && tag === 'INPUT')) e.target.blur();
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
    if (/^[mg]$/i.test(k)) return this.menu.toggle();
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
