import { LLEGADA_VUELTA, VUELTA, ZONAS, zonaDe } from '../content/guion.js';
import { STOPS, partsOf } from '../engine/flow.js';
import { el, esc } from './dom.js';
import { topicSVG } from './topics.js';

// The slides of the explanatory lap: one per content square. The title shows
// as soon as the car lands; the body comes with the next click (in parts on
// the slides that have them), and the click after that closes the slide.

// "(Art. 184)", "(arts. 1280 a 1318)", "(Ley 24.240 …)": any case.
const ART = /\s*\(((?:arts?\.|ley)\s[^)]*)\)/gi;

// Escape a line and move its article references, small and grey, to the end.
export function line(text) {
  const arts = [];
  const body = text.replace(ART, (_, a) => {
    arts.push(a);
    return '';
  });
  // Short references never break; long ones wrap like text.
  const ref = (a) => esc(a.length <= 24 ? a.replace(/ /g, '\u00a0') : a);
  return `${esc(body)}${arts.map((a) => ` <span class="art">(${ref(a)})</span>`).join('')}`;
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
};

function lines(list, from = 1, each = false) {
  return `<ul class="lines">${list.map((t, i) => `<li ${part(each ? from + i : from)}>${line(t)}</li>`).join('')}</ul>`;
}

const LAYOUTS = {
  linea: (s) => `
    <div class="timeline" ${part(1)}>
      ${s.hitos.map((h) => `<div class="hito"><div class="hito-dot"></div><div class="hito-date">${esc(h.fecha)}</div><div class="hito-text">${line(h.texto)}${h.nota ? `<span class="art note">${esc(h.nota)}</span>` : ''}</div></div>`).join('')}
    </div>`,
  renglones: (s) => `
    ${s.subtitulo ? `<div class="chips" ${part(1)}>${s.subtitulo.split(' · ').map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
    <div class="with-fig${s.figura ? ' has-fig' : ''}">
      ${lines(s.renglones)}
      ${s.figura ? `<div class="fig" ${part(1)}>${FIGURES[s.figura](s)}</div>` : ''}
    </div>
    ${s.recuadros ? `<div class="boxes" ${part(1)}>${s.recuadros.map((r) => `<div class="box">${line(r)}</div>`).join('')}</div>` : ''}
    ${s.recuadro ? `<div class="callout" ${part(1)}>${line(s.recuadro)}</div>` : ''}`,
  columnas: (s) => `
    <div class="cols">
      ${s.columnas.map((c) => `<div class="col" ${part(1)}><div class="col-head">${topicSVG(c.icono, 'col-icon')}<b>${esc(c.titulo)}</b></div>${lines(c.renglones)}</div>`).join('')}
    </div>
    ${s.pie ? `<div class="foot-note" ${part(1)}>${line(s.pie)}</div>` : ''}`,
  etapas: (s) => `
    <div class="stages">${s.etapas.map((e) => `<div class="etapa">${esc(e)}</div>`).join('<div class="etapa-arrow"></div>')}</div>
    <div class="cols">
      ${s.columnas.map((c) => `<div class="col" ${part(1)}><div class="col-head"><b>${esc(c.titulo)}</b></div>${lines(c.renglones)}</div>`).join('')}
    </div>`,
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

// Long slides get smaller type, so they still fit without scrolling.
function density(s) {
  const n = JSON.stringify(s).length;
  return n > 850 ? ' denser' : n > 740 ? ' dense' : '';
}

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
        <div class="slide-body d-${s.diseno}${density(s)}">${LAYOUTS[s.diseno](s)}</div>
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
