import { CRUCES, LANE_LENGTH } from '../engine/board.js';
import { SQUARE_STYLE } from '../scene/palette.js';
import { $, el, esc } from './dom.js';
import { icon, vehicleSVG } from './icons.js';

// A roundabout, for the one square type without a glyph of its own.
const RING = '<svg viewBox="0 0 16 16" width="0.9em" height="0.9em" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>';

const LEGEND_TYPES = ['pregunta', 'dilema', 'apelacion', 'multa', 'bonus', 'control', 'cruce'];

function signed(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

export function effectText(type, rules) {
  const fx = rules.efectos;
  switch (type) {
    case 'pregunta':
      return `4 opciones · correcta ${signed(fx.preguntaOk)}`;
    case 'dilema':
      return `2 posturas · ${signed(fx.dilemaOk)} / ${signed(fx.dilemaFail)}`;
    case 'apelacion':
      return `Si prospera ${signed(fx.apelacionOk)}`;
    case 'multa':
      return `Retrocede ${Math.abs(fx.multa)}`;
    case 'bonus':
      return 'Gira otra vez';
    case 'control':
      return `Pierde ${fx.controlTurnos} turno`;
    case 'cruce':
      return rules.crucesObligatorios ? 'Parada obligatoria · choque' : 'Choque si está ocupado';
    default:
      return '';
  }
}

export class Hud {
  constructor(root, app) {
    this.app = app;
    this.root = root;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">FD</div>
          <div><div class="brand-title" data-k="title"></div><div class="brand-sub" data-k="sub"></div></div>
        </div>
        <div class="turn hidden" data-k="turn"></div>
        <div class="tools">
          <button class="tool" data-act="overview" title="Ver tablero completo (V)">${icon('board')}</button>
          <button class="tool" data-act="legend" title="Leyenda (L)">${icon('legend')}</button>
          <button class="tool" data-act="sound" title="Sonido (M)"></button>
          <button class="tool" data-act="full" title="Pantalla completa (F)">${icon('full')}</button>
          <button class="tool" data-act="config" title="Configuración (C)">${icon('gear')}</button>
        </div>
      </header>
      <aside class="legend" data-k="legend"></aside>
      <footer class="teams" data-k="teams"></footer>
      <div id="toasts"></div>
      <div class="spin-result" data-k="spin"></div>
    `,
    );
    root.querySelector('.tools').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) app.command(b.dataset.act);
    });
    this.toasts = $('#toasts', root);
  }

  q(k) {
    return this.root.querySelector(`[data-k="${k}"]`);
  }

  render(state) {
    const { settings, roster } = this.app.session.data;
    this.q('title').textContent = settings.titulo;
    this.q('sub').textContent = settings.subtitulo;
    this.root.querySelector('[data-act="sound"]').innerHTML = icon(settings.sonido ? 'soundOn' : 'soundOff');
    this.root.querySelector('[data-act="sound"]').classList.toggle('on', !settings.sonido);
    this.root.querySelector('[data-act="legend"]').classList.toggle('on', settings.leyenda);

    this.renderLegend(state, settings.leyenda);
    this.renderTurn(state, roster);
    this.renderTeams(state, roster);
  }

  renderLegend(state, visible) {
    const lg = this.q('legend');
    lg.classList.toggle('hidden', !visible);
    lg.innerHTML =
      `<h4>Casillas</h4>` +
      LEGEND_TYPES.map((t) => {
        const st = SQUARE_STYLE[t];
        const glyph = st.glyph === 'stop' ? '■' : st.glyph ? esc(st.glyph) : RING;
        return `<div class="legend-row"><span class="legend-sw" style="background:${st.color};color:${st.ink}">${glyph}</span><span class="legend-name">${esc(st.word || t)}<span class="legend-fx">${esc(effectText(t, state.rules))}</span></span></div>`;
      }).join('');
  }

  renderTurn(state, roster, playing = false) {
    const box = this.q('turn');
    const team = state.teams[state.turn];
    if (!team || state.phase === 'finished' || state.phase === 'idle') {
      box.classList.add('hidden');
      return;
    }
    const r = roster.find((t) => t.id === team.id);
    const hints = {
      spin: '<kbd>Espacio</kbd> para girar',
      card: 'Respondiendo carta',
      collision: 'Resolviendo choque',
    };
    box.style.setProperty('--team', r.color);
    const hint = playing ? 'En juego…' : hints[state.phase] || '';
    box.innerHTML = `<div class="turn-chip">${vehicleSVG(r.id, r.color)}</div><div><div class="turn-label">Turno de</div><div class="turn-name">${esc(r.nombre)}</div></div><div class="turn-hint">${hint}</div>`;
    box.classList.remove('hidden');
  }

  renderTeams(state, roster) {
    const strip = this.q('teams');
    const active = state.phase !== 'finished' ? state.teams[state.turn]?.id : null;
    strip.innerHTML = state.teams
      .map((t) => {
        const r = roster.find((x) => x.id === t.id);
        const pct = (t.pos / LANE_LENGTH) * 100;
        let badge = '';
        if (t.finished) badge = `<span class="badge win">${t.place}° Meta</span>`;
        else if (t.skip > 0) badge = `<span class="badge warn">Pierde turno</span>`;
        else if (CRUCES.includes(t.pos)) badge = `<span class="badge">En cruce</span>`;
        else if (t.id === active) badge = `<span class="badge">En juego</span>`;
        const ticks = CRUCES.map((c) => `<span class="progress-tick" style="left:${(c / LANE_LENGTH) * 100}%"></span>`).join('');
        return `<div class="team ${t.id === active ? 'active' : ''} ${t.finished ? 'done' : ''}" style="--team:${r.color}" data-team="${t.id}">
          <div class="team-top">${vehicleSVG(r.id, r.color)}<div style="min-width:0"><div class="team-name">${esc(r.nombre)}</div><div class="team-sub">Casilla ${t.pos} / ${LANE_LENGTH} ${badge}</div></div></div>
          <div class="progress"><span class="progress-fill" style="width:${pct}%"></span>${ticks}</div>
        </div>`;
      })
      .join('');
  }

  toast(text, accent, ms = 2600) {
    const t = el(`<div class="toast" style="--accent:${accent || 'var(--gold)'}">${esc(text)}</div>`);
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 400);
    }, ms);
  }

  clearToasts() {
    this.toasts.innerHTML = '';
  }

  showSpin(value, teamName) {
    const s = this.q('spin');
    s.innerHTML = `<b data-n="${value}">${value}</b><span>${esc(teamName)} avanza</span>`;
    s.classList.remove('show');
    void s.offsetWidth;
    s.classList.add('show');
  }
}
