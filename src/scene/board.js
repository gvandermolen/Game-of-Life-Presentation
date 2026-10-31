import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CROSSINGS, LANE_COUNT } from '../engine/board.js';
import { BOARD, COURTHOUSE_POS, ROAD_WIDTH, crossingCenter, crossingRadius, distanceToRoads, laneFrame } from './layout.js';
import { mergeStatic } from './merge.js';
import { UBA } from './palette.js';
import { PrintedBoard, RIVER, RIVER_WIDTH, isFree, riverDistance } from './printed.js';
import { deckTexture, makeNoise, signTexture, woodTexture } from './textures.js';

const PIECE_Y = 0.02;

function plastic(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    ...extra,
  });
}

function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function buildTable(group, quality) {
  const wood = woodTexture(quality === 'bajo' ? 512 : 1024);
  const mat = new THREE.MeshPhysicalMaterial({ map: wood, bumpMap: wood, bumpScale: 1.2, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(150, 2, 110), mat);
  table.position.y = -1 - BOARD.height;
  table.receiveShadow = true;
  group.add(table);
}

function buildBoardBody(group, printed) {
  const frame = shadowed(
    new THREE.Mesh(
      new RoundedBoxGeometry(BOARD.width + 1.2, BOARD.height, BOARD.depth + 1.2, 4, 0.4),
      new THREE.MeshPhysicalMaterial({ color: UBA.navy, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
    ),
  );
  frame.position.y = -BOARD.height / 2 - 0.02;
  group.add(frame);

  const trim = shadowed(
    new THREE.Mesh(
      new RoundedBoxGeometry(BOARD.width + 0.42, 0.06, BOARD.depth + 0.42, 2, 0.18),
      new THREE.MeshStandardMaterial({ color: UBA.gold, roughness: 0.3, metalness: 0.7 }),
    ),
    false,
  );
  trim.position.y = -0.04;
  group.add(trim);

  const geo = new THREE.PlaneGeometry(BOARD.width, BOARD.depth);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhysicalMaterial({
    map: printed.map,
    bumpMap: printed.bump,
    bumpScale: 2.2,
    roughness: 0.62,
    clearcoat: 0.28,
    clearcoatRoughness: 0.42,
  });
  const top = new THREE.Mesh(geo, mat);
  top.position.y = 0.005;
  top.receiveShadow = true;
  top.userData.dynamic = true;
  group.add(top);
}

// Lumpy glossy plastic mountain, like the green hills of the original board.
function mountainGeometry(radius, height, seed) {
  const geo = new THREE.SphereGeometry(1, 64, 32);
  const n = makeNoise(seed);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const bump = 0.78 + n(v.x * 1.8 + 5, v.z * 1.8 + v.y * 1.3 + 5) * 0.45;
    const y = Math.max(0, v.y);
    p.setXYZ(i, v.x * radius * bump, Math.pow(y, 0.85) * height * (0.85 + bump * 0.2), v.z * radius * bump);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildMountains(group, rnd, spots) {
  const greens = ['#4E9A3E', '#5FAE48', '#3F8A3A'].map((c) => plastic(c, { roughness: 0.3, clearcoat: 0.8 }));
  const snow = plastic('#F5F2EA', { roughness: 0.3 });
  let placed = 0;
  for (let tries = 0; tries < 4000 && placed < 7; tries++) {
    const r = 1.3 + rnd() * 1.0;
    const x = (rnd() - 0.5) * BOARD.width;
    const z = (rnd() - 0.5) * BOARD.depth;
    if (!isFree(x, z, r, { road: 0.45 })) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + r + 0.4)) continue;
    const h = 0.9 + rnd() * 1.1;
    const m = shadowed(new THREE.Mesh(mountainGeometry(r, h, 11 + placed), greens[placed % greens.length]));
    m.position.set(x, 0, z);
    m.rotation.y = rnd() * Math.PI;
    group.add(m);
    if (h > 1.5) {
      const cap = shadowed(new THREE.Mesh(mountainGeometry(r * 0.32, h * 0.25, 40 + placed), snow));
      cap.position.set(x, h * 0.86, z);
      group.add(cap);
    }
    spots.push({ x, z, r });
    placed++;
  }
}

// White plastic buildings, like the 3D pieces of the vintage board.
function house(white, roofMat, w, d, h) {
  const g = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.04), white));
  body.position.y = h / 2;
  g.add(body);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-w / 2 - 0.08, 0);
  roofShape.lineTo(w / 2 + 0.08, 0);
  roofShape.lineTo(0, w * 0.48);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.1, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.1) / 2);
  const roof = shadowed(new THREE.Mesh(roofGeo, roofMat));
  roof.position.y = h;
  g.add(roof);
  return g;
}

function tower(white, glass, w, d, h) {
  const g = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.04), white));
  body.position.y = h / 2;
  g.add(body);
  for (let f = 0; f < Math.floor((h - 0.3) / 0.34); f++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.1, d + 0.01), glass);
    band.position.y = 0.32 + f * 0.34;
    g.add(band);
  }
  return g;
}

function church(white, roofMat) {
  const g = house(white, roofMat, 0.8, 1.3, 0.7);
  const t = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.42, 1.3, 0.42, 2, 0.03), white));
  t.position.set(0, 0.65, 0.75);
  g.add(t);
  const spire = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4), roofMat));
  spire.position.set(0, 1.65, 0.75);
  spire.rotation.y = Math.PI / 4;
  g.add(spire);
  return g;
}

function buildTown(group, rnd, spots) {
  const white = plastic('#F6F3EC', { roughness: 0.3, clearcoat: 0.7 });
  const roofs = [plastic('#C9503A'), plastic('#F6F3EC', { roughness: 0.3 }), plastic(UBA.navy)];
  const glass = new THREE.MeshPhysicalMaterial({ color: '#7FA9C9', roughness: 0.1, metalness: 0.2, clearcoat: 1 });
  let placed = 0;
  for (let tries = 0; tries < 6000 && placed < 22; tries++) {
    const x = (rnd() - 0.5) * BOARD.width;
    const z = (rnd() - 0.5) * BOARD.depth;
    const kind = rnd();
    const r = kind < 0.12 ? 0.9 : 0.6;
    if (!isFree(x, z, r, { road: 0.3 })) continue;
    // Buildings line the roads: keep them close to one.
    if (distanceToRoads(x, z) > ROAD_WIDTH / 2 + 0.3 + r + 1.6) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + r + 0.15)) continue;
    let b;
    if (kind < 0.12) b = church(white, roofs[0]);
    else if (kind < 0.4) b = tower(white, glass, 0.7 + rnd() * 0.3, 0.7 + rnd() * 0.3, 1.2 + rnd() * 1.3);
    else b = house(white, roofs[Math.floor(rnd() * roofs.length)], 0.7 + rnd() * 0.35, 0.7 + rnd() * 0.4, 0.45 + rnd() * 0.25);
    b.position.set(x, 0, z);
    b.rotation.y = Math.round(rnd() * 4) * (Math.PI / 2) + (rnd() - 0.5) * 0.4;
    group.add(b);
    spots.push({ x, z, r });
    placed++;
  }
}

const TREE_GREENS = ['#3F8F4A', '#5BAF3A', '#2F7D4E', '#74B85A'];

function buildTrees(group, rnd, spots, quality) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7A4E32', roughness: 0.8 });
  const leafMats = TREE_GREENS.map((c) => plastic(c, { clearcoat: 0.35, roughness: 0.45 }));
  const count = quality === 'bajo' ? 18 : 30;
  for (let i = 0, tries = 0; i < count && tries < 4000; tries++) {
    const x = (rnd() - 0.5) * BOARD.width;
    const z = (rnd() - 0.5) * BOARD.depth;
    if (!isFree(x, z, 0.4, { road: 0.25, river: 0.15 })) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 0.5)) continue;
    const t = new THREE.Group();
    const h = 0.4 + rnd() * 0.4;
    const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 8), trunkMat));
    trunk.position.y = h / 2;
    t.add(trunk);
    const leaf = leafMats[Math.floor(rnd() * leafMats.length)];
    if (rnd() < 0.55) {
      const crown = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.4 + rnd() * 0.15, 20, 14), leaf));
      crown.position.y = h + 0.28;
      t.add(crown);
    } else {
      for (let j = 0; j < 2; j++) {
        const cone = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.42 - j * 0.11, 0.62, 16), leaf));
        cone.position.y = h + 0.18 + j * 0.34;
        t.add(cone);
      }
    }
    t.position.set(x, 0, z);
    t.scale.setScalar(0.8 + rnd() * 0.35);
    group.add(t);
    spots.push({ x, z, r: 0.4 });
    i++;
  }
}

function buildBridges(group) {
  const rail = plastic('#F4F1EA', { roughness: 0.35 });
  const post = plastic('#E2DCCD', { roughness: 0.4 });
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < 600; i++) {
      const p = laneFrame(lane, i / 599).p;
      const d = riverDistance(p.x, p.z);
      if (d < bestD) {
        bestD = d;
        best = i / 599;
      }
    }
    if (bestD > 0.3) continue;
    const { p, tangent, normal } = laneFrame(lane, best);
    const len = RIVER_WIDTH + 0.9;
    for (const s of [-1, 1]) {
      const c = p.clone().addScaledVector(normal, s * (ROAD_WIDTH / 2 + 0.12));
      const bar = shadowed(new THREE.Mesh(new RoundedBoxGeometry(len, 0.08, 0.1, 1, 0.03), rail));
      bar.position.set(c.x, 0.22, c.z);
      bar.rotation.y = Math.atan2(-tangent.z, tangent.x);
      group.add(bar);
      for (const e of [-0.5, 0, 0.5]) {
        const q = c.clone().addScaledVector(tangent, e * len);
        const pp = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), post));
        pp.position.set(q.x, 0.11, q.z);
        group.add(pp);
      }
    }
  }
}

function buildTrafficLight(group, at, facing) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#23262e', roughness: 0.45 });
  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.5, 10), dark));
  pole.position.y = 0.75;
  g.add(pole);
  const box = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.72, 0.26, 2, 0.06), dark));
  box.position.y = 1.65;
  g.add(box);
  ['#ff3b2f', '#ffb300', '#2fd25a'].forEach((c, i) => {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 14, 10),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i === 0 ? 1.8 : 0.2 }),
    );
    lamp.position.set(0, 1.88 - i * 0.22, 0.13);
    g.add(lamp);
  });
  g.position.copy(at);
  g.rotation.y = facing;
  group.add(g);
}

function buildCrossingProps(group, spots) {
  for (const c of CROSSINGS) {
    const center = crossingCenter(c.id);
    const R = crossingRadius(c.id) + 0.55;
    // Best two free angles around the plaza.
    const cands = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const x = center.x + Math.cos(a) * R;
      const z = center.z + Math.sin(a) * R;
      cands.push({ a, x, z, d: distanceToRoads(x, z) });
    }
    cands.sort((p, q) => q.d - p.d);
    const chosen = [];
    for (const p of cands) {
      if (p.d < ROAD_WIDTH / 2 + 0.25) break;
      if (chosen.some((q) => Math.abs(Math.atan2(Math.sin(p.a - q.a), Math.cos(p.a - q.a))) < 1.6)) continue;
      chosen.push(p);
      if (chosen.length === 2) break;
    }
    for (const p of chosen) {
      buildTrafficLight(group, new THREE.Vector3(p.x, 0, p.z), Math.atan2(center.x - p.x, center.z - p.z));
      spots.push({ x: p.x, z: p.z, r: 0.3 });
    }
  }
}

function buildCourthouse(group) {
  const g = new THREE.Group();
  const stone = plastic('#F3EEE3', { roughness: 0.4, clearcoat: 0.45 });
  const stoneDark = plastic('#DCD3C0', { roughness: 0.5, clearcoat: 0.3 });
  const gold = new THREE.MeshStandardMaterial({ color: UBA.gold, roughness: 0.28, metalness: 0.75 });

  for (let i = 0; i < 3; i++) {
    const step = shadowed(new THREE.Mesh(new RoundedBoxGeometry(4.2 - i * 0.35, 0.18, 6.6 - i * 0.3, 2, 0.04), stoneDark));
    step.position.set(0.25 + i * 0.18, 0.09 + i * 0.18, 0);
    g.add(step);
  }
  const hall = shadowed(new THREE.Mesh(new RoundedBoxGeometry(2.6, 2.4, 5.6, 2, 0.06), stone));
  hall.position.set(1.4, 0.54 + 1.2, 0);
  g.add(hall);
  for (let i = 0; i < 6; i++) {
    const col = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 2.1, 20), stone));
    col.position.set(-0.05, 0.54 + 1.05, -2.3 + i * 0.92);
    g.add(col);
  }
  const lintel = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.34, 5.9, 2, 0.04), stone));
  lintel.position.set(0.05, 2.82, 0);
  g.add(lintel);

  const tri = new THREE.Shape();
  tri.moveTo(-3.0, 0);
  tri.lineTo(3.0, 0);
  tri.lineTo(0, 1.0);
  tri.closePath();
  const ped = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.7, bevelEnabled: false }), stone));
  ped.rotation.y = Math.PI / 2;
  ped.position.set(-0.3, 2.99, 0);
  g.add(ped);

  const drum = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.9, 32), stone));
  drum.position.set(1.6, 3.4, 0);
  g.add(drum);
  const dome = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.82, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), gold));
  dome.position.set(1.6, 3.85, 0);
  g.add(dome);

  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.34), new THREE.MeshStandardMaterial({ map: signTexture('PALACIO DE JUSTICIA', { size: 46, h: 96, w: 768 }) }));
  plaque.position.set(-0.46, 2.82, 0);
  plaque.rotation.y = -Math.PI / 2;
  g.add(plaque);

  buildFlag(g, new THREE.Vector3(1.6, 4.6, 0));

  g.scale.setScalar(0.62);
  g.position.copy(COURTHOUSE_POS);
  g.rotation.y = Math.PI / 2;
  group.add(g);
}

function buildFlag(group, at) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), new THREE.MeshStandardMaterial({ color: '#ddd', metalness: 0.6, roughness: 0.3 }));
  pole.position.copy(at).add(new THREE.Vector3(0, 0.8, 0));
  pole.castShadow = true;
  group.add(pole);
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 120;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#74ACDF';
  ctx.fillRect(0, 0, 192, 120);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 40, 192, 40);
  ctx.fillStyle = '#F6B40E';
  ctx.beginPath();
  ctx.arc(96, 60, 11, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56, 12, 1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.copy(at).add(new THREE.Vector3(0, 1.32, 0.47));
  flag.rotation.y = Math.PI / 2;
  flag.castShadow = true;
  group.add(flag);
}

function buildObelisco(group, spots, rnd) {
  for (let tries = 0; tries < 3000; tries++) {
    const x = (rnd() - 0.5) * BOARD.width;
    const z = (rnd() - 0.5) * BOARD.depth * 0.6;
    if (!isFree(x, z, 1.2, { road: 0.4 })) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 1.4)) continue;
    const g = new THREE.Group();
    const white = plastic('#F6F3EC', { roughness: 0.3 });
    const plaza = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.12, 0.1, 40), plastic('#E3D8C0', { roughness: 0.6, clearcoat: 0.2 })));
    plaza.position.y = 0.05;
    g.add(plaza);
    const shaft = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 3.9, 4, 1), white));
    shaft.rotation.y = Math.PI / 4;
    shaft.position.y = 0.1 + 1.95;
    g.add(shaft);
    const tip = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.38, 4), white));
    tip.rotation.y = Math.PI / 4;
    tip.position.y = 0.1 + 3.9 + 0.19;
    g.add(tip);
    g.position.set(x, 0, z);
    group.add(g);
    spots.push({ x, z, r: 1.2 });
    return;
  }
}

function buildDecks(group) {
  const decks = [
    { word: 'Preguntas', color: UBA.sky },
    { word: 'Dilemas', color: UBA.teal },
    { word: 'Apelaciones', color: UBA.gold },
    { word: 'Accidentes', color: UBA.coral },
  ];
  const cardMat = new THREE.MeshStandardMaterial({ color: '#f5efe2', roughness: 0.7 });
  decks.forEach((d, i) => {
    const g = new THREE.Group();
    const n = 9;
    for (let j = 0; j < n; j++) {
      const card = shadowed(new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.05, 1.85, 1, 0.02), cardMat));
      card.position.y = 0.03 + j * 0.055;
      card.rotation.y = Math.sin(i * 7 + j * 3) * 0.04;
      g.add(card);
    }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(2.58, 1.83), new THREE.MeshStandardMaterial({ map: deckTexture(d.word, d.color), roughness: 0.5 }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.03 + n * 0.055 + 0.001;
    g.add(top);
    g.position.set(BOARD.width / 2 + 3.4, -BOARD.height, -9 + i * 4.6);
    g.rotation.y = -0.08 + i * 0.05;
    group.add(g);
  });
}

export function buildBoard(roster, quality) {
  const group = new THREE.Group();
  const printed = new PrintedBoard(roster, quality);
  buildTable(group, quality);
  buildBoardBody(group, printed);
  buildCourthouse(group);
  buildBridges(group);
  const spots = [];
  const rnd = seeded(11);
  buildCrossingProps(group, spots);
  buildMountains(group, rnd, spots);
  buildObelisco(group, spots, rnd);
  buildTown(group, rnd, spots);
  buildTrees(group, rnd, spots, quality);
  buildDecks(group);
  mergeStatic(group);
  return { group, printed };
}

export { PIECE_Y, RIVER };
