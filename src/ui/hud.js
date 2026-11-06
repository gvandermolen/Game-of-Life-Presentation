import { AUTOS, casilla } from '../content/guion.js';
import { CARS, ROUNDS, TURNS, playedTurns, turnInfo } from '../engine/flow.js';
import { inkOn } from './cards.js';
import { el, esc } from './dom.js';
import { icon, vehicleSVG } from './icons.js';

const HINTS = {
  bifurcacion: '<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> o clic en un camino',
  listo: '<kbd>Espacio</kbd> girar la ruedita',
  pregunta: '<kbd>Espacio</kbd> ver la respuesta',
  respuesta: '<kbd>Espacio</kbd> siguiente turno',
  llegada: '<kbd>Espacio</kbd> sentencias',
  sentencias: '<kbd>Espacio</kbd> siguiente sentencia',
  ruedita: '<kbd>Espacio</kbd> continuar',
};

// Top bar (title, whose turn, tools), the strip of the four teams, the spin
// result and a name tag floating over each car.
export class Hud {
  constructor(root, app) {
    this.app = app;
    this.root = root;
    this.top = el(`
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark">JC</div>
          <div><div class="brand-title">El juego de los contratos</div><div class="brand-sub">Transporte · Grupo 7</div></div>
        </div>
        <div class="turn hidden"></div>
        <div class="tools">
          <button class="tool" data-cmd="back" title="Atrás (←)">${icon('undo')}</button>
          <button class="tool" data-cmd="overview" title="Vista general (V)">${icon('board')}</button>
          <button class="tool" data-cmd="sound" title="Sonido (M)"></button>
          <button class="tool" data-cmd="full" title="Pantalla completa (F)">${icon('full')}</button>
          <button class="tool" data-cmd="menu" title="Menú (G)">${icon('legend')}</button>
        </div>
      </div>`);
    this.teams = el('<div class="teams"></div>');
    this.spinNode = el('<div class="spin-result"><b></b><span></span></div>');
    this.tags = el('<div class="tags"></div>');
    root.append(this.tags, this.top, this.teams, this.spinNode);
    this.top.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (b) app.command(b.dataset.cmd);
    });

    this.teams.innerHTML = AUTOS.map(
      (a, c) => `
      <div class="team" style="--team:${a.color}" data-c="${c}">
        <div class="team-top">${vehicleSVG(a.vehiculo, a.color)}<div><div class="team-name">${esc(a.grupo)}</div><div class="team-sub">${esc(a.nombre)}</div></div></div>
        <div class="dots">${Array.from({ length: ROUNDS }, () => '<i></i>').join('')}</div>
      </div>`,
    ).join('');
    this.tags.innerHTML = AUTOS.map((a, c) => `<div class="tag" style="--team:${a.color};--team-ink:${inkOn(a)}" data-c="${c}">${esc(a.grupo)}</div>`).join('');
    this.tagNodes = [...this.tags.children];
  }

  render(state) {
    this.root.dataset.phase = state.phase;
    this.root.dataset.step = state.step || '';
    const s = this.app.store.settings;
    this.top.querySelector('[data-cmd="sound"]').innerHTML = icon(s.sonido ? 'soundOn' : 'soundOff');
    this.top.querySelector('[data-cmd="back"]').disabled = !this.app.store.canBack();

    const turn = this.top.querySelector('.turn');
    const lastVerdict = state.phase === 'sentencias' && state.shown >= AUTOS.length;
    const hint = lastVerdict ? '<kbd>Espacio</kbd> la ruedita' : HINTS[state.phase === 'turno' ? state.step : state.phase];
    if (state.phase === 'turno') {
      const { car, square } = turnInfo(state.turn);
      const a = AUTOS[car];
      const c = casilla(state.turn);
      turn.style.setProperty('--team', a.color);
      turn.innerHTML = `
        <div class="turn-chip">${vehicleSVG(a.vehiculo, a.color)}</div>
        <div><div class="turn-label">Turno ${state.turn + 1} de ${TURNS} · Casilla ${square}${state.step === 'listo' ? '' : ` · ${esc(c.titulo)}`}</div><div class="turn-name">${esc(a.grupo)} · ${esc(a.nombre)}</div></div>
        <div class="turn-hint">${hint}</div>`;
      turn.classList.remove('hidden');
    } else if (hint) {
      turn.style.removeProperty('--team');
      turn.innerHTML = `<div class="turn-hint solo">${hint}</div>`;
      turn.classList.remove('hidden');
    } else turn.classList.add('hidden');

    const played = playedTurns(state);
    const active = state.phase === 'turno' ? turnInfo(state.turn).car : null;
    this.teams.querySelectorAll('.team').forEach((node, c) => {
      const done = played > c ? Math.floor((played - 1 - c) / CARS) + 1 : 0;
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
