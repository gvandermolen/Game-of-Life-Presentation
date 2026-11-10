import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOARD, DESTINO_POS, LANDMARK_SPOTS, ROAD_WIDTH } from './layout.js';
import { buildLandmarks, hidesLabel } from './landmarks.js';
import { mergeStatic } from './merge.js';
import { UBA } from './palette.js';
import { PrintedBoard } from './printed.js';
import { FACULTAD, GAME_SPACE, LAP_SPACE } from './space.js';
import { PIECE_Y, buildGameTrack, buildLapTrack, buildSharedTrack } from './track.js';
import { signTexture, woodTexture } from './textures.js';

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
    bumpScale: 0.6,
    roughness: 0.66,
    clearcoat: 0.28,
    clearcoatRoughness: 0.42,
  });
  const top = new THREE.Mesh(geo, mat);
  top.position.y = 0.005;
  top.receiveShadow = true;
  group.add(top);
}

const WINDOW = new THREE.MeshPhysicalMaterial({ color: '#2E4A68', roughness: 0.12, metalness: 0.2, clearcoat: 1 });
const DOOR = new THREE.MeshStandardMaterial({ color: '#5A3A26', roughness: 0.5 });

function inset(g, mat, [sx, sy, sz], [x, y, z]) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(sx, sy, sz, 1, Math.min(sx, sy, sz) / 2 - 0.001), mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  g.add(m);
}

// White plastic buildings, like the 3D pieces of the vintage board.
function house(white, roofMat, w, d, h) {
  const g = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.04), white));
  body.position.y = h / 2;
  g.add(body);
  inset(g, DOOR, [0.15, 0.25, 0.024], [0, 0.125, d / 2]);
  for (const s of [-1, 1]) {
    inset(g, WINDOW, [0.13, 0.13, 0.024], [s * w * 0.3, h * 0.58, d / 2]);
    inset(g, WINDOW, [0.024, 0.13, 0.13], [s * w / 2, h * 0.58, 0]);
    inset(g, WINDOW, [0.13, 0.13, 0.024], [s * w * 0.22, h * 0.58, -d / 2]);
  }
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
  const cornice = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w + 0.07, 0.06, d + 0.07, 2, 0.02), white));
  cornice.position.y = h;
  g.add(cornice);
  const plant = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w * 0.45, 0.14, d * 0.4, 2, 0.03), white));
  plant.position.set(w * 0.1, h + 0.1, -d * 0.1);
  g.add(plant);
  inset(g, DOOR, [0.2, 0.2, 0.024], [0, 0.1, d / 2]);
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

let townMats = null;

function buildTown(group, rnd, spots, space) {
  townMats ||= {
    white: plastic('#F6F3EC', { roughness: 0.3, clearcoat: 0.7 }),
    roofs: [plastic('#C9503A'), plastic('#F6F3EC', { roughness: 0.3 }), plastic(UBA.navy)],
    glass: new THREE.MeshPhysicalMaterial({ color: '#7FA9C9', roughness: 0.1, metalness: 0.2, clearcoat: 1 }),
  };
  const { white, roofs, glass } = townMats;
  let placed = 0;
  for (let tries = 0; tries < 6000 && placed < 22; tries++) {
    const x = (rnd() - 0.5) * BOARD.width;
    const z = (rnd() - 0.5) * BOARD.depth;
    const kind = rnd();
    const r = kind < 0.12 ? 0.9 : 0.6;
    if (!space.isFree(x, z, r, { road: 0.3 })) continue;
    // Buildings line the roads: keep them close to one.
    if (space.distanceToRoads(x, z) > ROAD_WIDTH / 2 + 0.3 + r + 1.6) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + r + 0.15)) continue;
    const towerH = 1.2 + rnd() * 1.3;
    if (hidesLabel(spots, x, z, r, kind < 0.12 ? 2.2 : kind < 0.4 ? towerH : 1)) continue;
    let b;
    if (kind < 0.12) b = church(white, roofs[0]);
    else if (kind < 0.4) b = tower(white, glass, 0.7 + rnd() * 0.3, 0.7 + rnd() * 0.3, towerH);
    else b = house(white, roofs[Math.floor(rnd() * roofs.length)], 0.7 + rnd() * 0.35, 0.7 + rnd() * 0.4, 0.45 + rnd() * 0.25);
    b.position.set(x, 0, z);
    b.rotation.y = Math.round(rnd() * 4) * (Math.PI / 2) + (rnd() - 0.5) * 0.4;
    group.add(b);
    spots.push({ x, z, r });
    placed++;
  }
}

const TREE_GREENS = ['#3F8F4A', '#5BAF3A', '#2F7D4E', '#74B85A'];

let treeMats = null;

function buildTrees(group, rnd, spots, quality, space) {
  treeMats ||= {
    trunk: new THREE.MeshStandardMaterial({ color: '#7A4E32', roughness: 0.8 }),
    leaves: TREE_GREENS.map((c) => plastic(c, { clearcoat: 0.35, roughness: 0.45 })),
  };
  const { trunk: trunkMat, leaves: leafMats } = treeMats;
  const count = quality === 'bajo' ? 18 : 30;
  for (let i = 0, tries = 0; i < count && tries < 4000; tries++) {
    const x = (rnd() - 0.5) * BOARD.width;
    const z = (rnd() - 0.5) * BOARD.depth;
    if (!space.isFree(x, z, 0.4, { road: 0.25, river: 0.15 })) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 0.5)) continue;
    if (hidesLabel(spots, x, z, 0.4, 1.3)) continue;
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

// The Facultad de Derecho: the colonnade and dome the class just walked out of.
function buildFacultad(group) {
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
    const z = -2.3 + i * 0.92;
    const col = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 2.1, 20), stone));
    col.position.set(-0.05, 0.54 + 1.05, z);
    g.add(col);
    for (const y of [0.58, 2.6]) {
      const cap = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.1, 0.42, 2, 0.02), stoneDark));
      cap.position.set(-0.05, y, z);
      g.add(cap);
    }
  }
  // Two rows of tall windows along each side of the hall.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      for (const y of [1.3, 2.3]) inset(g, WINDOW, [0.34, 0.55, 0.03], [0.7 + i * 0.6, y, side * 2.8]);
    }
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
  for (let i = 0; i < 4; i++) {
    const rib = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.83, 0.03, 6, 32, Math.PI), stone));
    rib.position.set(1.6, 3.85, 0);
    rib.rotation.y = (i * Math.PI) / 4;
    g.add(rib);
  }
  const lantern = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 16), stone));
  lantern.position.set(1.6, 4.75, 0);
  g.add(lantern);
  const drumBand = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.93, 0.08, 32), stoneDark));
  drumBand.position.set(1.6, 3.85, 0);
  g.add(drumBand);

  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.34), new THREE.MeshStandardMaterial({ map: signTexture('FACULTAD DE DERECHO', { size: 46, h: 96, w: 768 }) }));
  plaque.position.set(-0.46, 2.82, 0);
  plaque.rotation.y = -Math.PI / 2;
  g.add(plaque);

  buildFlag(g, new THREE.Vector3(1.6, 4.6, 0));

  g.scale.setScalar(0.62);
  g.position.set(FACULTAD.x, 0, FACULTAD.z);
  g.rotation.y = Math.PI / 2;
  group.add(g);
}

// Home: where every car ends up. The front door faces the arriving road.
function buildCasa(group) {
  const white = plastic('#FBF3E4', { roughness: 0.3, clearcoat: 0.7 });
  const roof = plastic('#C9503A');
  const g = house(white, roof, 1.25, 1.1, 0.8);
  const chimney = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.4, 0.16, 2, 0.03), plastic('#B65A3A')));
  chimney.position.set(0.3, 1.25, -0.2);
  g.add(chimney);
  const lawn = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.05, 2.0, 2, 0.02), plastic('#6FB84E', { roughness: 0.5, clearcoat: 0.2 }));
  lawn.position.y = 0.025;
  lawn.receiveShadow = true;
  g.add(lawn);
  const picket = plastic('#FFFFFF', { roughness: 0.35 });
  for (let i = 0; i < 9; i++) {
    for (const s of [-1, 1]) {
      const p = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.22, 0.04, 1, 0.015), picket));
      p.position.set(-1.0 + i * 0.25, 0.14, s * 0.95);
      g.add(p);
    }
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshStandardMaterial({ map: signTexture('CASA', { w: 384, h: 128, size: 80 }) }));
  sign.position.set(0, 0.42, 1.0);
  g.add(sign);
  const post = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), picket));
  post.position.set(0, 0.15, 0.98);
  g.add(post);
  g.scale.setScalar(1.45);
  g.position.set(DESTINO_POS.x - 0.4, 0, DESTINO_POS.z);
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

// One board with two worlds on it: the lap road and the game lanes. The table,
// the river, the Facultad and the title plate are shared; each world brings its
// own road, town and trees, and only one is visible at a time.
export function buildBoard(quality, title) {
  const group = new THREE.Group();
  const common = new THREE.Group();
  const game = new THREE.Group();
  const lap = new THREE.Group();
  group.add(common, game, lap);

  const printed = new PrintedBoard(quality);
  buildTable(common, quality);
  buildBoardBody(common, printed);
  const { setTitle } = buildSharedTrack(common, title);
  buildFacultad(common);

  buildGameTrack(game);
  buildCasa(game);
  const { flag } = buildLapTrack(lap);

  for (const [world, space, seed] of [
    [game, GAME_SPACE, 11],
    [lap, LAP_SPACE, 23],
  ]) {
    const spots = [];
    const rnd = seeded(seed);
    buildLandmarks(world, spots, space);
    if (world === game) LANDMARK_SPOTS.push(...spots);
    buildTown(world, rnd, spots, space);
    buildTrees(world, rnd, spots, quality, space);
  }
  for (const g of [common, game, lap]) mergeStatic(g);
  return { group, worlds: { juego: game, vuelta: lap }, flag, setTitle };
}

export { PIECE_Y };
