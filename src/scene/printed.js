import * as THREE from 'three';
import { CROSSINGS, LANES, LANE_COUNT, LANE_LENGTH, crossingAt } from '../engine/board.js';
import {
  BOARD,
  COURTHOUSE_POS,
  LANE_GEO,
  META_LINE,
  ROAD_WIDTH,
  SPINNER_POS,
  crossingCenter,
  crossingRadius,
  distanceToRoads,
  laneFrame,
  laneSquare,
  squareLength,
  warp,
} from './layout.js';
import { SQUARE_STYLE, UBA } from './palette.js';
import { canvas, makeNoise } from './textures.js';

// The printed board: one big canvas in world units, like the cardboard of the
// original game. Canvas x = world x, canvas y = world z.

const FONT = 'Bitter, Georgia, serif';
const W = BOARD.width;
const D = BOARD.depth;
const ASPHALT = '#2A2C31';
const INK = '#3B2A1A';
const REGION_COLORS = ['#E7B33B', '#E2873A', '#6EA346', '#A8B642', '#D8BF78', '#8CBD5A', '#E49C67', '#C9D37A'];

export const RIVER = Array.from({ length: 80 }, (_, i) => {
  const x = -W / 2 - 0.5 + ((W + 1) * i) / 79;
  return new THREE.Vector3(x, 0, 11.3 + 0.75 * Math.sin(x * 0.3 + 0.5));
});
export const RIVER_WIDTH = 1.15;

export const CARTOUCHE = { x0: -5.2, x1: 5.2, z0: 13.0, z1: 16.3 };
export const COURT_PLAZA = { x0: -5.6, x1: 5.6, z0: -17, z1: -13.75 };

const NEIGHBOURHOODS = ['Palermo', 'Recoleta', 'La Boca', 'San Telmo', 'Belgrano', 'Caballito', 'Puerto Madero', 'Once', 'Flores', 'Retiro', 'Almagro', 'Núñez'];

export function riverDistance(x, z) {
  let best = Infinity;
  for (const p of RIVER) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
  return best;
}

const inRect = (r, x, z, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;

// Spots on the board that keep away from roads, plazas, the spinner and print furniture.
export function isFree(x, z, r, { road = 0.35, river = 0.6 } = {}) {
  if (Math.abs(x) > W / 2 - 0.6 - r || Math.abs(z) > D / 2 - 0.6 - r) return false;
  if (Math.hypot(x - SPINNER_POS.x, z - SPINNER_POS.z) < 3.7 + r) return false;
  if (inRect(CARTOUCHE, x, z, r + 0.3) || inRect(COURT_PLAZA, x, z, r + 0.3)) return false;
  if (river !== null && riverDistance(x, z) < RIVER_WIDTH / 2 + river + r) return false;
  for (const c of CROSSINGS) if (crossingCenter(c.id).distanceTo(new THREE.Vector3(x, 0, z)) < crossingRadius(c.id) + 0.5 + r) return false;
  for (let lane = 0; lane < LANE_COUNT; lane++) if (laneSquare(lane, 0).pos.distanceTo(new THREE.Vector3(x, 0, z)) < 1.25 + r) return false;
  return distanceToRoads(x, z) > ROAD_WIDTH / 2 + road + r;
}

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Neighbourhood label positions (deterministic).
export const LABEL_SPOTS = (() => {
  const rnd = seeded(29);
  const spots = [];
  for (let tries = 0; tries < 4000 && spots.length < NEIGHBOURHOODS.length; tries++) {
    const x = (rnd() - 0.5) * (W - 4);
    const z = (rnd() - 0.5) * (D - 4);
    if (!isFree(x, z, 1.3, { road: 0.2 })) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 6.5)) continue;
    spots.push({ x, z, name: NEIGHBOURHOODS[spots.length] });
  }
  return spots;
})();

function pathOf(ctx, points) {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.z) : ctx.moveTo(p.x, p.z)));
}

const lanePoints = (lane, n = 420) => Array.from({ length: n }, (_, i) => LANE_GEO[lane].curve.getPointAt(i / (n - 1)));

function text(ctx, ppu, str, x, z, { size, weight = 700, color, rot = 0, italic = false, align = 'center', spacing = 0 }) {
  ctx.save();
  ctx.translate(x, z);
  ctx.rotate(rot);
  ctx.scale(1 / ppu, 1 / ppu);
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${Math.round(size * ppu)}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (spacing) ctx.letterSpacing = `${Math.round(spacing * ppu)}px`;
  ctx.fillStyle = color;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

// Rotation within ±45° that keeps text upright for a viewer at the front edge.
function readable(angle) {
  const q = Math.PI / 2;
  return angle - Math.round(angle / q) * q;
}

function octagon(ctx, cx, cz, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    ctx.lineTo(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- base layer

function paintRegions(ctx, ppu) {
  const gw = Math.round(W * 14);
  const gh = Math.round(D * 14);
  const { c: small, ctx: sctx } = canvas(gw, gh);
  const img = sctx.createImageData(gw, gh);
  const rnd = seeded(5);
  const seeds = Array.from({ length: 30 }, () => ({ x: (rnd() - 0.5) * W, z: (rnd() - 0.5) * D, c: new THREE.Color(REGION_COLORS[Math.floor(rnd() * REGION_COLORS.length)]) }));
  const n = makeNoise(17);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x = (i / gw - 0.5) * W;
      const z = (j / gh - 0.5) * D;
      const wx = x + (n(x * 0.18, z * 0.18) - 0.5) * 5;
      const wz = z + (n(x * 0.18 + 40, z * 0.18 + 40) - 0.5) * 5;
      let best = Infinity;
      let second = Infinity;
      let col = seeds[0].c;
      for (const s of seeds) {
        const d = (s.x - wx) ** 2 + (s.z - wz) ** 2;
        if (d < best) {
          second = best;
          best = d;
          col = s.c;
        } else if (d < second) second = d;
      }
      const edge = Math.sqrt(second) - Math.sqrt(best) < 0.12 ? 0.82 : 1;
      const k = (0.93 + n(x * 1.4, z * 1.4) * 0.1) * edge;
      const o = (j * gw + i) * 4;
      img.data[o] = col.r * 255 * k;
      img.data[o + 1] = col.g * 255 * k;
      img.data[o + 2] = col.b * 255 * k;
      img.data[o + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, -W / 2, -D / 2, W, D);
  ctx.restore();

  // Printed hatching inside regions, like old lithographs.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.03;
  for (let d = -W - D; d < W + D; d += 0.32) {
    ctx.beginPath();
    ctx.moveTo(d, -D / 2);
    ctx.lineTo(d + D, D / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function paintRiver(ctx, ppu) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  pathOf(ctx, RIVER);
  ctx.strokeStyle = '#C8E4F2';
  ctx.lineWidth = RIVER_WIDTH + 0.4;
  ctx.stroke();
  ctx.strokeStyle = '#3F8FCB';
  ctx.lineWidth = RIVER_WIDTH;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.05;
  ctx.setLineDash([0.4, 0.55]);
  for (const off of [-0.22, 0.2]) {
    ctx.save();
    ctx.translate(0.3, off);
    pathOf(ctx, RIVER);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  const z0 = 11.3 + 0.75 * Math.sin(0.5);
  text(ctx, ppu, 'RIACHUELO', 0, z0 + 0.02, { size: 0.42, weight: 700, italic: true, color: '#E9F5FB', spacing: 0.12, rot: -Math.atan(0.75 * 0.3 * Math.cos(0.5)) });
}

function paintCartouche(ctx, ppu) {
  const { x0, x1, z0, z1 } = CARTOUCHE;
  ctx.save();
  ctx.fillStyle = UBA.navy;
  ctx.beginPath();
  ctx.roundRect(x0, z0, x1 - x0, z1 - z0, 0.35);
  ctx.fill();
  ctx.strokeStyle = UBA.gold;
  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.roundRect(x0 + 0.18, z0 + 0.18, x1 - x0 - 0.36, z1 - z0 - 0.36, 0.22);
  ctx.stroke();
  ctx.restore();
  const cx = (x0 + x1) / 2;
  text(ctx, ppu, 'JURISPRUDENCIA', cx, z0 + 0.95, { size: 0.78, weight: 900, color: UBA.goldLight, spacing: 0.05 });
  text(ctx, ppu, 'EN RUTA', cx, z0 + 1.78, { size: 0.62, weight: 900, color: '#FFFFFF', spacing: 0.2 });
  text(ctx, ppu, 'Facultad de Derecho · Universidad de Buenos Aires', cx, z0 + 2.62, { size: 0.24, weight: 400, italic: true, color: UBA.sky });
}

function paintCourtPlaza(ctx) {
  const { x0, x1, z0, z1 } = COURT_PLAZA;
  ctx.save();
  ctx.fillStyle = '#E8DDC5';
  ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
  ctx.strokeStyle = 'rgba(120,96,64,0.35)';
  ctx.lineWidth = 0.025;
  for (let x = x0; x <= x1; x += 0.5) {
    ctx.beginPath();
    ctx.moveTo(x, z0);
    ctx.lineTo(x, z1);
    ctx.stroke();
  }
  for (let z = z0; z <= z1; z += 0.5) {
    ctx.beginPath();
    ctx.moveTo(x0, z);
    ctx.lineTo(x1, z);
    ctx.stroke();
  }
  ctx.restore();
}

function paintLabels(ctx, ppu) {
  for (const s of LABEL_SPOTS) {
    text(ctx, ppu, s.name.toUpperCase(), s.x, s.z, { size: 0.46, weight: 700, italic: true, color: 'rgba(59,42,26,0.62)', spacing: 0.08 });
  }
}

function paintGrain(ctx, ppu) {
  const S = 256;
  const { c, ctx: g } = canvas(S);
  const img = g.createImageData(S, S);
  const rnd = seeded(3);
  for (let i = 0; i < S * S; i++) {
    const v = 120 + rnd() * 120;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v * 0.96;
    img.data[i * 4 + 2] = v * 0.88;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.16;
  const pat = ctx.createPattern(c, 'repeat');
  pat.setTransform(new DOMMatrix().scale(1 / ppu * 1.6));
  ctx.fillStyle = pat;
  ctx.fillRect(-W / 2, -D / 2, W, D);
  ctx.restore();

  // Aged paper: warm vignette and the centre fold.
  ctx.save();
  const v = ctx.createRadialGradient(0, 0, Math.min(W, D) * 0.35, 0, 0, Math.max(W, D) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(92,60,20,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(-W / 2, -D / 2, W, D);
  const fold = ctx.createLinearGradient(-0.25, 0, 0.25, 0);
  fold.addColorStop(0, 'rgba(255,255,255,0)');
  fold.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  fold.addColorStop(0.55, 'rgba(40,24,8,0.22)');
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

// ---------------------------------------------------------------- roads layer

function teamFor(roster, lane) {
  return roster.find((t) => t.lane === lane && t.enabled) || null;
}

function paintRoads(ctx, ppu, roster) {
  const paths = Array.from({ length: LANE_COUNT }, (_, l) => lanePoints(l));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.save();
  ctx.translate(0.1, 0.16);
  ctx.strokeStyle = 'rgba(48,28,10,0.32)';
  ctx.lineWidth = ROAD_WIDTH + 0.45;
  ctx.filter = `blur(${Math.round(ppu * 0.12)}px)`;
  paths.forEach((p) => (pathOf(ctx, p), ctx.stroke()));
  ctx.restore();

  paths.forEach((p, lane) => {
    const t = teamFor(roster, lane);
    pathOf(ctx, p);
    ctx.strokeStyle = t ? t.color : '#8F877A';
    ctx.lineWidth = ROAD_WIDTH + 0.34;
    ctx.stroke();
  });
  paths.forEach((p) => {
    pathOf(ctx, p);
    ctx.strokeStyle = '#F6F0E2';
    ctx.lineWidth = ROAD_WIDTH + 0.1;
    ctx.stroke();
  });
  paths.forEach((p) => {
    pathOf(ctx, p);
    ctx.strokeStyle = ASPHALT;
    ctx.lineWidth = ROAD_WIDTH - 0.04;
    ctx.stroke();
  });
  ctx.restore();
}

function paintBridges(ctx) {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const pts = lanePoints(lane, 600);
    let best = 0;
    let bestD = Infinity;
    pts.forEach((p, i) => {
      const d = riverDistance(p.x, p.z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (bestD > 0.3) continue;
    const { p, tangent, normal } = laneFrame(lane, best / 599);
    const half = RIVER_WIDTH / 2 + 0.45;
    for (const s of [-1, 1]) {
      const o = normal.clone().multiplyScalar(s * (ROAD_WIDTH / 2 + 0.12));
      ctx.save();
      ctx.strokeStyle = '#F4EFE6';
      ctx.lineWidth = 0.14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x + o.x - tangent.x * half, p.z + o.z - tangent.z * half);
      ctx.lineTo(p.x + o.x + tangent.x * half, p.z + o.z + tangent.z * half);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function paintSquares(ctx, ppu) {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (let k = 1; k < LANE_LENGTH; k++) {
      if (crossingAt(lane, k)) continue;
      const type = LANES[lane][k];
      const st = SQUARE_STYLE[type];
      const { pos, tangent } = laneSquare(lane, k);
      const a = Math.atan2(tangent.z, tangent.x);
      const L = squareLength(lane, k);
      const w = ROAD_WIDTH - 0.18;
      ctx.save();
      ctx.translate(pos.x, pos.z);
      ctx.rotate(a);
      ctx.fillStyle = st.color;
      ctx.beginPath();
      ctx.roundRect(-L / 2, -w / 2, L, w, 0.1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 0.03;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(-L / 2 + 0.06, -w / 2 + 0.06, L - 0.12, 0.08);
      ctx.restore();

      const r = readable(a);
      const s = Math.min(L, w);
      if (st.glyph === 'stop') {
        ctx.save();
        ctx.translate(pos.x, pos.z);
        ctx.rotate(r);
        octagon(ctx, 0, -s * 0.1, s * 0.27);
        ctx.fillStyle = '#C8321E';
        ctx.fill();
        ctx.restore();
        text(ctx, ppu, 'ALTO', pos.x + Math.sin(-r) * -s * 0.1, pos.z + Math.cos(r) * -s * 0.1, { size: s * 0.15, weight: 900, color: '#fff', rot: r });
      } else if (st.glyph) {
        const g = st.glyph.length > 2 ? 0.3 : 0.44;
        text(ctx, ppu, st.glyph, pos.x - Math.sin(r) * -s * 0.1, pos.z + Math.cos(r) * -s * 0.1, { size: s * g, weight: 900, color: st.ink, rot: r });
      }
      if (st.word) {
        const off = s * 0.3;
        text(ctx, ppu, st.word, pos.x - Math.sin(r) * off, pos.z + Math.cos(r) * off, { size: s * (st.word.length > 8 ? 0.12 : 0.14), weight: 700, color: st.ink, rot: r });
      }
      const corner = { x: -s * 0.36, z: -s * 0.36 };
      text(ctx, ppu, String(k), pos.x + corner.x * Math.cos(r) - corner.z * Math.sin(r), pos.z + corner.x * Math.sin(r) + corner.z * Math.cos(r), {
        size: s * 0.12,
        weight: 700,
        color: type === 'multa' ? 'rgba(255,255,255,0.7)' : 'rgba(29,37,84,0.45)',
        rot: r,
      });
    }
  }
}

// Point on a lane at distance `dist` (along the road) before (-1) or after (+1) its crossing.
function aroundCrossing(lane, k, dist, dir) {
  const { length, stations } = LANE_GEO[lane];
  const u = Math.min(1, Math.max(0, stations[k] + (dir * dist) / length));
  return laneFrame(lane, u);
}

function paintCrossings(ctx, ppu, roster) {
  for (const c of CROSSINGS) {
    const center = crossingCenter(c.id);
    const R = crossingRadius(c.id);

    // Zebra crossings on every road entering and leaving the plaza.
    for (const lane of c.lanes) {
      for (const dir of [-1, 1]) {
        const { p, tangent } = aroundCrossing(lane, c.index, R + 0.32, dir);
        const a = Math.atan2(tangent.z, tangent.x);
        ctx.save();
        ctx.translate(p.x, p.z);
        ctx.rotate(a);
        ctx.fillStyle = '#F7F3EA';
        const bars = 5;
        const span = ROAD_WIDTH - 0.28;
        for (let i = 0; i < bars; i++) ctx.fillRect(-0.2, -span / 2 + (i * span) / bars + 0.03, 0.4, span / bars - 0.08);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.shadowColor = 'rgba(40,24,8,0.4)';
    ctx.shadowBlur = ppu * 0.2;
    ctx.shadowOffsetY = ppu * 0.06;
    ctx.beginPath();
    ctx.arc(center.x, center.z, R + 0.12, 0, Math.PI * 2);
    ctx.fillStyle = UBA.gold;
    ctx.fill();
    ctx.restore();

    // Team-coloured arcs: who meets here.
    const lanes = c.lanes.map((l) => teamFor(roster, l));
    lanes.forEach((t, i) => {
      ctx.beginPath();
      const a0 = -Math.PI / 2 + (i * Math.PI * 2) / lanes.length + 0.08;
      ctx.arc(center.x, center.z, R + 0.04, a0, a0 + (Math.PI * 2) / lanes.length - 0.16);
      ctx.strokeStyle = t ? t.color : '#8F877A';
      ctx.lineWidth = 0.13;
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.arc(center.x, center.z, R - 0.06, 0, Math.PI * 2);
    ctx.fillStyle = ASPHALT;
    ctx.fill();
    ctx.save();
    ctx.setLineDash([0.22, 0.18]);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.arc(center.x, center.z, R - 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(center.x, center.z, 0.48, 0, Math.PI * 2);
    ctx.fillStyle = UBA.navy;
    ctx.fill();
    ctx.lineWidth = 0.06;
    ctx.strokeStyle = UBA.gold;
    ctx.stroke();
    text(ctx, ppu, String(c.id), center.x, center.z + 0.03, { size: 0.5, weight: 900, color: UBA.gold });
    text(ctx, ppu, 'CRUCE', center.x, center.z - R + 0.6, { size: 0.2, weight: 900, color: '#fff', spacing: 0.04 });
  }
}

function paintStarts(ctx, ppu, roster) {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const { pos } = laneSquare(lane, 0);
    const t = teamFor(roster, lane);
    ctx.save();
    ctx.shadowColor = 'rgba(40,24,8,0.4)';
    ctx.shadowBlur = ppu * 0.2;
    ctx.shadowOffsetY = ppu * 0.06;
    ctx.beginPath();
    ctx.arc(pos.x, pos.z, 1.12, 0, Math.PI * 2);
    ctx.fillStyle = t ? t.color : '#8F877A';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(pos.x, pos.z, 0.95, 0, Math.PI * 2);
    ctx.fillStyle = '#FBF6EA';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pos.x, pos.z, 0.82, 0, Math.PI * 2);
    ctx.fillStyle = UBA.navy;
    ctx.fill();
    text(ctx, ppu, 'SALIDA', pos.x, pos.z - 0.42, { size: 0.19, weight: 900, color: UBA.gold, spacing: 0.03 });
    const name = (t?.nombre || '').toUpperCase();
    text(ctx, ppu, name, pos.x, pos.z + 0.47, { size: name.length > 10 ? 0.12 : 0.16, weight: 700, color: '#fff' });
  }
}

function paintMeta(ctx, ppu) {
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(40,24,8,0.4)';
  ctx.shadowBlur = ppu * 0.2;
  ctx.shadowOffsetY = ppu * 0.06;
  pathOf(ctx, META_LINE);
  ctx.strokeStyle = UBA.navy;
  ctx.lineWidth = 1.75;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  pathOf(ctx, META_LINE);
  ctx.strokeStyle = UBA.gold;
  ctx.lineWidth = 1.35;
  ctx.stroke();
  // Checkered edges.
  for (let i = 0; i < META_LINE.length - 1; i++) {
    const a = META_LINE[i];
    const b = META_LINE[i + 1];
    const ang = Math.atan2(b.z - a.z, b.x - a.x);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const cells = Math.max(1, Math.round(len / 0.22));
    ctx.save();
    ctx.translate(a.x, a.z);
    ctx.rotate(ang);
    for (let j = 0; j < cells; j++) {
      for (const [row, y] of [[0, -0.675], [1, 0.455]]) {
        ctx.fillStyle = (i * cells + j + row) % 2 ? UBA.navy : '#fff';
        ctx.fillRect((j * len) / cells, y, len / cells + 0.002, 0.22);
      }
    }
    ctx.restore();
  }
  ctx.restore();
  for (const x of [-21.2, -15.85, -10.05, 0, 10.05, 15.85, 21.2]) {
    const [wx, wz] = warp(x, -12.9);
    const [wx2, wz2] = warp(x + 0.1, -12.9);
    const rot = Math.atan2(wz2 - wz, wx2 - wx);
    text(ctx, ppu, x === 0 ? 'META · PALACIO DE JUSTICIA' : 'META', wx, wz + 0.02, { size: 0.55, weight: 900, color: UBA.navy, spacing: 0.06, rot });
  }
}

// ---------------------------------------------------------------- bump layer

function paintBump(ctx, ppu) {
  ctx.fillStyle = '#808080';
  ctx.fillRect(-W / 2, -D / 2, W, D);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.filter = `blur(${Math.max(1, Math.round(ppu * 0.05))}px)`;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    pathOf(ctx, lanePoints(lane, 300));
    ctx.strokeStyle = '#A8A8A8';
    ctx.lineWidth = ROAD_WIDTH + 0.34;
    ctx.stroke();
  }
  for (const c of CROSSINGS) {
    const p = crossingCenter(c.id);
    ctx.beginPath();
    ctx.arc(p.x, p.z, crossingRadius(c.id) + 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#B4B4B4';
    ctx.fill();
  }
  ctx.restore();
  // Grooves between squares.
  ctx.strokeStyle = '#6A6A6A';
  ctx.lineWidth = 0.05;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (let k = 1; k < LANE_LENGTH; k++) {
      if (crossingAt(lane, k)) continue;
      const { pos, tangent } = laneSquare(lane, k);
      const L = squareLength(lane, k);
      const w = ROAD_WIDTH - 0.18;
      ctx.save();
      ctx.translate(pos.x, pos.z);
      ctx.rotate(Math.atan2(tangent.z, tangent.x));
      ctx.beginPath();
      ctx.roundRect(-L / 2, -w / 2, L, w, 0.1);
      ctx.stroke();
      ctx.restore();
    }
  }
  // Fold crease.
  const fold = ctx.createLinearGradient(-0.2, 0, 0.2, 0);
  fold.addColorStop(0, 'rgba(128,128,128,0)');
  fold.addColorStop(0.5, 'rgba(40,40,40,0.9)');
  fold.addColorStop(1, 'rgba(128,128,128,0)');
  ctx.fillStyle = fold;
  ctx.fillRect(-0.2, -D / 2, 0.4, D);
  // Paper tooth.
  const S = 128;
  const { c: tooth, ctx: tctx } = canvas(S);
  const img = tctx.createImageData(S, S);
  const rnd = seeded(9);
  for (let i = 0; i < S * S; i++) {
    const v = 100 + rnd() * 56;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.35;
  const pat = ctx.createPattern(tooth, 'repeat');
  pat.setTransform(new DOMMatrix().scale(1 / ppu));
  ctx.fillStyle = pat;
  ctx.fillRect(-W / 2, -D / 2, W, D);
  ctx.restore();
}

// ---------------------------------------------------------------- public

function worldCanvas(ppu) {
  const { c, ctx } = canvas(Math.round(W * ppu), Math.round(D * ppu));
  ctx.setTransform(ppu, 0, 0, ppu, (W / 2) * ppu, (D / 2) * ppu);
  return { c, ctx };
}

export class PrintedBoard {
  constructor(roster, quality = 'alto') {
    this.ppu = quality === 'bajo' ? 44 : 88;
    const base = worldCanvas(this.ppu);
    paintRegions(base.ctx, this.ppu);
    paintRiver(base.ctx, this.ppu);
    paintCourtPlaza(base.ctx);
    paintLabels(base.ctx, this.ppu);
    paintCartouche(base.ctx, this.ppu);
    this.base = base.c;

    this.out = worldCanvas(this.ppu);
    this.map = new THREE.CanvasTexture(this.out.c);
    this.map.colorSpace = THREE.SRGBColorSpace;
    this.map.anisotropy = 16;
    this.paint(roster);

    const bump = worldCanvas(this.ppu / 2);
    paintBump(bump.ctx, this.ppu / 2);
    this.bump = new THREE.CanvasTexture(bump.c);
    this.bump.anisotropy = 8;
  }

  paint(roster) {
    const { ctx } = this.out;
    const ppu = this.ppu;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.base, 0, 0);
    ctx.restore();
    paintRoads(ctx, ppu, roster);
    paintBridges(ctx);
    paintSquares(ctx, ppu);
    paintCrossings(ctx, ppu, roster);
    paintStarts(ctx, ppu, roster);
    paintMeta(ctx, ppu);
    paintGrain(ctx, ppu);
    paintBorder(ctx);
    this.map.needsUpdate = true;
  }
}

export { COURTHOUSE_POS };
