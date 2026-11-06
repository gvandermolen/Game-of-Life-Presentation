import { casilla } from '../content/guion.js';
import { CARS, turnInfo } from '../engine/flow.js';
import { el, esc } from './dom.js';
import { vehicleSVG } from './icons.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Text colour on a team colour: the yellow taxi needs dark ink.
export function inkOn(auto) {
  return auto.vehiculo === 'taxi' ? '#1d2554' : '#ffffff';
}

// The card of the square a car just landed on. Front: stage title, situation and
// the question. Back (after a click): the expected answer, in another colour.
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

  // side: 'pregunta' (front) or 'respuesta' (back).
  show(turn, side) {
    if (this.turn !== turn) this.build(turn);
    const flip = this.side === 'pregunta' && side === 'respuesta';
    this.side = side;
    this.layer.querySelector('.flip').classList.toggle('back', side === 'respuesta');
    if (flip) this.app.sound.flip();
    requestAnimationFrame(() => this.layer.classList.add('open'));
  }

  build(turn) {
    const c = casilla(turn);
    const { car, square } = turnInfo(turn);
    const a = c.auto;
    this.turn = turn;
    this.side = null;
    const opts = c.opciones
      ? `<ol class="opts">${c.opciones.map((o, i) => `<li data-ok="${c.correctas.includes(i)}"><span class="opt-key">${LETTERS[i]}</span><span>${esc(o)}</span></li>`).join('')}</ol>`
      : '';
    const head = `
      <div class="card-head">
        <div class="card-num">${square}</div>
        <div class="card-titles">
          <div class="card-type">Casilla ${c.index + 1} de ${a.casillas.length}${c.subtitulo ? ` · ${esc(c.subtitulo)}` : ''}</div>
          <div class="card-title">${esc(c.titulo)}</div>
        </div>
        <div class="card-team">${vehicleSVG(a.vehiculo, a.color)}<span><b>${esc(a.grupo)}</b><small>${esc(a.nombre)}</small></span></div>
      </div>`;
    const optsLen = (c.opciones || []).join('').length;
    const long = (n) => (n > 330 ? ' long' : '');
    this.layer.innerHTML = `
      <div class="card-wrap"><div class="flip" style="--team:${a.color};--team-ink:${inkOn(a)}">
        <div class="card face front${long(c.situacion.length + c.pregunta.length + optsLen)}">
          ${head}
          <div class="card-body">
            <p class="card-text">${esc(c.situacion)}</p>
            <p class="card-q">${esc(c.pregunta)}</p>
            ${c.pista ? `<p class="card-hint">Pista: ${esc(c.pista)}</p>` : ''}
            ${opts}
          </div>
          <div class="card-foot"><span>${esc(a.caso)}</span><span class="next-hint">Clic o <kbd>Espacio</kbd>: respuesta</span></div>
        </div>
        <div class="card face back${long(c.pregunta.length + c.respuesta.length + optsLen)}">
          ${head}
          <div class="card-body">
            <p class="card-q small">${esc(c.pregunta)}</p>
            ${opts.replace('class="opts"', 'class="opts marked"')}
            <div class="answer"><div class="answer-label">Respuesta</div><p>${esc(c.respuesta)}</p></div>
          </div>
          <div class="card-foot"><span>${esc(a.caso)}</span><span class="next-hint">Clic o <kbd>Espacio</kbd>: ${turn + 1 < CARS * a.casillas.length ? 'siguiente turno' : 'llegada'}</span></div>
        </div>
      </div></div>`;
    this.app.sound.card();
  }

  close() {
    this.turn = null;
    this.side = null;
    this.layer.classList.remove('open');
  }
}
