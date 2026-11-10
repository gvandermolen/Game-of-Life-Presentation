import { AUTOS, TITULO, VUELTA, casilla } from '../content/guion.js';
import { same, turnInfo, walkthrough } from '../engine/flow.js';
import { el, esc } from './dom.js';
import { icon } from './icons.js';

// A short name for a point of the script, for the chapter list and the resume prompt.
export function chapterName(s) {
  switch (s.phase) {
    case 'vuelta':
      return s.stop ? `Casilla ${s.stop} · ${VUELTA[s.stop - 1].titulo}` : 'Inicio de la vuelta';
    case 'meta':
      return 'Llegada a Destino';
    case 'celular':
      return 'El celular';
    case 'bifurcacion':
      return `La bifurcación · ${AUTOS[s.car].grupo}`;
    case 'turno': {
      const { car, final } = turnInfo(s.turn);
      return final ? `Hacia Destino · ${AUTOS[car].grupo}` : `Turno ${s.turn + 1} · ${AUTOS[car].grupo}: ${casilla(s.turn).titulo}`;
    }
    case 'llegada':
      return 'Llegada a Destino';
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

const SECTION = (s) => (['vuelta', 'meta'].includes(s.phase) ? 'La vuelta' : ['sentencias', 'ruedita', 'celular2', 'clausulas'].includes(s.phase) ? 'Final' : 'El juego');

const ALL = walkthrough();
const CHAPTERS = ALL.filter((s) => {
  if (s.phase === 'vuelta') return s.stop === 0 ? s.step === 'listo' : s.step === 'titulo';
  if (s.phase === 'turno') return s.step === 'listo';
  if (s.phase === 'sentencias') return s.shown === 1;
  if (s.phase === 'ruedita') return !s.lista;
  return true;
});

const KEYS = [
  ['Espacio · → · Enter · clic', 'Siguiente paso (durante una animación: adelantarla)'],
  ['← · Retroceso', 'Paso anterior'],
  ['1 · 2 · 3', 'Caminos de la bifurcación'],
  ['V', 'Vista general del tablero'],
  ['F', 'Pantalla completa'],
  ['M · G', 'Este menú'],
  ['Esc', 'Cerrar'],
];

export class Menu {
  constructor(root, app) {
    this.app = app;
    this.node = el(`
      <div class="drawer">
        <div class="drawer-head"><div class="drawer-title"><div><h2>Menú</h2><small class="drawer-sub"></small></div><button class="tool" data-m="close" title="Cerrar (Esc)">${icon('close')}</button></div></div>
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
    this.node.querySelector('.drawer-sub').textContent = s.titulo;
    let last = null;
    const rows = CHAPTERS.map((c, i) => {
      const sec = SECTION(c);
      const head = sec !== last ? `<div class="hist-sec">${esc(sec)}</div>` : '';
      last = sec;
      return `${head}<div class="hist-row${i === cur ? ' current' : ''}"><span class="hist-n">${i + 1}</span><span>${esc(chapterName(c))}</span><button class="btn" data-m="jump" data-i="${i}">Ir</button></div>`;
    }).join('');
    this.body.innerHTML = `
      <div class="sec">
        <div class="row"><button class="btn gold wide" data-m="close">Volver a la clase <small>Esc</small></button></div>
      </div>
      <div class="sec">
        <h3>Ir a</h3>
        <p class="help">Salta directo a cualquier momento del guion, sin animaciones.</p>
        <div class="hist">${rows}</div>
      </div>
      <div class="sec">
        <h3>Ajustes</h3>
        <div class="row"><label>Nombre del juego</label><input class="field wide" type="text" maxlength="60" data-s="titulo" value="${esc(s.titulo)}" placeholder="${esc(TITULO)}"></div>
        <div class="row"><label>Calidad gráfica</label><select class="field" data-s="calidad">${['alto', 'medio', 'bajo'].map((q) => `<option value="${q}"${s.calidad === q ? ' selected' : ''}>${q[0].toUpperCase() + q.slice(1)}</option>`).join('')}</select></div>
        <div class="row"><label>Velocidad de animaciones</label><select class="field" data-s="velocidad">${[0.75, 1, 1.25, 1.5].map((v) => `<option value="${v}"${s.velocidad === v ? ' selected' : ''}>${String(v).replace('.', ',')}×</option>`).join('')}</select></div>
        <div class="row"><label class="toggle"><input type="checkbox" data-s="sonido"${s.sonido ? ' checked' : ''}> Sonido</label><input type="range" min="0" max="1" step="0.05" value="${s.volumen}" data-s="volumen" class="wide"></div>
        <p class="help">Con Meet, la calidad "Medio" suele verse igual y consume menos.</p>
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
    const idx = st.phase === 'bifurcacion' ? ALL.findIndex((s) => s.phase === 'bifurcacion' && s.car === st.car) : ALL.findIndex((s) => same(s, st));
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
    let v = e.target.type === 'checkbox' ? e.target.checked : k === 'volumen' || k === 'velocidad' ? Number(e.target.value) : e.target.value;
    if (k === 'titulo') {
      v = v.trim() || TITULO;
      e.target.value = v;
    }
    this.app.updateSettings({ [k]: v });
    if (k === 'titulo') this.node.querySelector('.drawer-sub').textContent = v;
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
      <h1 class="splash-title">${esc(this.app.store.settings.titulo)}</h1>
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
