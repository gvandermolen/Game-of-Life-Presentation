import * as THREE from 'three';
import { SQUARE_STYLE, SPINNER_COLORS, UBA } from './palette.js';

const FONT = 'Bitter, Georgia, serif';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d') };
}

function toTexture(c, { repeat, anisotropy = 8 } = {}) {
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
function makeNoise(seed = 1) {
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

export function feltTexture(size = 512, base = [150, 200, 120]) {
  const { c, ctx } = canvas(size);
  const img = ctx.createImageData(size, size);
  const n = makeNoise(3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = 0.92 + n(x * 0.05, y * 0.05) * 0.08 + (Math.random() - 0.5) * 0.06;
      const i = (y * size + x) * 4;
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { repeat: [6, 4] });
}

function drawStop(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${r * 0.62}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALTO', cx, cy + r * 0.04);
}

// Square label decal for a lane tile (transparent background).
export function tileLabel(type) {
  const st = SQUARE_STYLE[type];
  const S = 256;
  const { c, ctx } = canvas(S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = st.ink;
  if (type === 'libre') {
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, 14, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.glyph === 'stop') {
    drawStop(ctx, S / 2, S * 0.42, 62, '#C8321E');
  } else if (st.glyph) {
    const size = st.glyph.length > 2 ? 84 : 128;
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.fillText(st.glyph, S / 2, S * 0.43);
  }
  if (st.word && type !== 'salida') {
    ctx.font = `700 ${st.word.length > 8 ? 30 : 36}px ${FONT}`;
    ctx.fillText(st.word, S / 2, S * 0.83);
  }
  return toTexture(c);
}

// Full-width band (salida, cruce, meta). Canvas x = across lanes, y = along travel.
export function bandTexture(type, number) {
  const W = 1024;
  const H = 384;
  const { c, ctx } = canvas(W, H);
  const st = SQUARE_STYLE[type];
  ctx.fillStyle = st.color;
  ctx.fillRect(0, 0, W, H);

  if (type === 'cruce') {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const stripes = 14;
    for (let i = 0; i < stripes; i++) {
      const x = 28 + i * ((W - 56) / stripes);
      ctx.fillRect(x, 18, (W - 56) / stripes - 22, 64);
      ctx.fillRect(x, H - 82, (W - 56) / stripes - 22, 64);
    }
    ctx.fillStyle = UBA.gold;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = UBA.navy;
    ctx.font = `900 84px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), W / 2, H / 2 + 4);
    ctx.fillStyle = '#fff';
    ctx.font = `700 54px ${FONT}`;
    ctx.fillText('CRUCE', W / 2 - 250, H / 2 + 2);
    ctx.fillText('CRUCE', W / 2 + 250, H / 2 + 2);
  } else {
    const sq = 32;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < W / sq; x++) {
        ctx.fillStyle = (x + y) % 2 ? UBA.navy : '#fff';
        ctx.fillRect(x * sq, y * sq, sq, sq);
        ctx.fillRect(x * sq, H - (2 - y) * sq, sq, sq);
      }
    }
    ctx.fillStyle = st.ink;
    ctx.font = `900 120px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.word, W / 2, H / 2 + 6);
  }
  return toTexture(c);
}

// Spinner face: wedge k (1..10) is centred at canvas angle (k - 0.5) * 2π/10 - π/2.
export function spinnerTexture(count = 10) {
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
  ctx.font = `700 34px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = 'JURISPRUDENCIA · EN · RUTA · ';
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
