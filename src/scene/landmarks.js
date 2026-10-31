import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { UBA } from './palette.js';
import { isFree } from './space.js';
import { textAt, textWidth } from './text3d.js';

// One landmark per neighbourhood, placed roughly where the barrio sits on a real
// map of Buenos Aires: north (Núñez, Palermo, Recoleta, Retiro) towards the
// courthouse, the Riachuelo and La Boca along the front edge, Puerto Madero east.

const INK = '#4A3420';

function plastic(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.25, ...extra });
}

const M = {};
function mats() {
  if (M.white) return M;
  Object.assign(M, {
    white: plastic('#F6F3EC', { roughness: 0.3 }),
    stone: plastic('#E9E1CF', { roughness: 0.45 }),
    plaza: plastic('#E3D8C0', { roughness: 0.6, clearcoat: 0.2 }),
    pink: plastic('#E9A39A'),
    pinkDark: plastic('#D5867D'),
    copper: plastic('#5FA58C', { roughness: 0.3 }),
    blue: plastic('#1F4FA0'),
    yellow: plastic('#F6C324'),
    red: plastic('#D8352A'),
    brick: plastic('#B65A3A', { roughness: 0.5 }),
    steel: new THREE.MeshPhysicalMaterial({ color: '#C9CED6', roughness: 0.18, metalness: 0.85, clearcoat: 0.5 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#3C86BF', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
    grass: plastic('#5FAE48', { roughness: 0.4 }),
    dark: plastic('#2B2F38', { roughness: 0.4 }),
    tin: new THREE.MeshStandardMaterial({ color: '#8C929B', roughness: 0.45, metalness: 0.6 }),
    navy: plastic(UBA.navy),
  });
  // Stadium bowls are open surfaces seen from both sides.
  const stands = new Map();
  M.stands = (base) => {
    if (!stands.has(base)) stands.set(base, Object.assign(base.clone(), { side: THREE.DoubleSide }));
    return stands.get(base);
  };
  return M;
}

function add(g, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const box = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));

function plinth(g, r, mat = M.plaza) {
  add(g, new THREE.CylinderGeometry(r, r + 0.05, 0.08, 48), mat, 0, 0.04, 0);
}

// ---------------------------------------------------------------- models

function obelisco() {
  const g = new THREE.Group();
  plinth(g, 0.95);
  add(g, box(0.92, 0.05, 0.92, 0.015), M.stone, 0, 0.105, 0);
  add(g, box(0.72, 0.14, 0.72), M.stone, 0, 0.15, 0);
  const shaft = add(g, new THREE.CylinderGeometry(0.15, 0.27, 3.3, 4, 1), M.white, 0, 0.22 + 1.65, 0);
  shaft.rotation.y = Math.PI / 4;
  const tip = add(g, new THREE.ConeGeometry(0.21, 0.34, 4), M.white, 0, 0.22 + 3.3 + 0.17, 0);
  tip.rotation.y = Math.PI / 4;
  // The small window near the top, on every face.
  const half = (0.15 + (0.27 - 0.15) * (0.3 / 3.3)) * Math.SQRT1_2;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    add(g, box(0.06, 0.09, 0.012, 0.004), M.dark, Math.sin(a) * half, 0.22 + 3.0, Math.cos(a) * half).rotation.y = a;
  }
  return { g, r: 1.0 };
}

function casaRosada() {
  const g = new THREE.Group();
  add(g, box(2.6, 0.08, 1.3), M.plaza, 0, 0.04, 0);
  add(g, box(2.3, 0.7, 0.85), M.pink, 0, 0.43, 0);
  add(g, box(2.36, 0.08, 0.9), M.pinkDark, 0, 0.82, 0);
  add(g, box(0.62, 1.0, 0.95), M.pink, 0, 0.58, 0.02);
  const arch = add(g, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 24, 1, false, 0, Math.PI), M.dark, 0, 0.42, 0.5);
  arch.rotation.x = Math.PI / 2;
  arch.rotation.z = Math.PI / 2;
  add(g, box(0.34, 0.26, 0.02, 0.005), M.dark, 0, 0.28, 0.5);
  // Arched windows: a square with a half disc on top.
  const archTop = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16, 1, false, 0, Math.PI);
  archTop.rotateX(Math.PI / 2);
  archTop.rotateZ(Math.PI / 2);
  for (const x of [-0.78, -0.6, -0.42, 0.42, 0.6, 0.78]) {
    for (const y of [0.3, 0.58]) {
      add(g, box(0.14, 0.13, 0.02, 0.005), M.white, x, y, 0.435);
      add(g, archTop, M.white, x, y + 0.065, 0.435);
    }
  }
  // Corner pavilions and the balustrade along the roof.
  for (const s of [-1, 1]) add(g, box(0.3, 0.86, 0.92), M.pink, s * 1.06, 0.5, 0.01);
  for (let i = 0; i < 17; i++) add(g, box(0.03, 0.07, 0.03, 0.008), M.pinkDark, -1.0 + i * 0.125, 0.9, 0.42);
  add(g, box(2.1, 0.025, 0.04, 0.008), M.pinkDark, 0, 0.94, 0.42);
  flag(g, 0, 1.08, 0);
  return { g, r: 1.35 };
}

function congreso() {
  const g = new THREE.Group();
  add(g, box(2.5, 0.08, 1.6), M.plaza, 0, 0.04, 0);
  add(g, box(2.2, 0.6, 1.0), M.stone, 0, 0.38, -0.05);
  add(g, box(0.9, 0.85, 1.25), M.stone, 0, 0.5, 0.05);
  for (let i = 0; i < 6; i++) add(g, new THREE.CylinderGeometry(0.045, 0.05, 0.62, 12), M.white, -0.36 + i * 0.144, 0.43, 0.74);
  const ped = new THREE.Shape();
  ped.moveTo(-0.48, 0);
  ped.lineTo(0.48, 0);
  ped.lineTo(0, 0.24);
  ped.closePath();
  add(g, new THREE.ExtrudeGeometry(ped, { depth: 0.16, bevelEnabled: false }), M.white, 0, 0.75, 0.62);
  add(g, new THREE.CylinderGeometry(0.36, 0.38, 0.4, 32), M.stone, 0, 1.12, 0);
  add(g, new THREE.SphereGeometry(0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.copper, 0, 1.32, 0);
  for (let i = 0; i < 4; i++) {
    add(g, new THREE.TorusGeometry(0.365, 0.014, 6, 28, Math.PI), M.stone, 0, 1.32, 0).rotation.y = (i * Math.PI) / 4;
  }
  for (let i = 0; i < 3; i++) add(g, box(1.1 - i * 0.08, 0.05, 0.12, 0.012), M.stone, 0, 0.105 + i * 0.05, 0.84 - i * 0.07);
  add(g, new THREE.CylinderGeometry(0.06, 0.08, 0.22, 12), M.copper, 0, 1.78, 0);
  add(g, new THREE.SphereGeometry(0.06, 12, 8), M.copper, 0, 1.92, 0);
  return { g, r: 1.4 };
}

function laBoca() {
  const g = new THREE.Group();
  // La Bombonera: steep bowl closed by its famous flat stand.
  const prof = [
    new THREE.Vector2(0.55, 0.06),
    new THREE.Vector2(0.62, 0.06),
    new THREE.Vector2(0.98, 0.62),
    new THREE.Vector2(1.04, 0.62),
    new THREE.Vector2(1.04, 0.0),
  ];
  add(g, new THREE.LatheGeometry(prof, 48, Math.PI * 0.12, Math.PI * 1.76), M.stands(M.blue), -0.4, 0, 0);
  const pitch = new THREE.CircleGeometry(0.6, 40);
  pitch.rotateX(-Math.PI / 2);
  add(g, pitch, M.grass, -0.4, 0.065, 0);
  const band = add(g, new THREE.TorusGeometry(1.02, 0.04, 8, 48, Math.PI * 1.76), M.yellow, -0.4, 0.48, 0);
  band.rotation.x = Math.PI / 2;
  band.rotation.z = -Math.PI * 1.38;
  add(g, box(0.85, 0.9, 0.16), M.yellow, -0.4, 0.45, 0.9);
  // Caminito: corrugated houses in bright paint.
  const colors = ['#E2412F', '#F6C324', '#2D8FD5', '#3BB273', '#F28C28'];
  colors.forEach((c, i) => {
    const h = 0.42 + (i % 2) * 0.16;
    const x = 1.0 + (i % 3) * 0.38;
    const z = -0.55 + Math.floor(i / 3) * 0.75;
    add(g, box(0.34, h, 0.42, 0.02), plastic(c), x, h / 2, z);
    add(g, box(0.4, 0.03, 0.5, 0.01), M.tin, x, h + 0.04, z).rotation.x = 0.22;
  });
  return { g, r: 1.65 };
}

function puenteDeLaMujer() {
  const g = new THREE.Group();
  const dock = new THREE.PlaneGeometry(1.1, 3.4);
  dock.rotateX(-Math.PI / 2);
  add(g, box(1.4, 0.03, 3.7, 0.01), M.stone, 0, 0.005, 0);
  add(g, dock, M.water, 0, 0.026, 0);
  add(g, box(1.5, 0.08, 0.36, 0.02), M.white, 0, 0.18, 0.2);
  const mastLen = 1.7;
  const mast = add(g, new THREE.CylinderGeometry(0.035, 0.07, mastLen, 12), M.white, 0, 0, 0);
  const lean = 0.75;
  mast.rotation.z = lean;
  const base = new THREE.Vector3(0.45, 0.2, 0.2);
  const top = base.clone().add(new THREE.Vector3(-Math.sin(lean) * mastLen, Math.cos(lean) * mastLen, 0));
  mast.position.copy(base.clone().add(top).multiplyScalar(0.5));
  for (let i = 0; i < 5; i++) {
    const a = new THREE.Vector3(0.3 - i * 0.22, 0.22, 0.2);
    const b = base.clone().lerp(top, 0.45 + i * 0.12);
    const len = a.distanceTo(b);
    const cable = add(g, new THREE.CylinderGeometry(0.008, 0.008, len, 4), M.white);
    cable.position.copy(a.clone().add(b).multiplyScalar(0.5));
    cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
  return { g, r: 1.4 };
}

function floralis() {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(1.0, 1.05, 0.06, 48), M.stone, 0, 0.03, 0);
  const pool = new THREE.CircleGeometry(0.88, 48);
  pool.rotateX(-Math.PI / 2);
  add(g, pool, M.water, 0, 0.065, 0);
  add(g, new THREE.CylinderGeometry(0.035, 0.05, 0.7, 12), M.steel, 0, 0.4, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), M.steel);
    petal.scale.set(0.12, 0.03, 0.5);
    const pivot = new THREE.Group();
    pivot.position.y = 0.76;
    pivot.rotation.y = a;
    petal.position.set(0, 0.28, 0.32);
    petal.rotation.x = -0.9;
    petal.castShadow = true;
    pivot.add(petal);
    g.add(pivot);
  }
  add(g, new THREE.SphereGeometry(0.09, 16, 12), M.steel, 0, 0.78, 0);
  return { g, r: 1.05 };
}

function planetario() {
  const g = new THREE.Group();
  plinth(g, 0.95, M.stone);
  add(g, new THREE.CylinderGeometry(0.7, 0.7, 0.1, 48), M.white, 0, 0.13, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = add(g, new THREE.CylinderGeometry(0.035, 0.05, 0.7, 10), M.white, Math.cos(a) * 0.38, 0.45, Math.sin(a) * 0.38);
    leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
  }
  add(g, new THREE.SphereGeometry(0.55, 40, 24), M.steel, 0, 1.15, 0);
  add(g, new THREE.CylinderGeometry(0.556, 0.556, 0.07, 48, 1, true), M.dark, 0, 1.2, 0);
  const ring = add(g, new THREE.TorusGeometry(0.58, 0.04, 10, 48), M.white, 0, 0.98, 0);
  ring.rotation.x = Math.PI / 2;
  return { g, r: 1.0 };
}

function torreMonumental() {
  const g = new THREE.Group();
  plinth(g, 0.85);
  add(g, box(0.75, 0.3, 0.75), M.white, 0, 0.23, 0);
  add(g, box(0.56, 1.9, 0.56), M.brick, 0, 0.38 + 0.95, 0);
  add(g, box(0.64, 0.1, 0.64), M.white, 0, 1.0, 0);
  add(g, box(0.62, 0.5, 0.62), M.white, 0, 2.5, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const disc = new THREE.CylinderGeometry(0.17, 0.17, 0.02, 24);
    disc.rotateX(Math.PI / 2);
    add(g, disc, M.white, Math.sin(a) * 0.3, 2.05, Math.cos(a) * 0.3).rotation.y = a;
    const hand = (len, angle) => {
      const h = add(g, box(0.012, len, 0.008, 0.003), M.dark, Math.sin(a) * 0.312, 2.05, Math.cos(a) * 0.312);
      h.rotation.set(0, a, angle);
      h.translateY(len / 2);
    };
    hand(0.12, -0.5);
    hand(0.09, 1.9);
  }
  // White stone quoins on the brick corners.
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) add(g, box(0.07, 1.86, 0.07, 0.01), M.white, x * 0.27, 1.33, z * 0.27);
  add(g, new THREE.SphereGeometry(0.22, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.copper, 0, 2.75, 0);
  add(g, new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), M.dark, 0, 3.05, 0);
  return { g, r: 0.9 };
}

function monumental() {
  const g = new THREE.Group();
  const prof = [
    new THREE.Vector2(0.6, 0.06),
    new THREE.Vector2(0.66, 0.06),
    new THREE.Vector2(1.0, 0.42),
    new THREE.Vector2(1.05, 0.42),
    new THREE.Vector2(1.05, 0.0),
  ];
  const bowl = add(g, new THREE.LatheGeometry(prof, 56), M.stands(M.white));
  bowl.scale.set(1.3, 1, 1);
  const pitch = new THREE.CircleGeometry(0.62, 40);
  pitch.rotateX(-Math.PI / 2);
  add(g, pitch, M.grass, 0, 0.065, 0).scale.set(1.3, 1, 1);
  const band = add(g, new THREE.TorusGeometry(1.03, 0.035, 8, 64), M.red, 0, 0.34, 0);
  band.rotation.x = Math.PI / 2;
  band.scale.set(1.3, 1, 1);
  // Floodlight masts at the four corners.
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    add(g, new THREE.CylinderGeometry(0.02, 0.03, 0.9, 8), M.dark, x * 1.15, 0.45, z * 0.72);
    add(g, box(0.16, 0.1, 0.04, 0.01), M.white, x * 1.15, 0.92, z * 0.72).rotation.y = Math.atan2(-x, -z);
  }
  return { g, r: 1.45 };
}

function flag(group, x, y, z) {
  add(group, new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), M.white, x, y + 0.25, z);
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 60;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#74ACDF';
  ctx.fillRect(0, 0, 96, 60);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 20, 96, 20);
  ctx.fillStyle = '#F6B40E';
  ctx.beginPath();
  ctx.arc(48, 30, 6, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  f.position.set(x + 0.17, y + 0.4, z);
  f.castShadow = true;
  group.add(f);
}

// ---------------------------------------------------------------- placement

export const LANDMARKS = [
  { barrio: 'San Nicolás', name: 'Obelisco', at: [6.5, 3], build: obelisco },
  { barrio: 'Monserrat', name: 'Casa Rosada', at: [13.5, 2.5], build: casaRosada },
  { barrio: 'Balvanera', name: 'Congreso', at: [-6.5, 3.5], build: congreso },
  { barrio: 'La Boca', name: 'La Bombonera y Caminito', at: [13, 8.6], build: laBoca },
  { barrio: 'Puerto Madero', name: 'Puente de la Mujer', at: [21, 3], build: puenteDeLaMujer },
  { barrio: 'Recoleta', name: 'Floralis Genérica', at: [7, -9.5], build: floralis },
  { barrio: 'Palermo', name: 'Planetario', at: [-9, -9.5], build: planetario },
  { barrio: 'Retiro', name: 'Torre Monumental', at: [17, -9.5], build: torreMonumental },
  { barrio: 'Núñez', name: 'Estadio Monumental', at: [-19.5, -10.5], build: monumental },
];

const clashes = (spots, x, z, r) => spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + r + 0.2);

function nearestFree(x0, z0, r, spots, opts) {
  if (isFree(x0, z0, r, opts) && !clashes(spots, x0, z0, r)) return [x0, z0];
  for (let ring = 1; ring <= 40; ring++) {
    const d = ring * 0.25;
    const n = 8 + ring * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = x0 + Math.cos(a) * d;
      const z = z0 + Math.sin(a) * d;
      if (isFree(x, z, r, opts) && !clashes(spots, x, z, r)) return [x, z];
    }
  }
  return null;
}

// Two-line label (barrio, landmark) beside the model, wherever it fits.
function labelSpot(x, z, r, w, spots) {
  const fits = (cx, cz) => {
    for (let t = -0.5; t <= 0.5; t += 0.25) {
      const px = cx + t * w;
      if (!isFree(px, cz, 0.3, { road: 0.05, river: 0.05 }) || clashes(spots, px, cz, 0.3)) return false;
    }
    return true;
  };
  const cands = [
    [x, z + r + 0.5],
    [x, z - r - 0.5],
    [x + r + w / 2 + 0.2, z],
    [x - r - w / 2 - 0.2, z],
    [x, z + r + 1.1],
    [x, z - r - 1.1],
  ];
  return cands.find(([cx, cz]) => fits(cx, cz)) || cands[0];
}

export function buildLandmarks(group, spots) {
  mats();
  for (const L of LANDMARKS) {
    const { g, r } = L.build();
    const at = nearestFree(L.at[0], L.at[1], r, spots, { road: 0.25, river: 0.3 });
    if (!at) continue;
    const [x, z] = at;
    g.position.set(x, 0, z);
    group.add(g);
    spots.push({ x, z, r });

    const barrio = L.barrio.toUpperCase();
    const w = Math.max(textWidth(barrio, 0.4, 700, true, 0.05), textWidth(L.name, 0.24, 400, true));
    const [lx, lz] = labelSpot(x, z, r, w, spots);
    group.add(textAt(barrio, lx, lz - 0.14, { size: 0.4, weight: 700, italic: true, color: INK, spacing: 0.05, y: 0.012 }));
    group.add(textAt(L.name, lx, lz + 0.22, { size: 0.24, weight: 400, italic: true, color: INK, y: 0.012 }));
    spots.push({ x: lx, z: lz, r: w / 2 });
  }
}
