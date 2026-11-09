import * as THREE from 'three';
import { SPINNER_COLORS, UBA } from './palette.js';

const FONT = 'Bitter, Georgia, serif';

export function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d') };
}

export function toTexture(c, { repeat, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Small deterministic value noise.
export function makeNoise(seed = 1) {
  const perm = new Uint8Array(512);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const val = (x, y) => perm[(x & 255) + perm[y & 255]] / 255;
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const a = val(xi, yi);
    const b = val(xi + 1, yi);
    const c = val(xi, yi + 1);
    const d = val(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

export function woodTexture(size = 1024) {
  const { c, ctx } = canvas(size);
  const img = ctx.createImageData(size, size);
  const n = makeNoise(7);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const warp = n(x * 0.004, y * 0.03) * 7 + n(x * 0.02, y * 0.2) * 0.8;
      const ring = Math.sin(y * 0.045 + warp * 3.2) * 0.5 + 0.5;
      const fine = n(x * 0.6, y * 0.05) * 0.18;
      const plank = Math.floor(y / (size / 4)) % 2 ? 0.04 : 0;
      const k = 0.66 + ring * 0.24 + fine - plank;
      const i = (y * size + x) * 4;
      img.data[i] = 128 * k + 20;
      img.data[i + 1] = 78 * k + 10;
      img.data[i + 2] = 46 * k + 6;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = 'rgba(30,14,6,0.55)';
  for (let p = 1; p < 4; p++) ctx.fillRect(0, (p * size) / 4 - 1, size, 2);
  return toTexture(c, { repeat: [3, 3] });
}

// Spinner face: wedge k (1..10) is centred at canvas angle (k - 0.5) * 2π/10 - π/2.
export function spinnerTexture(count = 10, title = '') {
  const S = 1024;
  const { c, ctx } = canvas(S);
  const cx = S / 2;
  const r = S / 2 - 6;
  const seg = (Math.PI * 2) / count;
  for (let k = 1; k <= count; k++) {
    const a0 = (k - 1) * seg - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.arc(cx, cx, r, a0, a0 + seg);
    ctx.closePath();
    ctx.fillStyle = SPINNER_COLORS[(k - 1) % SPINNER_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.stroke();

    const mid = a0 + seg / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(mid) * r * 0.74, cx + Math.sin(mid) * r * 0.74);
    ctx.rotate(mid + Math.PI / 2);
    const dark = ['#1D2554', '#3BC3AD', '#EF5A45'].includes(SPINNER_COLORS[(k - 1) % SPINNER_COLORS.length]);
    ctx.fillStyle = dark ? '#fff' : UBA.navy;
    ctx.font = `900 150px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(k), 0, 0);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cx, r * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = UBA.navy;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = UBA.gold;
  ctx.stroke();
  ctx.fillStyle = UBA.goldLight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = `${(title || ' ').toUpperCase()} · `;
  ctx.font = `700 ${Math.min(34, Math.round(1300 / text.length))}px ${FONT}`;
  const rr = r * 0.28;
  for (let i = 0; i < text.length; i++) {
    const a = (i / text.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  return toTexture(c, { anisotropy: 16 });
}

export function deckTexture(word, color) {
  const W = 512;
  const H = 360;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = UBA.navy;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = UBA.gold;
  ctx.lineWidth = 8;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.42, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = UBA.navy;
  ctx.font = `900 64px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(word[0], W / 2, H * 0.42 + 3);
  ctx.fillStyle = UBA.goldLight;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(word.toUpperCase(), W / 2, H * 0.76);
  return toTexture(c);
}

export function signTexture(text, { bg = UBA.navy, fg = UBA.gold, w = 512, h = 128, size = 72 } = {}) {
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 4);
  return toTexture(c);
}

export function radialShadowTexture() {
  const { c, ctx } = canvas(128);
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}
