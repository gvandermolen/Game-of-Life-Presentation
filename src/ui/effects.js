import { ANIMACION, CELULAR } from '../content/guion.js';
import { el, esc } from './dom.js';

const CONFETTI = ['#F7A600', '#91BDE1', '#FFFFFF', '#3BC3AD', '#EF4230', '#FCCD8E'];

const GAVEL = `
<svg class="gavel-svg" viewBox="0 0 240 200" aria-hidden="true">
  <g class="gavel-block"><rect x="12" y="160" width="112" height="22" rx="6" fill="#6B4426"/><rect x="24" y="150" width="88" height="14" rx="5" fill="#8A5A36"/></g>
  <g class="gavel-arm">
    <rect x="118" y="40" width="12" height="118" rx="6" fill="#7A4E32" transform="rotate(-90 124 99)"/>
    <rect x="44" y="64" width="44" height="70" rx="10" fill="#5A3820"/>
    <rect x="40" y="70" width="52" height="10" rx="4" fill="#C9A227"/>
    <rect x="40" y="118" width="52" height="10" rx="4" fill="#C9A227"/>
  </g>
</svg>`;

// HTML overlays drawn over the 3D board during animations: gavel, stamp,
// storm, speech bubbles and confetti.
export class Effects {
  constructor(root, app) {
    this.app = app;
    this.node = el(`
      <div class="fx-layer">
        <canvas class="rain"></canvas>
        <div class="flash"></div>
        <div class="alert"><b>${esc(ANIMACION.alerta)}</b><span>${esc(ANIMACION.alertaSub)}</span></div>
        <canvas class="confetti"></canvas>
        <div class="bubbles"></div>
        <div class="gavel">${GAVEL}</div>
        <div class="stamp-scene">
          <div class="app-icon"><svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 1 7 7c0 5.2-7 13-7 13S5 14.2 5 9a7 7 0 0 1 7-7Zm0 4.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" fill="#fff"/></svg><span>${esc(CELULAR.app)}</span></div>
          <div class="stamp">${esc(ANIMACION.sello)}</div>
        </div>
      </div>`);
    root.appendChild(this.node);
    this.rainCanvas = this.node.querySelector('.rain');
    this.confettiCanvas = this.node.querySelector('.confetti');
    this.bubbleRoot = this.node.querySelector('.bubbles');
    this.bubbles = new Set();
  }

  // ---- storm

  storm(on) {
    this.node.classList.toggle('storm', on);
    cancelAnimationFrame(this.rainRaf);
    if (!on) return;
    const c = this.rainCanvas;
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    const drops = Array.from({ length: 260 }, (_, i) => ({ x: Math.random(), y: Math.random(), v: 1.4 + ((i * 37) % 10) / 8, l: 14 + ((i * 13) % 12) }));
    let last = performance.now();
    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.strokeStyle = 'rgba(190, 210, 235, 0.55)';
      ctx.lineWidth = 1.4 * dpr;
      ctx.beginPath();
      for (const d of drops) {
        d.y += d.v * dt;
        d.x -= d.v * dt * 0.12;
        if (d.y > 1.05) {
          d.y = -0.05;
          d.x = Math.random() * 1.1;
        }
        const x = d.x * c.width;
        const y = d.y * c.height;
        ctx.moveTo(x, y);
        ctx.lineTo(x - d.l * 0.12 * dpr, y + d.l * dpr);
      }
      ctx.stroke();
      this.rainRaf = requestAnimationFrame(draw);
    };
    this.rainRaf = requestAnimationFrame(draw);
  }

  lightning() {
    const f = this.node.querySelector('.flash');
    f.classList.remove('on');
    void f.offsetWidth;
    f.classList.add('on');
  }

  // ---- bubbles that follow a point in the 3D scene

  bubble(kind, worldPos, seconds) {
    const text = kind === 'salto' ? ANIMACION.salto : ANIMACION.juez;
    const b = { node: el(`<div class="bubble ${kind}">${esc(text)}</div>`), worldPos };
    this.bubbleRoot.appendChild(b.node);
    this.bubbles.add(b);
    this.update();
    requestAnimationFrame(() => b.node.classList.add('show'));
    this.app.stage.wait(seconds).then(() => {
      b.node.classList.remove('show');
      setTimeout(() => {
        b.node.remove();
        this.bubbles.delete(b);
      }, 400);
    });
  }

  update() {
    for (const b of this.bubbles) {
      const p = this.app.stage.screenOf(b.worldPos());
      if (!p) continue;
      b.node.style.left = `${p.x}px`;
      b.node.style.top = `${p.y}px`;
    }
  }

  // ---- gavel and stamp

  async gavel() {
    const g = this.node.querySelector('.gavel');
    g.classList.remove('on');
    void g.offsetWidth;
    g.classList.add('on');
    const s = this.app.stage;
    await s.wait(0.55);
    this.app.sound.knock();
    await s.wait(0.5);
    this.app.sound.knock();
    await s.wait(0.85);
    g.classList.remove('on');
    await s.wait(0.25);
  }

  async stamp() {
    const g = this.node.querySelector('.gavel');
    const st = this.node.querySelector('.stamp-scene');
    const s = this.app.stage;
    g.classList.remove('on');
    void g.offsetWidth;
    g.classList.add('on', 'once');
    await s.wait(0.55);
    this.app.sound.knock();
    await s.wait(0.5);
    g.classList.remove('on', 'once');
    st.classList.add('on');
    await s.wait(0.75);
    this.app.sound.stamp();
    st.classList.add('stamped');
    await s.wait(1.9);
    st.classList.remove('on', 'stamped');
    await s.wait(0.25);
  }

  // ---- confetti

  confetti(seconds = 6) {
    const c = this.confettiCanvas;
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    const parts = Array.from({ length: 200 }, (_, i) => ({
      x: (i * 97.13) % 1,
      delay: ((i * 31) % 100) / 70,
      speed: 0.14 + ((i * 17) % 10) / 40,
      sway: 0.02 + ((i * 7) % 10) / 300,
      size: 7 + ((i * 13) % 8),
      color: CONFETTI[i % CONFETTI.length],
      spin: 2 + (i % 5),
    }));
    const t0 = performance.now();
    cancelAnimationFrame(this.confettiRaf);
    const draw = (now) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, c.width, c.height);
      if (t > seconds + 3) return;
      for (const p of parts) {
        const tt = t - p.delay;
        if (tt < 0) continue;
        const y = tt * p.speed - 0.08;
        if (y > 1.1 || (t > seconds && y < 0)) continue;
        const x = p.x + Math.sin(tt * 2 + p.x * 10) * p.sway;
        ctx.save();
        ctx.translate(x * c.width, y * c.height);
        ctx.rotate(tt * p.spin);
        ctx.scale(1, Math.cos(tt * p.spin * 1.3));
        ctx.fillStyle = p.color;
        ctx.fillRect((-p.size / 2) * dpr, (-p.size / 4) * dpr, p.size * dpr, (p.size / 2) * dpr);
        ctx.restore();
      }
      this.confettiRaf = requestAnimationFrame(draw);
    };
    this.confettiRaf = requestAnimationFrame(draw);
  }

  clear() {
    this.storm(false);
    cancelAnimationFrame(this.confettiRaf);
    this.confettiCanvas.getContext('2d').clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
    for (const b of this.bubbles) b.node.remove();
    this.bubbles.clear();
    this.node.querySelectorAll('.on, .stamped').forEach((n) => n.classList.remove('on', 'stamped', 'once'));
  }
}
