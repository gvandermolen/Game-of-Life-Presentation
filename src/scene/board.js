import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LANES, LANE_COUNT, LANE_LENGTH, CRUCES } from '../engine/board.js';
import {
  BOARD,
  BAND_LENGTH,
  LANE_SPACING,
  ROAD_HALF,
  SPINNER_POS,
  STATIONS,
  bandFrame,
  curve,
  distanceToRoad,
  frameAt,
  isBandIndex,
  laneOffset,
  laneSquare,
  tileSize,
} from './layout.js';
import { mergeStatic } from './merge.js';
import { SQUARE_STYLE, UBA } from './palette.js';
import { bandTexture, deckTexture, feltTexture, signTexture, tileLabel, woodTexture } from './textures.js';

const TILE_H = 0.2;
const ROAD_Y = 0.04;

function plastic(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.36,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
    ...extra,
  });
}

function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

// Choose the decal rotation (multiples of `step`) whose "up" points most toward the camera's up (-z).
function readableYaw(heading, step) {
  const base = heading - Math.PI / 2;
  let best = base;
  let bestAbs = Infinity;
  for (let m = -4; m <= 4; m++) {
    const yaw = base + m * step;
    const w = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    if (Math.abs(w) < bestAbs) {
      bestAbs = Math.abs(w);
      best = w;
    }
  }
  return best;
}

function decal(texture, w, h, y) {
  const g = new THREE.PlaneGeometry(w, h);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

// Flat ribbon that follows the centreline at a lateral offset.
function ribbon(u0, u1, offset, halfWidth, y, material, samples = 220) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= samples; i++) {
    const u = u0 + ((u1 - u0) * i) / samples;
    const { p, normal } = frameAt(Math.min(1, Math.max(0, u)));
    const c = p.clone().addScaledVector(normal, offset);
    const l = c.clone().addScaledVector(normal, -halfWidth);
    const r = c.clone().addScaledVector(normal, halfWidth);
    pos.push(l.x, y, l.z, r.x, y, r.z);
    if (i < samples) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  return mesh;
}

function mix(hex, toward = '#ffffff', amount = 0.55) {
  return new THREE.Color(hex).lerp(new THREE.Color(toward), amount);
}

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function buildTable(group, quality) {
  const wood = woodTexture(quality === 'bajo' ? 512 : 1024);
  const mat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62, metalness: 0 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(150, 2, 110), mat);
  table.position.y = -1 - BOARD.height;
  table.receiveShadow = true;
  group.add(table);
}

function buildBoardBody(group) {
  const frame = shadowed(
    new THREE.Mesh(
      new RoundedBoxGeometry(BOARD.width + 1.4, BOARD.height, BOARD.depth + 1.4, 4, 0.45),
      new THREE.MeshPhysicalMaterial({ color: UBA.navy, roughness: 0.42, clearcoat: 0.4 }),
    ),
  );
  frame.position.y = -BOARD.height / 2 - 0.02;
  group.add(frame);

  const trim = shadowed(
    new THREE.Mesh(
      new RoundedBoxGeometry(BOARD.width + 0.5, 0.06, BOARD.depth + 0.5, 2, 0.2),
      new THREE.MeshStandardMaterial({ color: UBA.gold, roughness: 0.3, metalness: 0.65 }),
    ),
    false,
  );
  trim.position.y = -0.03;
  group.add(trim);

  const felt = new THREE.MeshStandardMaterial({ map: feltTexture(512, [118, 172, 92]), roughness: 0.92 });
  const top = new THREE.Mesh(new RoundedBoxGeometry(BOARD.width, 0.1, BOARD.depth, 2, 0.04), felt);
  top.position.y = -0.04;
  top.receiveShadow = true;
  group.add(top);
}

function buildRoad(group) {
  const u0 = STATIONS[0] - 0.008;
  const u1 = STATIONS[LANE_LENGTH] + 0.008;
  const edge = new THREE.MeshStandardMaterial({ color: '#E9DCC0', roughness: 0.8 });
  group.add(ribbon(u0, u1, 0, ROAD_HALF + 0.35, 0.012, edge, 400));
  const bed = new THREE.MeshStandardMaterial({ color: '#4A4F5C', roughness: 0.85 });
  group.add(ribbon(u0, u1, 0, ROAD_HALF, 0.022, bed, 400));
}

function buildLaneRibbons(group, roster) {
  const pad = 0.018;
  const breaks = [0, ...CRUCES, LANE_LENGTH].map((k) => STATIONS[k]);
  const mats = [];
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    mats.push(mat);
    for (let i = 0; i < breaks.length - 1; i++) {
      group.add(ribbon(breaks[i] + pad, breaks[i + 1] - pad, laneOffset(lane), LANE_SPACING * 0.47, ROAD_Y, mat, 80));
    }
  }
  recolorLanes(mats, roster);
  return mats;
}

export function recolorLanes(mats, roster) {
  mats.forEach((mat, lane) => {
    const team = roster.find((t) => t.lane === lane && t.enabled);
    mat.color.copy(team ? mix(team.color, '#ffffff', 0.35) : new THREE.Color('#9a9488'));
  });
}

function buildTiles(group) {
  const mats = {};
  const labels = {};
  for (const type of Object.keys(SQUARE_STYLE)) {
    mats[type] = plastic(SQUARE_STYLE[type].color);
    labels[type] = tileLabel(type);
  }
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (let k = 1; k < LANE_LENGTH; k++) {
      if (isBandIndex(k)) continue;
      const type = LANES[lane][k];
      const { pos, heading } = laneSquare(lane, k);
      const { width, length } = tileSize(lane, k);
      const tile = shadowed(new THREE.Mesh(new RoundedBoxGeometry(length, TILE_H, width, 2, 0.07), mats[type]));
      tile.position.set(pos.x, ROAD_Y + TILE_H / 2, pos.z);
      tile.rotation.y = heading;
      group.add(tile);

      const size = Math.min(width, length) * 0.94;
      const d = decal(labels[type], size, size, ROAD_Y + TILE_H + 0.004);
      d.position.x = pos.x;
      d.position.z = pos.z;
      d.rotation.y = readableYaw(heading, Math.PI / 2);
      group.add(d);
    }
  }
}

function buildBands(group) {
  const across = ROAD_HALF * 2 + 0.3;
  const list = [
    { k: 0, type: 'salida' },
    ...CRUCES.map((k, i) => ({ k, type: 'cruce', n: i + 1 })),
    { k: LANE_LENGTH, type: 'meta' },
  ];
  for (const { k, type, n } of list) {
    const { pos, heading } = bandFrame(k);
    const color = SQUARE_STYLE[type].color;
    const mat = type === 'meta' ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, metalness: 0.55, clearcoat: 0.6 }) : plastic(color);
    const band = shadowed(new THREE.Mesh(new RoundedBoxGeometry(BAND_LENGTH, TILE_H + 0.04, across, 3, 0.12), mat));
    band.position.set(pos.x, ROAD_Y + (TILE_H + 0.04) / 2, pos.z);
    band.rotation.y = heading;
    group.add(band);

    const tex = bandTexture(type, n);
    const d = decal(tex, across - 0.2, BAND_LENGTH - 0.16, ROAD_Y + TILE_H + 0.045);
    d.position.x = pos.x;
    d.position.z = pos.z;
    d.rotation.y = readableYaw(heading, Math.PI);
    group.add(d);

    if (type === 'cruce') {
      const { normal } = frameAt(STATIONS[k]);
      buildTrafficLight(group, pos.clone().addScaledVector(normal, ROAD_HALF + 1.0), heading);
      buildTrafficLight(group, pos.clone().addScaledVector(normal, -(ROAD_HALF + 1.0)), heading + Math.PI);
    }
  }
}

function buildTrafficLight(group, at, heading) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#23262e', roughness: 0.5 });
  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 12), dark));
  pole.position.y = 1.1;
  g.add(pole);
  const box = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.95, 0.34, 2, 0.08), dark));
  box.position.y = 2.35;
  g.add(box);
  const colors = ['#ff3b2f', '#ffb300', '#2fd25a'];
  colors.forEach((c, i) => {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 12),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i === 2 ? 1.6 : 0.25 }),
    );
    lamp.position.set(0.18, 2.66 - i * 0.3, 0);
    g.add(lamp);
  });
  g.position.copy(at);
  g.rotation.y = heading;
  group.add(g);
}

function buildCourthouse(group) {
  const { pos, tangent, heading } = bandFrame(LANE_LENGTH);
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: '#EFE6D2', roughness: 0.7 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: '#D9CDB3', roughness: 0.75 });
  const gold = new THREE.MeshStandardMaterial({ color: UBA.gold, roughness: 0.3, metalness: 0.7 });

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

  const tower = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.3, 1.6, 2, 0.05), stone));
  tower.position.set(1.6, 3.6, 0);
  g.add(tower);
  const dome = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), gold));
  dome.position.set(1.6, 4.25, 0);
  g.add(dome);

  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.34), new THREE.MeshStandardMaterial({ map: signTexture('PALACIO DE JUSTICIA', { size: 46, h: 96, w: 768 }) }));
  plaque.position.set(-0.41, 2.82, 0);
  plaque.rotation.y = -Math.PI / 2;
  g.add(plaque);

  buildFlag(g, new THREE.Vector3(1.6, 4.9, 0));

  g.scale.setScalar(0.62);
  g.position.copy(pos).addScaledVector(tangent, BAND_LENGTH / 2 + 0.45);
  g.rotation.y = heading;
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
  flag.userData.flag = true;
  group.add(flag);
}

function buildObelisco(group, x, z) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#F5F1E8', roughness: 0.6 });
  const plaza = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#E3D8C0', roughness: 0.8 })));
  plaza.position.y = 0.06;
  g.add(plaza);
  const shaft = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 5.4, 4, 1), white));
  shaft.rotation.y = Math.PI / 4;
  shaft.position.y = 0.12 + 2.7;
  g.add(shaft);
  const tip = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.31, 0.5, 4), white));
  tip.rotation.y = Math.PI / 4;
  tip.position.y = 0.12 + 5.4 + 0.25;
  g.add(tip);
  g.position.set(x, 0, z);
  group.add(g);
}

const TREE_GREENS = ['#4FA35A', '#6BBF3A', '#3E8E5E', '#86C66B'];
const HOUSE_COLORS = ['#F2C9A0', '#BDD7ED', '#F4EFE4', '#FCCD8E', '#E9B8C4', '#C9E3B8'];

function buildScenery(group, rnd, quality) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#8A5A3B', roughness: 0.8 });
  const leafMats = TREE_GREENS.map((c) => plastic(c, { clearcoat: 0.2, roughness: 0.55 }));
  const roofMat = plastic('#C8553D');
  const roofMat2 = plastic(UBA.navy);
  const meta = bandFrame(LANE_LENGTH);
  const spots = [{ x: meta.pos.x + meta.tangent.x * 2.2, z: meta.pos.z + meta.tangent.z * 2.2, r: 2.6 }];
  const free = (x, z, r) =>
    Math.abs(x) < BOARD.width / 2 - 0.8 &&
    Math.abs(z) < BOARD.depth / 2 - 0.8 &&
    distanceToRoad(x, z) > ROAD_HALF + 0.9 + r &&
    Math.hypot(x - SPINNER_POS.x, z - SPINNER_POS.z) > 5.2 + r &&
    Math.hypot(x + 8.6, z - 1.2) > 2.4 + r &&
    spots.every((s) => Math.hypot(s.x - x, s.z - z) > s.r + r + 0.25);

  const treeCount = quality === 'bajo' ? 28 : 46;
  for (let i = 0, tries = 0; i < treeCount && tries < 3000; tries++) {
    const x = (rnd() - 0.5) * BOARD.width;
    const z = (rnd() - 0.5) * BOARD.depth;
    if (!free(x, z, 0.45)) continue;
    const t = new THREE.Group();
    const h = 0.5 + rnd() * 0.5;
    const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, h, 8), trunkMat));
    trunk.position.y = h / 2;
    t.add(trunk);
    const leaf = leafMats[Math.floor(rnd() * leafMats.length)];
    if (rnd() < 0.5) {
      const crown = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.42 + rnd() * 0.18, 20, 14), leaf));
      crown.position.y = h + 0.3;
      t.add(crown);
    } else {
      for (let j = 0; j < 2; j++) {
        const cone = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.46 - j * 0.12, 0.7, 18), leaf));
        cone.position.y = h + 0.2 + j * 0.38;
        t.add(cone);
      }
    }
    t.position.set(x, 0, z);
    t.scale.setScalar(0.75 + rnd() * 0.4);
    group.add(t);
    spots.push({ x, z, r: 0.45 });
    i++;
  }

  for (let i = 0, tries = 0; i < 14 && tries < 3000; tries++) {
    const x = (rnd() - 0.5) * BOARD.width;
    const z = (rnd() - 0.5) * BOARD.depth;
    const tall = rnd() < 0.35;
    const w = 0.9 + rnd() * 0.5;
    const d = 0.9 + rnd() * 0.4;
    const h = tall ? 1.6 + rnd() * 1.4 : 0.7 + rnd() * 0.3;
    if (!free(x, z, Math.max(w, d) * 0.75)) continue;
    const g = new THREE.Group();
    const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.05), plastic(HOUSE_COLORS[i % HOUSE_COLORS.length])));
    body.position.y = h / 2;
    g.add(body);
    if (tall) {
      const winMat = new THREE.MeshStandardMaterial({ color: '#2b3350', roughness: 0.2, metalness: 0.3 });
      for (let f = 0; f < Math.floor(h / 0.45); f++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.12, d + 0.02), winMat);
        win.position.y = 0.35 + f * 0.45;
        g.add(win);
      }
    } else {
      const roof = shadowed(new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 0.6, 4), rnd() < 0.5 ? roofMat : roofMat2));
      roof.rotation.y = Math.PI / 4;
      roof.position.y = h + 0.3;
      g.add(roof);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rnd() * Math.PI;
    group.add(g);
    spots.push({ x, z, r: Math.max(w, d) * 0.75 });
    i++;
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
      card.rotation.y = (Math.sin(i * 7 + j * 3) * 0.04);
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
  buildTable(group, quality);
  buildBoardBody(group);
  buildRoad(group);
  const laneMaterials = buildLaneRibbons(group, roster);
  buildTiles(group);
  buildBands(group);
  buildCourthouse(group);
  buildObelisco(group, -8.6, 1.2);
  buildScenery(group, seeded(11), quality);
  buildDecks(group);
  mergeStatic(group);
  return { group, laneMaterials };
}

export { TILE_H, ROAD_Y };
