import { AUTOS, AUTO_VUELTA, TEMA, VUELTA, casilla, zonaDe } from '../content/guion.js';
import { ROUNDS, STOPS, TURNS, partsOf, playedTurns, roundsDone, turnInfo } from '../engine/flow.js';
import { inkOn } from './cards.js';
import { el, esc } from './dom.js';
import { icon, vehicleSVG } from './icons.js';

const HINTS = {
  bifurcacion: '<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> o clic en un camino',
  listo: '<kbd>Espacio</kbd> girar la ruedita',
  girado: '<kbd>Espacio</kbd> mover el auto',
  movido: '<kbd>Espacio</kbd> ver la tarjeta',
  pregunta: '<kbd>Espacio</kbd> ver la respuesta',
  respuesta: '<kbd>Espacio</kbd> siguiente turno',
  meta: '<kbd>Espacio</kbd> pedir un auto',
  llegada: '<kbd>Espacio</kbd> sentencias',
  sentencias: '<kbd>Espacio</kbd> siguiente sentencia',
  ruedita: '<kbd>Espacio</kbd> continuar',
};

// Two letters for the brand mark, from the first two long words of the title.
function initials(title) {
  const words = title.split(/[\s:]+/).filter((w) => w.length > 2);
  return (words.slice(0, 2).map((w) => w[0]).join('') || title.slice(0, 2)).toUpperCase();
}

// Top bar (title, whose turn, tools), the strip of the four teams, the spin
// result, a name tag floating over each car and the menu button, which stays
// in its corner on every screen.
export class Hud {
  constructor(root, app) {
    this.app = app;
    this.root = root;
    this.top = el(`
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark"></div>
          <div><div class="brand-title"></div><div class="brand-sub">${esc(TEMA)} · Grupo 7</div></div>
        </div>
        <div class="turn hidden"></div>
        <div class="tools">
          <button class="tool" data-cmd="back" title="Atrás (←)">${icon('undo')}</button>
          <button class="tool" data-cmd="overview" title="Vista general (V)">${icon('board')}</button>
          <button class="tool" data-cmd="sound" title="Sonido"></button>
          <button class="tool" data-cmd="full" title="Pantalla completa (F)">${icon('full')}</button>
        </div>
      </div>`);
    this.fab = el(`<button class="menu-fab" data-cmd="menu" title="Menú (M)" aria-label="Menú">${icon('legend')}</button>`);
    this.teams = el('<div class="teams"></div>');
    this.spinNode = el('<div class="spin-result"><b></b><span></span></div>');
    this.tags = el('<div class="tags"></div>');
    root.append(this.tags, this.top, this.teams, this.spinNode, this.fab);
    for (const n of [this.top, this.fab]) {
      n.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cmd]');
        if (b) {
          e.stopPropagation();
          app.command(b.dataset.cmd);
        }
      });
    }

    this.teams.innerHTML = AUTOS.map(
      (a, c) => `
      <div class="team" style="--team:${a.color}" data-c="${c}">
        <div class="team-top">${vehicleSVG(a.vehiculo, a.color)}<div><div class="team-name">${esc(a.grupo)}</div><div class="team-sub">${esc(a.nombre)}</div></div></div>
        <div class="dots">${Array.from({ length: ROUNDS }, () => '<i></i>').join('')}</div>
      </div>`,
    ).join('');
    const tag = (name, color, ink) => `<div class="tag" style="--team:${color};--team-ink:${ink}">${esc(name)}</div>`;
    this.tags.innerHTML = [...AUTOS.map((a) => tag(a.grupo, a.color, inkOn(a))), tag(AUTO_VUELTA.nombre, AUTO_VUELTA.color, '#1d2554')].join('');
    this.tagNodes = [...this.tags.children];
    this.setTitle(app.store.settings.titulo);
  }

  setTitle(title) {
    this.top.querySelector('.brand-title').textContent = title;
    this.top.querySelector('.brand-mark').textContent = initials(title);
  }

  render(state) {
    this.root.dataset.phase = state.phase;
    this.root.dataset.step = state.step || '';
    const s = this.app.store.settings;
    this.top.querySelector('[data-cmd="sound"]').innerHTML = icon(s.sonido ? 'soundOn' : 'soundOff');
    this.top.querySelector('[data-cmd="back"]').disabled = !this.app.store.canBack();

    const turn = this.top.querySelector('.turn');
    const lastVerdict = state.phase === 'sentencias' && state.shown >= AUTOS.length;
    let hint = lastVerdict ? '<kbd>Espacio</kbd> la ruedita' : HINTS[state.phase === 'turno' ? state.step : state.phase];
    if (state.phase === 'ruedita' && !state.lista) hint = '<kbd>Espacio</kbd> ver los números';
    if (state.phase === 'turno') {
      const { car, square } = turnInfo(state.turn);
      const a = AUTOS[car];
      const c = casilla(state.turn);
      const open = ['pregunta', 'respuesta'].includes(state.step);
      turn.style.setProperty('--team', a.color);
      turn.innerHTML = `
        <div class="turn-chip">${vehicleSVG(a.vehiculo, a.color)}</div>
        <div><div class="turn-label">Turno ${state.turn + 1} de ${TURNS}${state.step === 'listo' ? '' : ` · Casilla ${square}`}${open ? ` · ${esc(c.titulo)}` : ''}</div><div class="turn-name">${esc(a.grupo)} · ${esc(a.nombre)}</div></div>
        <div class="turn-hint">${hint}</div>`;
      turn.classList.remove('hidden');
    } else if (state.phase === 'vuelta') {
      const n = state.stop;
      const next = n < STOPS ? n + 1 : null;
      const z = zonaDe(Math.max(1, n));
      const label = n ? `Casilla ${n} de ${STOPS} · ${esc(VUELTA[n - 1].tema)}` : 'La vuelta · Inicio';
      const step = state.step === 'listo' ? (next ? 'girar la ruedita' : 'girar hasta Destino') : state.step === 'titulo' ? 'mostrar el texto' : state.part < partsOf(n) ? 'siguiente' : 'cerrar la diapositiva';
      turn.style.setProperty('--team', z.color);
      turn.innerHTML = `
        <div class="turn-chip">${vehicleSVG(AUTO_VUELTA.vehiculo, AUTO_VUELTA.color)}</div>
        <div><div class="turn-label">${label}</div><div class="turn-name">${esc(AUTO_VUELTA.nombre)} · Zona ${esc(z.nombre)}</div></div>
        <div class="turn-hint"><kbd>Espacio</kbd> ${step}</div>`;
      turn.classList.remove('hidden');
    } else if (hint) {
      turn.style.removeProperty('--team');
      turn.innerHTML = `<div class="turn-hint solo">${hint}</div>`;
      turn.classList.remove('hidden');
    } else turn.classList.add('hidden');

    const played = playedTurns(state);
    const active = state.phase === 'turno' ? turnInfo(state.turn).car : state.phase === 'bifurcacion' ? state.car : null;
    this.teams.querySelectorAll('.team').forEach((node, c) => {
      const done = roundsDone(c, played);
      node.classList.toggle('active', c === active);
      node.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i < done));
    });
  }

  showSpin(value, who) {
    const b = this.spinNode.querySelector('b');
    b.textContent = value;
    b.dataset.n = value;
    this.spinNode.querySelector('span').textContent = who;
    this.spinNode.classList.remove('show');
    void this.spinNode.offsetWidth;
    this.spinNode.classList.add('show');
  }

  // Called every frame: keep each tag over its car.
  updateTags() {
    const st = this.app.stage;
    this.tagNodes.forEach((node, c) => {
      const piece = st.pieces[c];
      const p = piece?.visible ? st.screenOf(st.pieceTop(c, 1.3)) : null;
      node.classList.toggle('on', !!p);
      node.classList.toggle('active', c === st.activeIndex);
      if (p) node.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    });
  }
}
