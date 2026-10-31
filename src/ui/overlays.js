import { LANE_LENGTH } from '../engine/board.js';
import { el, esc } from './dom.js';
import { vehicleSVG } from './icons.js';

const CONFETTI = ['#F7A600', '#91BDE1', '#FFFFFF', '#3BC3AD', '#EF4230', '#FCCD8E'];

export class Winner {
  constructor(root, app) {
    this.app = app;
    this.node = el('<div class="winner"><canvas></canvas><div class="winner-inner"></div></div>');
    root.appendChild(this.node);
    this.canvas = this.node.querySelector('canvas');
    this.inner = this.node.querySelector('.winner-inner');
    this.node.addEventListener('click', (e) => {
      const b = e.target.closest('[data-w]');
      if (!b) return;
      if (b.dataset.w === 'close') this.close();
      if (b.dataset.w === 'undo') app.command('undo');
      if (b.dataset.w === 'new') {
        this.close();
        app.config.open('partida');
      }
    });
  }

  isOpen() {
    return this.node.classList.contains('open');
  }

  open(state) {
    const roster = this.app.session.data.roster;
    const w = roster.find((t) => t.id === state.winner);
    const ranking = [...state.teams]
      .sort((a, b) => (a.place || 99) - (b.place || 99) || b.pos - a.pos)
      .map((t, i) => {
        const r = roster.find((x) => x.id === t.id);
        return `<div class="rank"><i>${i + 1}°</i>${esc(r.nombre)} <span style="opacity:.6">${t.finished ? 'Meta' : `casilla ${t.pos}/${LANE_LENGTH}`}</span></div>`;
      })
      .join('');
    this.inner.innerHTML = `
      <div class="winner-eyebrow">Sentencia firme · Llegó a la Meta</div>
      <div class="winner-name">¡Ganó ${esc(w.nombre)}!</div>
      <div class="winner-plate" style="--team:${w.color}">${vehicleSVG(w.id, w.color)}<b>Equipo ${esc(w.nombre)}</b></div>
      <div class="ranking">${ranking}</div>
      <div class="winner-actions">
        <button class="btn gold" data-w="close">Ver tablero <small>Enter</small></button>
        <button class="btn" data-w="undo">Deshacer última jugada <small>Z</small></button>
        <button class="btn primary" data-w="new">Nueva partida</button>
      </div>`;
    this.node.classList.add('open');
    this.startConfetti();
  }

  close() {
    this.node.classList.remove('open');
    cancelAnimationFrame(this.raf);
  }

  startConfetti() {
    const c = this.canvas;
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    const N = 220;
    const parts = Array.from({ length: N }, (_, i) => ({
      x: (i * 97.13) % 1,
      delay: ((i * 31) % 100) / 60,
      speed: 0.12 + ((i * 17) % 10) / 40,
      sway: 0.02 + ((i * 7) % 10) / 300,
      size: 6 + ((i * 13) % 8),
      color: CONFETTI[i % CONFETTI.length],
      spin: 2 + (i % 5),
    }));
    const t0 = performance.now();
    const draw = (now) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of parts) {
        const tt = t - p.delay;
        if (tt < 0) continue;
        const y = ((tt * p.speed) % 1.15) - 0.08;
        const x = p.x + Math.sin(tt * 2 + p.x * 10) * p.sway;
        ctx.save();
        ctx.translate(x * c.width, y * c.height);
        ctx.rotate(tt * p.spin);
        ctx.scale(1, Math.cos(tt * p.spin * 1.3));
        ctx.fillStyle = p.color;
        ctx.fillRect((-p.size / 2) * dpr, (-p.size / 4) * dpr, p.size * dpr, (p.size / 2) * dpr);
        ctx.restore();
      }
      this.raf = requestAnimationFrame(draw);
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(draw);
  }
}

export class Splash {
  constructor(root, app) {
    this.app = app;
    this.node = el('<div class="splash"><div class="splash-inner"></div></div>');
    root.appendChild(this.node);
    this.node.addEventListener('click', (e) => {
      const b = e.target.closest('[data-s]');
      if (!b) return;
      if (b.dataset.s === 'go') app.start();
      if (b.dataset.s === 'new') app.start({ restart: true });
    });
  }

  isOpen() {
    return !this.node.classList.contains('gone');
  }

  render() {
    const { settings, roster } = this.app.session.data;
    const st = this.app.session.state;
    const teams = roster
      .filter((t) => t.enabled)
      .map((t, i) => `<div class="splash-team" style="--team:${t.color};animation-delay:${0.3 + i * 0.08}s">${vehicleSVG(t.id, t.color)}</div>`)
      .join('');
    const inProgress = st.moves > 0 && st.phase !== 'finished';
    const [first, ...rest] = settings.titulo.split(' ');
    this.node.querySelector('.splash-inner').innerHTML = `
      <div class="splash-eyebrow">Facultad de Derecho · Universidad de Buenos Aires</div>
      <div class="splash-title">${esc(first)} <em>${esc(rest.join(' '))}</em></div>
      <div class="splash-sub">${esc(settings.subtitulo)}</div>
      <div class="splash-teams">${teams}</div>
      <div class="splash-actions">
        ${
          inProgress
            ? `<button class="btn gold" data-s="go">Continuar partida · jugada ${st.moves} <small>Espacio</small></button><button class="btn" data-s="new">Empezar de cero</button>`
            : `<button class="btn gold" data-s="go">Comenzar <small>Espacio</small></button>`
        }
      </div>`;
  }

  hide() {
    this.node.classList.add('gone');
  }
}
