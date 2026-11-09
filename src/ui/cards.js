import { casilla } from '../content/guion.js';
import { TURNS, turnInfo } from '../engine/flow.js';
import { el, esc } from './dom.js';
import { vehicleSVG } from './icons.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Text colour on a team colour: the yellow taxi needs dark ink.
export function inkOn(auto) {
  return auto.vehiculo === 'taxi' ? '#1d2554' : '#ffffff';
}

// The card of the square a car just landed on: stage title, the situation and
// the question in bold. With the next click the expected answer appears below,
// in another colour, and multiple-choice options are marked right or wrong.
export class Cards {
  constructor(root, app) {
    this.app = app;
    this.layer = el('<div class="layer" id="card-layer"></div>');
    root.appendChild(this.layer);
    this.turn = null;
    this.side = null;
    this.layer.addEventListener('click', () => this.app.next());
  }

  isOpen() {
    return this.turn !== null;
  }

  // side: 'pregunta' or 'respuesta'.
  show(turn, side) {
    if (this.turn !== turn) this.build(turn);
    const reveal = this.side === 'pregunta' && side === 'respuesta';
    this.side = side;
    const card = this.layer.querySelector('.card');
    card.classList.toggle('answered', side === 'respuesta');
    if (reveal) {
      this.app.sound.flip();
      const body = card.querySelector('.card-body');
      setTimeout(() => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }), 650);
    }
    requestAnimationFrame(() => this.layer.classList.add('open'));
  }

  build(turn) {
    const c = casilla(turn);
    const { square } = turnInfo(turn);
    const a = c.auto;
    this.turn = turn;
    this.side = null;
    const opts = c.opciones
      ? `<ol class="opts">${c.opciones.map((o, i) => `<li data-ok="${c.correctas.includes(i)}"><span class="opt-key">${LETTERS[i]}</span><span>${esc(o)}</span></li>`).join('')}</ol>`
      : '';
    const clock = c.reloj ? `<div class="card-clock" title="El parcial empieza a las ${esc(a.parcial)}"><i></i><b>${esc(c.reloj)}</b><small>Parcial ${esc(a.parcial)}</small></div>` : '';
    // Each option line costs about as much room as 60 characters of text.
    const size = c.situacion.length + c.pregunta.length + c.respuesta.length + (c.opciones || []).reduce((n, o) => n + o.length + 60, 0);
    this.layer.innerHTML = `
      <div class="card-wrap"><div class="card${size > 780 ? ' long' : size > 560 ? ' mid' : ''}" style="--team:${a.color};--team-ink:${inkOn(a)}">
        <div class="card-head">
          <div class="card-num">${square}</div>
          <div class="card-titles">
            <div class="card-type">${esc(a.grupo)} · Casilla ${c.index + 1} de ${a.casillas.length}${c.subtitulo ? ` · ${esc(c.subtitulo)}` : ''}</div>
            <div class="card-title">${esc(c.titulo)}</div>
          </div>
          ${clock}
          <div class="card-team">${vehicleSVG(a.vehiculo, a.color)}<span><b>${esc(a.grupo)}</b><small>${esc(a.nombre)}</small></span></div>
        </div>
        <div class="card-body">
          <p class="card-text">${esc(c.situacion)}</p>
          <p class="card-q">${esc(c.pregunta)}</p>
          ${c.pista ? `<p class="card-hint">Pista: ${esc(c.pista)}</p>` : ''}
          ${opts}
          <div class="answer"><div class="answer-label">Respuesta</div><p>${esc(c.respuesta)}</p></div>
        </div>
        <div class="card-foot"><span>${esc(a.caso)}</span><span class="next-hint q">Clic o <kbd>Espacio</kbd>: respuesta</span><span class="next-hint a">Clic o <kbd>Espacio</kbd>: ${turn + 1 < TURNS ? 'siguiente turno' : 'llegada'}</span></div>
      </div></div>`;
    this.app.sound.card();
  }

  close() {
    this.turn = null;
    this.side = null;
    this.layer.classList.remove('open');
  }
}
