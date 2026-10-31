import * as THREE from 'three';
import { canvas } from './textures.js';

// Crisp board lettering: a Bitter glyph atlas, one quad per character, laid out
// along any polyline so text can follow roads and rivers.

const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑÜabcdefghijklmnopqrstuvwxyzáéíóúñü0123456789·.,:;-–?¿!¡§$+|/()'\"&%";
const CELL = 128;
const PX = 92;
const COLS = 16;
const FONT = 'Bitter, Georgia, serif';

const atlases = new Map();

function atlas(weight, italic) {
  const key = `${weight}${italic ? 'i' : ''}`;
  if (atlases.has(key)) return atlases.get(key);
  const rows = Math.ceil(CHARS.length / COLS);
  const { c, ctx } = canvas(COLS * CELL, rows * CELL);
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${PX}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  const glyphs = new Map();
  [...CHARS].forEach((ch, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    ctx.fillText(ch, col * CELL + CELL / 2, row * CELL + CELL / 2 + 4);
    glyphs.set(ch, {
      u0: col / COLS,
      u1: (col + 1) / COLS,
      v0: 1 - (row + 1) / rows,
      v1: 1 - row / rows,
      adv: ctx.measureText(ch).width / PX,
    });
  });
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const a = { texture, glyphs };
  atlases.set(key, a);
  return a;
}

const materials = new Map();

function textMaterial(weight, italic, color) {
  const key = `${weight}${italic}${color}`;
  if (!materials.has(key)) {
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        map: atlas(weight, italic).texture,
        color,
        transparent: true,
        depthWrite: false,
        roughness: 0.55,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
    );
  }
  return materials.get(key);
}

// Polyline helper: point and unit tangent at arc length s.
function polyline(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  const total = cum[cum.length - 1];
  const at = (s) => {
    const t = Math.min(total, Math.max(0, s));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < t) i++;
    const a = points[i - 1];
    const b = points[i];
    const f = (t - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    const len = Math.max(1e-6, cum[i] - cum[i - 1]);
    return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, tx: (b.x - a.x) / len, tz: (b.z - a.z) / len };
  };
  return { total, at };
}

/**
 * Text laid along `path` (array of {x, z}), centred at arc length `at`
 * (default: middle of the path). Reads left-to-right for a viewer at +z.
 */
export function textMesh(str, { path, at, size = 0.4, weight = 700, italic = false, color = '#1D2554', y = 0.05, spacing = 0 }) {
  let pts = path;
  if (pts[pts.length - 1].x < pts[0].x) pts = [...pts].reverse();
  const line = polyline(pts);
  const { glyphs } = atlas(weight, italic);
  const chars = [...str].filter((ch) => glyphs.has(ch));
  const advs = chars.map((ch) => glyphs.get(ch).adv * size + spacing);
  const width = advs.reduce((a, b) => a + b, 0) - spacing;
  const centre = at ?? line.total / 2;
  let s = centre - width / 2;
  const half = ((CELL / PX) * size) / 2;
  const pos = [];
  const uv = [];
  const idx = [];
  chars.forEach((ch, i) => {
    const g = glyphs.get(ch);
    const p = line.at(s + advs[i] / 2);
    s += advs[i];
    if (ch === ' ') return;
    const ux = p.tz;
    const uz = -p.tx;
    const corners = [
      [-1, -1, g.u0, g.v0],
      [1, -1, g.u1, g.v0],
      [-1, 1, g.u0, g.v1],
      [1, 1, g.u1, g.v1],
    ];
    const base = pos.length / 3;
    for (const [a, b, u, v] of corners) {
      pos.push(p.x + p.tx * a * half + ux * b * half, y, p.z + p.tz * a * half + uz * b * half);
      uv.push(u, v);
    }
    idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setIndex(idx);
  fixWinding(geo);
  const mesh = new THREE.Mesh(geo, textMaterial(weight, italic, color));
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  return mesh;
}

// Straight text centred at (x, z). `rot` turns the baseline toward +z (radians).
export function textAt(str, x, z, opts = {}) {
  const rot = opts.rot || 0;
  const dx = Math.cos(rot) * 50;
  const dz = Math.sin(rot) * 50;
  return textMesh(str, { ...opts, path: [{ x: x - dx, z: z - dz }, { x: x + dx, z: z + dz }] });
}

// Make every triangle face up (+y) regardless of the path direction.
export function fixWinding(geo) {
  const p = geo.attributes.position;
  const idx = geo.index.array;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    a.fromBufferAttribute(p, idx[i]);
    b.fromBufferAttribute(p, idx[i + 1]);
    c.fromBufferAttribute(p, idx[i + 2]);
    const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
    if (ny < 0) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  }
}

export function textWidth(str, size, weight = 700, italic = false, spacing = 0) {
  const { glyphs } = atlas(weight, italic);
  return [...str].reduce((w, ch) => w + (glyphs.get(ch)?.adv || 0) * size + spacing, 0);
}
