import * as THREE from 'three';
import { BOARD } from './layout.js';
import { UBA } from './palette.js';
import { COURT_PLAZA } from './space.js';
import { canvas, makeNoise } from './textures.js';

// The printed cardboard underneath everything: soft coloured regions, paper
// grain, vignette and the centre fold. Nothing here needs to be sharp; roads,
// squares and lettering are real geometry on top.

const W = BOARD.width;
const D = BOARD.depth;
const REGION_COLORS = ['#E7B33B', '#E2873A', '#6EA346', '#A8B642', '#D8BF78', '#8CBD5A', '#E49C67', '#C9D37A'];

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function worldCanvas(ppu) {
  const { c, ctx } = canvas(Math.round(W * ppu), Math.round(D * ppu));
  ctx.setTransform(ppu, 0, 0, ppu, (W / 2) * ppu, (D / 2) * ppu);
  return { c, ctx };
}

function paintRegions(ctx) {
  const gw = Math.round(W * 10);
  const gh = Math.round(D * 10);
  const { c: small, ctx: sctx } = canvas(gw, gh);
  const img = sctx.createImageData(gw, gh);
  const rnd = seeded(5);
  const seeds = Array.from({ length: 30 }, () => ({ x: (rnd() - 0.5) * W, z: (rnd() - 0.5) * D, c: new THREE.Color(REGION_COLORS[Math.floor(rnd() * REGION_COLORS.length)]) }));
  const n = makeNoise(17);
  const mix = new THREE.Color();
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x = (i / gw - 0.5) * W;
      const z = (j / gh - 0.5) * D;
      const wx = x + (n(x * 0.18, z * 0.18) - 0.5) * 5;
      const wz = z + (n(x * 0.18 + 40, z * 0.18 + 40) - 0.5) * 5;
      let best = Infinity;
      let second = Infinity;
      let a = seeds[0].c;
      let b = seeds[0].c;
      for (const s of seeds) {
        const d = (s.x - wx) ** 2 + (s.z - wz) ** 2;
        if (d < best) {
          second = best;
          b = a;
          best = d;
          a = s.c;
        } else if (d < second) {
          second = d;
          b = s.c;
        }
      }
      // Soft blend at region borders: no hard pixel edges to magnify.
      const t = Math.min(1, (Math.sqrt(second) - Math.sqrt(best)) / 0.9);
      mix.copy(b).lerp(a, 0.5 + t * 0.5);
      const k = 0.95 + n(x * 0.9, z * 0.9) * 0.08;
      const o = (j * gw + i) * 4;
      img.data[o] = mix.r * 255 * k;
      img.data[o + 1] = mix.g * 255 * k;
      img.data[o + 2] = mix.b * 255 * k;
      img.data[o + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'blur(2px)';
  ctx.drawImage(small, -W / 2, -D / 2, W, D);
  ctx.restore();
}

function paintCourtPlaza(ctx) {
  const { x0, x1, z0, z1 } = COURT_PLAZA;
  ctx.save();
  ctx.fillStyle = '#E8DDC5';
  ctx.beginPath();
  ctx.roundRect(x0, z0, x1 - x0, z1 - z0, 0.3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,96,64,0.3)';
  ctx.lineWidth = 0.03;
  for (let x = x0 + 0.5; x < x1; x += 0.5) {
    ctx.beginPath();
    ctx.moveTo(x, z0);
    ctx.lineTo(x, z1);
    ctx.stroke();
  }
  for (let z = z0 + 0.5; z < z1; z += 0.5) {
    ctx.beginPath();
    ctx.moveTo(x0, z);
    ctx.lineTo(x1, z);
    ctx.stroke();
  }
  ctx.restore();
}

function paintAge(ctx) {
  ctx.save();
  const v = ctx.createRadialGradient(0, 0, Math.min(W, D) * 0.35, 0, 0, Math.max(W, D) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(92,60,20,0.26)');
  ctx.fillStyle = v;
  ctx.fillRect(-W / 2, -D / 2, W, D);
  const fold = ctx.createLinearGradient(-0.25, 0, 0.25, 0);
  fold.addColorStop(0, 'rgba(255,255,255,0)');
  fold.addColorStop(0.45, 'rgba(255,255,255,0.2)');
  fold.addColorStop(0.55, 'rgba(40,24,8,0.2)');
  fold.addColorStop(1, 'rgba(40,24,8,0)');
  ctx.fillStyle = fold;
  ctx.fillRect(-0.25, -D / 2, 0.5, D);
  ctx.restore();
}

function paintBorder(ctx) {
  ctx.save();
  ctx.strokeStyle = UBA.navy;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-W / 2 + 0.25, -D / 2 + 0.25, W - 0.5, D - 0.5);
  ctx.strokeStyle = UBA.gold;
  ctx.lineWidth = 0.08;
  ctx.strokeRect(-W / 2 + 0.65, -D / 2 + 0.65, W - 1.3, D - 1.3);
  ctx.restore();
}

// Fine paper tooth, tiled so it stays sharp at any zoom.
function toothTexture() {
  const S = 256;
  const { c, ctx } = canvas(S);
  const img = ctx.createImageData(S, S);
  const rnd = seeded(9);
  for (let i = 0; i < S * S; i++) {
    const v = 110 + rnd() * 40;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(W / 1.5, D / 1.5);
  t.anisotropy = 8;
  return t;
}

export class PrintedBoard {
  constructor(quality = 'alto') {
    const ppu = quality === 'bajo' ? 24 : 40;
    const { c, ctx } = worldCanvas(ppu);
    paintRegions(ctx);
    paintCourtPlaza(ctx);
    paintAge(ctx);
    paintBorder(ctx);
    this.map = new THREE.CanvasTexture(c);
    this.map.colorSpace = THREE.SRGBColorSpace;
    this.map.anisotropy = 16;
    this.bump = toothTexture();
  }
}
