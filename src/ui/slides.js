import { LLEGADA_VUELTA, VUELTA, ZONAS, zonaDe } from '../content/guion.js';
import { STOPS, partsOf } from '../engine/flow.js';
import { el, esc } from './dom.js';
import { topicSVG } from './topics.js';

// The slides of the explanatory lap: one per content square. The title shows
// as soon as the car lands; the body comes with the next click (in parts on
// the slides that have them), and the click after that closes the slide.

const ART = /\s*\((arts?\.[^)]*)\)/g;

// Escape a line and move its article references, small and grey, to the end.
export function line(text) {
  const arts = [];
  const body = text.replace(ART, (_, a) => {
    arts.push(a);
    return '';
  });
  return `${esc(body)}${arts.map((a) => ` <span class="art">(${esc(a)})</span>`).join('')}`;
}

const part = (n) => `data-part="${n}"`;

const FIGURES = {
  escudo: () => `
    <svg class="fig-svg" viewBox="0 0 120 140" aria-hidden="true">
      <path d="M60 8 110 26v38c0 34-22 56-50 68C32 120 10 98 10 64V26Z" fill="var(--zone)" stroke="#151A3B" stroke-width="5"/>
      <path d="M36 70l16 16 32-36" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    </svg><div class="fig-cap">Sano y salvo</div>`,
  boleto: () => `
    <div class="ticket">
      <div class="ticket-head">BOLETO</div>
      <div class="ticket-row"><s>No respondemos por lesiones</s></div>
      <div class="ticket-row"><s>Viaja bajo su propio riesgo</s></div>
      <div class="ticket-row"><s>Renuncia a todo reclamo</s></div>
      <div class="ticket-stamp">NO VALE</div>
    </div>`,
  cadena: (s) => `
    <div class="chain">
      ${s.eslabones.map((e) => `<div class="link">${esc(e)}</div>`).join('<div class="link-join"></div>')}
      <div class="chain-arrow">↓</div>
      <div class="link pax">Pasajero</div>
    </div>`,
  mapa: () => `
    <svg class="fig-svg" viewBox="0 0 160 130" aria-hidden="true">
      <rect x="4" y="4" width="152" height="122" rx="12" fill="#E9EEF2"/>
      <path d="M0 78 C40 70 70 96 160 44" stroke="#BFD6EA" stroke-width="12" fill="none"/>
      <g transform="translate(118 30)"><path d="M0-18a12 12 0 0 1 12 12C12 3 0 14 0 14S-12 3-12-6A12 12 0 0 1 0-18Z" fill="#9AA3B5"/><text y="34" text-anchor="middle" font-size="12" font-weight="700" fill="#6b7387">Ámsterdam</text><path d="M-14-22 14 8M14-22-14 8" stroke="#EF4230" stroke-width="5" stroke-linecap="round"/></g>
      <g transform="translate(46 70)"><path d="M0-22a14 14 0 0 1 14 14C14 4 0 16 0 16S-14 4-14-8A14 14 0 0 1 0-22Z" fill="#3BC3AD"/><circle cy="-8" r="5" fill="#fff"/><text y="34" text-anchor="middle" font-size="13" font-weight="900" fill="#151A3B">Argentina</text></g>
    </svg>`,
};

function lines(list, from = 1, each = false) {
  return `<ul class="lines">${list.map((t, i) => `<li ${part(each ? from + i : from)}>${line(t)}</li>`).join('')}</ul>`;
}

const LAYOUTS = {
  linea: (s) => `
    <div class="timeline" ${part(1)}>
      ${s.hitos.map((h) => `<div class="hito"><div class="hito-dot"></div><div class="hito-date">${esc(h.fecha)}</div><div class="hito-text">${line(h.texto)}</div></div>`).join('')}
    </div>`,
  renglones: (s) => `
    ${s.subtitulo ? `<div class="chips" ${part(1)}>${s.subtitulo.split(' · ').map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
    <div class="with-fig${s.figura ? ' has-fig' : ''}">
      ${lines(s.renglones)}
      ${s.figura ? `<div class="fig" ${part(1)}>${FIGURES[s.figura](s)}</div>` : ''}
    </div>`,
  columnas: (s) => `
    <div class="cols">
      ${s.columnas.map((c) => `<div class="col" ${part(1)}><div class="col-head">${topicSVG(c.icono, 'col-icon')}<b>${esc(c.titulo)}</b></div>${lines(c.renglones)}</div>`).join('')}
    </div>
    ${s.pie ? `<div class="foot-note" ${part(1)}>${line(s.pie)}</div>` : ''}`,
  etapas: (s) => {
    let n = 0;
    return `
    <div class="stages">${s.etapas.map((e) => `<div class="etapa">${esc(e)}</div>`).join('<div class="etapa-arrow"></div>')}</div>
    <div class="cols">
      ${s.columnas.map((c) => `<div class="col"><div class="col-head"><b>${esc(c.titulo)}</b></div><ul class="lines">${c.renglones.map((t) => `<li ${part(++n)}>${line(t)}</li>`).join('')}</ul></div>`).join('')}
    </div>`;
  },
  extincion: (s) => `
    <div class="cols ends">
      ${s.grupos.map((g, i) => `<div class="col ${i ? 'abnormal' : 'normal'}" ${part(1)}><div class="col-head"><b>${esc(g.titulo)}</b></div>${lines(g.renglones)}</div>`).join('')}
    </div>`,
  tarjetas: (s) => `
    <div class="tcards">${s.tarjetas.map((t, i) => `<div class="tcard" ${part(i + 1)}><b>${esc(t.titulo)}</b><p>${line(t.texto)}</p></div>`).join('')}</div>
    <div class="callout" ${part(s.tarjetas.length + 1)}>${line(s.recuadro)}</div>`,
  enfrentadas: (s) => `
    <div class="cols versus">
      ${s.columnas.map((c, i) => `<div class="col${c.citas ? ' quotes' : ''}" ${part(i + 1)}><div class="col-head"><b>${esc(c.titulo)}</b></div>${lines(c.renglones)}</div>`).join('<div class="vs">vs</div>')}
    </div>`,
};

export class Slides {
  constructor(root, app) {
    this.app = app;
    this.node = el('<div class="slide-layer"><div class="slide"></div></div>');
    this.arrivalNode = el(`<div class="arrival lap"><div class="arrival-sign"><small>${esc(LLEGADA_VUELTA.sub)}</small><b>${esc(LLEGADA_VUELTA.titulo)}</b></div></div>`);
    root.append(this.node, this.arrivalNode);
    this.node.addEventListener('click', () => this.app.next());
    this.stop = null;
  }

  isOpen() {
    return this.node.classList.contains('open');
  }

  build(stop) {
    const s = VUELTA[stop - 1];
    const z = zonaDe(stop);
    this.stop = stop;
    this.node.querySelector('.slide').innerHTML = `
      <div class="slide-card" style="--zone:${z.color}">
        <div class="slide-head">
          <div class="slide-badge">${topicSVG(s.icono, 'slide-icon')}<span>${stop}</span></div>
          <div class="slide-meta"><span class="zone-chip">${esc(z.nombre)} · ${esc(z.tema)}</span><span>Casilla ${stop} de ${STOPS} · ${esc(s.tema)}</span></div>
        </div>
        <h2 class="slide-title">${esc(s.titulo)}</h2>
        <div class="slide-body d-${s.diseno}">${LAYOUTS[s.diseno](s)}</div>
        <div class="slide-foot"><span class="zones">${ZONAS.map((x) => `<i style="--c:${x.color}"${x === z ? ' class="on"' : ''}></i>`).join('')}</span><span class="next-hint"></span></div>
      </div>`;
  }

  // state: a 'vuelta' state with step 'titulo' or 'texto', or null to close.
  show(state) {
    if (!state || state.phase !== 'vuelta' || state.step === 'listo') return this.close();
    if (this.stop !== state.stop) this.build(state.stop);
    const shown = state.step === 'texto' ? state.part : 0;
    const total = partsOf(state.stop);
    const before = this.shown ?? 0;
    this.shown = shown;
    this.node.querySelectorAll('[data-part]').forEach((n) => n.classList.toggle('in', Number(n.dataset.part) <= shown));
    this.node.querySelector('.slide-body').classList.toggle('started', shown > 0);
    const hint = shown === 0 ? 'texto' : shown < total ? 'sigue' : 'cerrar';
    this.node.querySelector('.next-hint').innerHTML = `Clic o <kbd>Espacio</kbd>: ${hint === 'texto' ? 'mostrar el texto' : hint === 'sigue' ? 'siguiente' : 'cerrar la diapositiva'}`;
    if (shown > before) this.app.sound.card();
    requestAnimationFrame(() => this.node.classList.add('open'));
  }

  close() {
    this.stop = null;
    this.shown = null;
    this.node.classList.remove('open');
  }

  arrival(on, { fanfare = false } = {}) {
    this.arrivalNode.classList.toggle('open', on);
    if (on && fanfare) {
      this.app.sound.fanfare();
      this.app.effects.confetti(5);
    }
  }
}
