import { pickCard } from '../content/deck.js';
import { SQUARE_STYLE } from '../scene/palette.js';
import { el, esc } from './dom.js';
import { vehicleSVG } from './icons.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function signed(n) {
  return n > 0 ? `+${n}` : n < 0 ? `${n}` : '0';
}

export class Cards {
  constructor(root, app) {
    this.app = app;
    this.layer = el('<div class="layer" id="card-layer"></div>');
    root.appendChild(this.layer);
    this.mode = null;
    this.selected = null;
  }

  isOpen() {
    return this.mode !== null;
  }

  close() {
    this.mode = null;
    this.selected = null;
    this.layer.classList.remove('open');
  }

  team(id) {
    return this.app.session.data.roster.find((t) => t.id === id);
  }

  openQuestion(state) {
    const { tipo, team: teamId, seq } = state.pending;
    const team = this.team(teamId);
    const card = pickCard(this.app.deck, tipo, seq, [teamId]);
    const st = SQUARE_STYLE[tipo];
    const fx = state.rules.efectos;
    const glyph = st.glyph === 'stop' ? '!' : st.glyph;
    this.mode = 'card';
    this.card = card;
    this.selected = null;
    this.suggested = null;

    const options = card.opciones
      .map((o, i) => `<button class="opt" data-opt="${i}"><span class="opt-key">${LETTERS[i]}</span><span>${esc(o)}</span></button>`)
      .join('');

    this.layer.innerHTML = `
      <div class="card" style="--type:${st.color};--type-ink:${st.ink};--team:${team.color}">
        <div class="card-head">
          <div class="card-glyph">${esc(glyph)}</div>
          <div><div class="card-type">Carta</div><div class="card-title">${esc(card.titulo)}</div></div>
          <div class="card-team">${vehicleSVG(team.id, team.color)}${esc(team.nombre)}</div>
        </div>
        <div class="card-body">
          ${card.caso ? `<div class="card-case">${esc(card.caso)}</div>` : ''}
          <p class="card-text ${card.generic ? 'generic' : ''}">${esc(card.texto)}</p>
          <div class="options">${options}</div>
        </div>
        <div class="card-foot">
          <span class="who">Veredicto de los expositores</span>
          <button class="btn ok" data-v="ok">Correcta <small>S · ${signed(fx[`${tipo}Ok`])}</small></button>
          <button class="btn bad" data-v="fail">Incorrecta <small>N · ${signed(fx[`${tipo}Fail`])}</small></button>
          <button class="btn ghost" data-v="void">Anular <small>X</small></button>
        </div>
      </div>`;
    this.layer.onclick = (e) => {
      const o = e.target.closest('[data-opt]');
      if (o) return this.select(Number(o.dataset.opt));
      const v = e.target.closest('[data-v]');
      if (v) this.app.verdict(v.dataset.v);
    };
    requestAnimationFrame(() => this.layer.classList.add('open'));
    this.app.sound.card();
  }

  select(i) {
    if (this.mode !== 'card' || i >= this.card.opciones.length) return;
    this.selected = i;
    const hasAnswer = Number.isInteger(this.card.correcta);
    this.layer.querySelectorAll('.opt').forEach((b, j) => {
      b.classList.toggle('sel', j === i && !hasAnswer);
      b.classList.toggle('right', hasAnswer && j === this.card.correcta && j === i);
      b.classList.toggle('wrong', hasAnswer && j === i && j !== this.card.correcta);
    });
    if (hasAnswer) {
      const right = i === this.card.correcta;
      right ? this.app.sound.good() : this.app.sound.bad();
      if (!right) this.layer.querySelectorAll('.opt')[this.card.correcta]?.classList.add('right');
      this.suggested = right ? 'ok' : 'fail';
      this.layer.querySelector(`[data-v="${this.suggested}"]`)?.focus();
    }
  }

  openCollision(state) {
    const { teams, cruce, seq } = state.pending;
    const card = pickCard(this.app.deck, 'colision', seq, teams);
    const { penalidad, casillas } = state.rules.colision;
    const pen = { retroceder: `retrocede ${casillas}`, perderTurno: 'pierde un turno', ambas: `retrocede ${casillas} y pierde un turno` }[penalidad];
    this.mode = 'collision';
    this.collisionTeams = teams;

    const vs = teams
      .map((id, i) => {
        const t = this.team(id);
        return `${i ? '<span class="vs">vs</span>' : ''}<div class="vs-team" style="--team:${t.color}">${vehicleSVG(t.id, t.color)}<b>${esc(t.nombre)}</b></div>`;
      })
      .join('');
    const buttons = teams
      .map((id, i) => {
        const t = this.team(id);
        return `<button class="btn primary" data-w="${id}">Prevalece ${esc(t.nombre)} <small>${i + 1}</small></button>`;
      })
      .join('');

    this.layer.innerHTML = `
      <div class="card" style="--type:#EF4230;--type-ink:#fff">
        <div class="card-head">
          <div class="card-glyph">!</div>
          <div><div class="card-type">Cruce ${cruce} · Carta conjunta</div><div class="card-title">${esc(card.titulo)}</div></div>
        </div>
        <div class="card-body">
          <div class="versus">${vs}</div>
          ${card.caso ? `<div class="card-case">${esc(card.caso)}</div>` : ''}
          <p class="card-text ${card.generic ? 'generic' : ''}">${esc(card.texto)}</p>
          <p class="card-case" style="text-transform:none;letter-spacing:0">El otro equipo ${esc(pen)}.</p>
        </div>
        <div class="card-foot" style="flex-wrap:wrap">
          <span class="who">Decisión</span>
          <div class="winners">${buttons}<button class="btn ghost" data-w="">Sin responsable <small>0</small></button></div>
        </div>
      </div>`;
    this.layer.onclick = (e) => {
      const w = e.target.closest('[data-w]');
      if (w) this.app.collision(w.dataset.w || null);
    };
    requestAnimationFrame(() => this.layer.classList.add('open'));
    this.app.sound.card();
  }

  // Keyboard handling while a card is open. Returns true if consumed.
  key(e) {
    if (this.mode === 'card') {
      const k = e.key.toLowerCase();
      const idx = 'abcd'.indexOf(k);
      if (idx >= 0) return this.select(idx), true;
      if (/^[1-4]$/.test(k)) return this.select(Number(k) - 1), true;
      if (k === 's') return this.app.verdict('ok'), true;
      if (k === 'n') return this.app.verdict('fail'), true;
      if (k === 'x') return this.app.verdict('void'), true;
      if ((k === 'enter' || k === ' ') && this.suggested) return this.app.verdict(this.suggested), true;
    }
    if (this.mode === 'collision') {
      if (e.key === '0') return this.app.collision(null), true;
      const n = Number(e.key);
      if (n >= 1 && n <= this.collisionTeams.length) return this.app.collision(this.collisionTeams[n - 1]), true;
    }
    return false;
  }
}
