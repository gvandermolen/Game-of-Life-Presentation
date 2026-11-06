import { AUTOS, casilla } from '../content/guion.js';
import { same, turnInfo, walkthrough } from '../engine/flow.js';
import { el, esc } from './dom.js';
import { icon } from './icons.js';

// A short name for a point of the script, for the chapter list and the resume prompt.
export function chapterName(s) {
  switch (s.phase) {
    case 'transicion':
      return 'Cartel: terminó la clase';
    case 'celular':
      return 'El celular';
    case 'bifurcacion':
      return 'La bifurcación';
    case 'turno': {
      const { car } = turnInfo(s.turn);
      return `Turno ${s.turn + 1} · ${AUTOS[car].grupo}: ${casilla(s.turn).titulo}`;
    }
    case 'llegada':
      return 'Llegada a casa';
    case 'sentencias':
      return 'Sentencias';
    case 'ruedita':
      return 'La ruedita';
    case 'celular2':
      return 'El celular, otra vez';
    case 'clausulas':
      return 'Términos y Condiciones del juego';
    default:
      return s.phase;
  }
}

const ALL = walkthrough();
const CHAPTERS = ALL.filter((s) => (s.phase === 'turno' ? s.step === 'listo' : s.phase !== 'sentencias' || s.shown === 1));

const KEYS = [
  ['Espacio · → · Enter · clic', 'Siguiente paso (durante una animación: adelantarla)'],
  ['← · Retroceso', 'Paso anterior'],
  ['1 · 2 · 3', 'Caminos de la bifurcación'],
  ['V', 'Vista general del tablero'],
  ['M', 'Sonido'],
  ['F', 'Pantalla completa'],
  ['G', 'Este menú'],
  ['Esc', 'Cerrar'],
];

export class Menu {
  constructor(root, app) {
    this.app = app;
    this.node = el(`
      <div class="drawer">
        <div class="drawer-head"><div class="drawer-title"><div><h2>Menú</h2><small>El juego de los contratos: Transporte</small></div><button class="tool" data-m="close">${icon('close')}</button></div></div>
        <div class="drawer-body"></div>
      </div>`);
    root.appendChild(this.node);
    this.body = this.node.querySelector('.drawer-body');
    this.node.addEventListener('click', (e) => this.onClick(e));
    this.node.addEventListener('change', (e) => this.onChange(e));
  }

  isOpen() {
    return this.node.classList.contains('open');
  }

  toggle() {
    this.isOpen() ? this.close() : this.open();
  }

  open() {
    this.armed = false;
    this.render();
    this.node.classList.add('open');
    this.body.querySelector('.hist-row.current')?.scrollIntoView({ block: 'center' });
  }

  close() {
    this.node.classList.remove('open');
  }

  render() {
    const st = this.app.store.state;
    const s = this.app.store.settings;
    const cur = this.currentChapter(st);
    this.body.innerHTML = `
      <div class="sec">
        <h3>Ir a</h3>
        <p class="help">Salta directo a cualquier momento del guion, sin animaciones.</p>
        <div class="hist">
          ${CHAPTERS.map((c, i) => `<div class="hist-row${i === cur ? ' current' : ''}"><span class="hist-n">${i + 1}</span><span>${esc(chapterName(c))}</span><button class="btn" data-m="jump" data-i="${i}">Ir</button></div>`).join('')}
        </div>
      </div>
      <div class="sec">
        <h3>Ajustes</h3>
        <div class="row"><label>Calidad gráfica</label><select class="field" data-s="calidad">${['alto', 'medio', 'bajo'].map((q) => `<option value="${q}"${s.calidad === q ? ' selected' : ''}>${q[0].toUpperCase() + q.slice(1)}</option>`).join('')}</select></div>
        <div class="row"><label>Velocidad de animaciones</label><select class="field" data-s="velocidad">${[0.75, 1, 1.25, 1.5].map((v) => `<option value="${v}"${s.velocidad === v ? ' selected' : ''}>${String(v).replace('.', ',')}×</option>`).join('')}</select></div>
        <div class="row"><label class="toggle"><input type="checkbox" data-s="sonido"${s.sonido ? ' checked' : ''}> Sonido</label><input type="range" min="0" max="1" step="0.05" value="${s.volumen}" data-s="volumen" class="wide"></div>
        <p class="help">Con Zoom, la calidad "Medio" suele verse igual y consume menos.</p>
      </div>
      <div class="sec">
        <h3>Partida</h3>
        <div class="row"><button class="btn ${this.armed ? 'armed' : 'danger'}" data-m="restart">${this.armed ? 'Confirmar: volver al principio' : 'Reiniciar desde el principio'}</button></div>
      </div>
      <div class="sec">
        <h3>Atajos</h3>
        <div class="kbd-list">${KEYS.map(([k, d]) => `<b>${esc(k)}</b><span>${esc(d)}</span>`).join('')}</div>
      </div>`;
  }

  currentChapter(st) {
    // Fork states differ only by the roads already tried.
    const idx = st.phase === 'bifurcacion' ? ALL.findIndex((s) => s.phase === 'bifurcacion') : ALL.findIndex((s) => same(s, st));
    let best = 0;
    CHAPTERS.forEach((c, i) => {
      if (ALL.findIndex((s) => same(s, c)) <= idx) best = i;
    });
    return best;
  }

  onClick(e) {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    const m = b.dataset.m;
    if (m === 'close') this.close();
    if (m === 'jump') {
      this.app.jump(CHAPTERS[Number(b.dataset.i)]);
      this.close();
    }
    if (m === 'restart') {
      if (!this.armed) {
        this.armed = true;
        this.render();
        return;
      }
      this.app.restart();
      this.close();
    }
  }

  onChange(e) {
    const k = e.target.dataset.s;
    if (!k) return;
    const v = e.target.type === 'checkbox' ? e.target.checked : k === 'volumen' || k === 'velocidad' ? Number(e.target.value) : e.target.value;
    this.app.updateSettings({ [k]: v });
  }
}

// On reload mid-game: continue where the class was, or start over.
export class Resume {
  constructor(root, app) {
    this.app = app;
    this.node = el('<div class="splash gone"><div class="splash-inner"></div></div>');
    root.appendChild(this.node);
    this.node.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      this.hide();
      if (b.dataset.r === 'new') app.restart();
    });
  }

  isOpen() {
    return !this.node.classList.contains('gone');
  }

  show(state) {
    this.node.querySelector('.splash-inner').innerHTML = `
      <h1 class="splash-title">El juego de los contratos</h1>
      <div class="splash-sub">La partida quedó en: <b>${esc(chapterName(state))}</b></div>
      <div class="splash-actions">
        <button class="btn gold" data-r="go">Continuar <small>Espacio</small></button>
        <button class="btn" data-r="new">Empezar de cero</button>
      </div>`;
    this.node.classList.remove('gone');
  }

  hide() {
    this.node.classList.add('gone');
  }
}
