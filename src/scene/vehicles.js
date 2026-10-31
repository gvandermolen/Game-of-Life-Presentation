import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeStatic } from './merge.js';
import { UBA } from './palette.js';
import { radialShadowTexture, signTexture } from './textures.js';

// Vehicles face local +x, width along z, and sit on a round team-coloured pawn
// base. Bodies are side silhouettes extruded across the width with bevelled
// edges, so they read as die-cast toys rather than stacked boxes.

const glass = new THREE.MeshPhysicalMaterial({ color: '#141a2a', roughness: 0.05, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
const tyre = new THREE.MeshStandardMaterial({ color: '#17181c', roughness: 0.8 });
const rimMat = new THREE.MeshStandardMaterial({ color: '#c9ccd3', roughness: 0.25, metalness: 0.85 });
const chrome = new THREE.MeshStandardMaterial({ color: '#e2e5ea', roughness: 0.12, metalness: 1 });
const trim = new THREE.MeshStandardMaterial({ color: '#2a2c31', roughness: 0.55 });
const whitePlastic = new THREE.MeshPhysicalMaterial({ color: '#f7f5ef', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
const lightMat = new THREE.MeshStandardMaterial({ color: '#fff6d6', emissive: '#fff1b8', emissiveIntensity: 1.1 });
const tailMat = new THREE.MeshStandardMaterial({ color: '#ff4a3a', emissive: '#ff2a1a', emissiveIntensity: 0.7 });
const plateMat = new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.5 });
let shadowTex = null;

function body(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 });
}

function m(geo, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function rbox(g, mat, [sx, sy, sz], [x, y, z], r = 0.015) {
  g.add(m(new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(r, Math.min(sx, sy, sz) / 2 - 0.001)), mat, x, y, z));
}

// Extrude a side profile across `width` (total, bevel included), centred on z = 0.
function extrude(shape, width, bevel = 0.02) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 18,
  });
  geo.translate(0, 0, -(width - 2 * bevel) / 2);
  geo.computeVertexNormals();
  return geo;
}

// A thin bar from a to b in the side plane, at depth z.
function bar(g, mat, a, b, z, t = 0.026) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const mesh = m(new THREE.BoxGeometry(len + t * 0.5, t, t), mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
  mesh.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
  g.add(mesh);
}

// Lower body from bumper to bumper with an arch over each wheel. The bevel grows
// the outline outward, so the shape is drawn `bevel` inside the final size.
function lowerProfile({ half, sill, belt, wheelX, archR, nose = 0.05, tail = 0.04 }) {
  const s = new THREE.Shape();
  s.moveTo(-half + 0.03, sill);
  for (const wx of [...wheelX].sort((a, b) => a - b)) {
    s.lineTo(wx - archR, sill);
    s.absarc(wx, sill + 0.03, archR, Math.PI, 0, true);
    s.lineTo(wx + archR, sill);
  }
  s.lineTo(half - 0.03, sill);
  s.quadraticCurveTo(half, sill, half, sill + 0.04);
  s.lineTo(half, belt - nose);
  s.quadraticCurveTo(half, belt - 0.005, half - nose * 1.4, belt);
  s.lineTo(-half + tail * 1.4, belt + 0.008);
  s.quadraticCurveTo(-half, belt, -half, belt - tail);
  s.lineTo(-half, sill + 0.04);
  s.quadraticCurveTo(-half, sill, -half + 0.03, sill);
  return s;
}

function wheel(r, w) {
  const e = Math.min(0.025, w * 0.35);
  const pts = [
    new THREE.Vector2(r * 0.6, -w / 2),
    new THREE.Vector2(r - e, -w / 2),
    new THREE.Vector2(r - e * 0.3, -w / 2 + e * 0.3),
    new THREE.Vector2(r, -w / 2 + e),
    new THREE.Vector2(r, w / 2 - e),
    new THREE.Vector2(r - e * 0.3, w / 2 - e * 0.3),
    new THREE.Vector2(r - e, w / 2),
    new THREE.Vector2(r * 0.6, w / 2),
  ];
  const tyreGeo = new THREE.LatheGeometry(pts, 28);
  tyreGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(r * 0.62, r * 0.62, w * 0.86, 24);
  rimGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(r * 0.2, r * 0.24, w * 0.98, 12);
  hubGeo.rotateX(Math.PI / 2);
  return { tyreGeo, rimGeo, hubGeo };
}

function wheels(g, xs, z, r, w = 0.08) {
  const { tyreGeo, rimGeo, hubGeo } = wheel(r, w);
  const y = r + 0.03;
  for (const x of xs) {
    for (const s of [-1, 1]) {
      g.add(m(tyreGeo, tyre, x, y, s * z));
      g.add(m(rimGeo, rimMat, x, y, s * z));
      g.add(m(hubGeo, chrome, x, y, s * z));
    }
  }
}

function sedan(color, o = {}) {
  const {
    length = 0.82, width = 0.42, hood = 0.27, deck = 0.17, rake = 0.12, back = 0.09,
    belt = 0.29, roof = 0.44, roofColor = null, r = 0.1,
  } = o;
  const g = new THREE.Group();
  const paint = body(color);
  const roofPaint = roofColor ? body(roofColor) : paint;
  const bevel = 0.022;
  const half = length / 2 - bevel;
  const sill = 0.1;
  const wheelX = [length * 0.3, -length * 0.3];
  g.add(m(extrude(lowerProfile({ half, sill, belt, wheelX, archR: r + 0.03 }), width, bevel), paint));

  // Glass cabin: windscreen, roof line and rear window.
  const xf = length / 2 - hood;
  const xr = -length / 2 + deck;
  const rf = xf - rake;
  const rr = xr + back;
  const cab = new THREE.Shape();
  cab.moveTo(xr, belt - 0.01);
  cab.lineTo(xf, belt - 0.01);
  cab.lineTo(rf, roof - 0.01);
  cab.lineTo(rr, roof - 0.01);
  cab.closePath();
  const cabW = width - 0.07;
  g.add(m(extrude(cab, cabW, 0.012), glass));

  // Roof panel and pillars frame the glass so the windows read as windows.
  rbox(g, roofPaint, [rf - rr + 0.05, 0.035, cabW + 0.012], [(rf + rr) / 2, roof + 0.004, 0], 0.016);
  const pz = cabW / 2 - 0.004;
  const midX = (rf + rr) / 2;
  for (const s of [-1, 1]) {
    bar(g, roofPaint, [xf + 0.01, belt], [rf, roof], s * pz);
    bar(g, roofPaint, [xr - 0.01, belt], [rr, roof], s * pz);
    bar(g, roofPaint, [midX, belt], [midX - 0.012, roof], s * pz, 0.03);
    rbox(g, paint, [0.04, 0.035, 0.035], [xf - 0.03, belt + 0.03, s * (width / 2 + 0.01)], 0.012);
  }

  // Bumpers, grille, lamps and plates.
  const fx = length / 2;
  rbox(g, trim, [0.06, 0.06, width - 0.02], [fx - 0.01, sill + 0.04, 0], 0.025);
  rbox(g, trim, [0.06, 0.06, width - 0.02], [-fx + 0.01, sill + 0.04, 0], 0.025);
  rbox(g, trim, [0.02, 0.05, 0.17], [fx + 0.001, belt - 0.075, 0], 0.01);
  for (const s of [-1, 1]) {
    rbox(g, lightMat, [0.025, 0.045, 0.085], [fx - 0.004, belt - 0.07, s * 0.14], 0.014);
    rbox(g, tailMat, [0.025, 0.045, 0.09], [-fx + 0.004, belt - 0.06, s * 0.14], 0.014);
  }
  rbox(g, plateMat, [0.008, 0.04, 0.12], [-fx - 0.022, sill + 0.06, 0], 0.004);
  wheels(g, wheelX, width / 2 - 0.045, r);
  return g;
}

const BUILDERS = {
  // A Buenos Aires colectivo: team-coloured body, white roof, a long window
  // band, a front door on the kerb side and the route number over the windscreen.
  colectivo(color) {
    const g = new THREE.Group();
    const paint = body(color);
    const L = 1.08;
    const W = 0.44;
    const bevel = 0.025;
    const half = L / 2 - bevel;
    const sill = 0.1;
    const top = 0.6;
    const r = 0.11;
    const wheelX = [-0.34, 0.26];
    const s = new THREE.Shape();
    s.moveTo(-half + 0.03, sill);
    for (const wx of wheelX) {
      s.lineTo(wx - r - 0.03, sill);
      s.absarc(wx, sill + 0.04, r + 0.03, Math.PI, 0, true);
      s.lineTo(wx + r + 0.03, sill);
    }
    s.lineTo(half - 0.03, sill);
    s.quadraticCurveTo(half, sill, half, sill + 0.04);
    s.lineTo(half + 0.01, top - 0.07);
    s.quadraticCurveTo(half + 0.005, top, half - 0.06, top);
    s.lineTo(-half + 0.05, top);
    s.quadraticCurveTo(-half, top, -half, top - 0.05);
    s.lineTo(-half, sill + 0.04);
    s.quadraticCurveTo(-half, sill, -half + 0.03, sill);
    g.add(m(extrude(s, W, bevel), paint));

    rbox(g, whitePlastic, [L - 0.1, 0.035, W - 0.03], [-0.02, top + 0.02, 0], 0.016);
    rbox(g, whitePlastic, [0.3, 0.05, 0.26], [-0.18, top + 0.055, 0], 0.02);
    rbox(g, whitePlastic, [L - 0.06, 0.03, W + 0.008], [0, 0.29, 0], 0.012);

    for (let i = 0; i < 5; i++) {
      rbox(g, glass, [0.145, 0.16, W + 0.01], [-0.42 + i * 0.165, 0.42, 0], 0.012);
    }
    rbox(g, glass, [0.1, 0.16, W + 0.01], [0.43, 0.42, 0], 0.012);
    // Front door on the kerb side (+z is the right-hand side when facing +x).
    rbox(g, glass, [0.09, 0.17, 0.012], [0.47, 0.2, W / 2 + 0.002], 0.004);
    rbox(g, glass, [0.014, 0.2, W - 0.07], [L / 2 + 0.008, 0.37, 0], 0.006);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.06),
      new THREE.MeshBasicMaterial({ map: signTexture('152', { bg: '#111', fg: '#ffb300', w: 256, h: 64, size: 50 }) }),
    );
    sign.position.set(L / 2 + 0.017, 0.51, 0);
    sign.rotation.y = Math.PI / 2;
    g.add(sign);

    rbox(g, trim, [0.06, 0.06, W - 0.01], [L / 2, sill + 0.04, 0], 0.025);
    rbox(g, trim, [0.06, 0.06, W - 0.01], [-L / 2, sill + 0.04, 0], 0.025);
    for (const side of [-1, 1]) {
      rbox(g, lightMat, [0.02, 0.04, 0.07], [L / 2 + 0.008, 0.19, side * 0.15], 0.012);
      rbox(g, tailMat, [0.02, 0.07, 0.05], [-L / 2 - 0.006, 0.24, side * 0.16], 0.012);
      bar(g, trim, [L / 2 - 0.02, 0.5], [L / 2 + 0.05, 0.47], side * (W / 2 + 0.015), 0.014);
      rbox(g, trim, [0.015, 0.08, 0.04], [L / 2 + 0.055, 0.43, side * (W / 2 + 0.02)], 0.006);
    }
    wheels(g, wheelX, W / 2 - 0.045, r, 0.09);
    return g;
  },
  // Buenos Aires taxi: black with a yellow roof and the TAXI light on top.
  taxi(color) {
    const g = sedan('#1b1c20', { roofColor: color });
    const sign = new THREE.Mesh(
      new RoundedBoxGeometry(0.2, 0.07, 0.13, 2, 0.02),
      new THREE.MeshStandardMaterial({ map: signTexture('TAXI', { bg: '#fff3c4', fg: '#1b1c20', w: 256, h: 96, size: 58 }), emissive: '#ffe9a8', emissiveIntensity: 0.3 }),
    );
    sign.position.set(-0.05, 0.5, 0);
    sign.castShadow = true;
    g.add(sign);
    return g;
  },
  auto(color) {
    return sedan(color);
  },
  // Ride-hailing car: a compact hatchback with a map pin floating over it.
  app(color) {
    const g = sedan(color, { length: 0.76, hood: 0.22, deck: 0.05, rake: 0.13, back: 0.07, roof: 0.45 });
    const pin = new THREE.Group();
    const pinMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, clearcoat: 1 });
    const head = m(new THREE.SphereGeometry(0.11, 24, 16), pinMat, 0, 0.12, 0);
    const tip = m(new THREE.ConeGeometry(0.1, 0.16, 24), pinMat, 0, 0.02, 0);
    tip.rotation.z = Math.PI;
    const dot = m(new THREE.SphereGeometry(0.05, 16, 12), body(color), 0, 0.12, 0);
    dot.scale.set(1, 1, 1.6);
    pin.add(head, tip, dot);
    pin.position.set(-0.06, 0.6, 0);
    pin.userData.bob = pin.position.y;
    pin.userData.dynamic = true;
    g.add(pin);
    return g;
  },
  moto(color) {
    const g = new THREE.Group();
    const paint = body(color);
    const r = 0.12;
    const y = r + 0.03;
    const { tyreGeo, rimGeo, hubGeo } = wheel(r, 0.055);
    for (const x of [0.27, -0.25]) {
      g.add(m(tyreGeo, tyre, x, y, 0), m(rimGeo, rimMat, x, y, 0), m(hubGeo, chrome, x, y, 0));
    }
    // Frame, tank, seat, tail and front fairing.
    bar(g, trim, [-0.25, y], [0.0, 0.27], 0, 0.035);
    for (const s of [-1, 1]) bar(g, chrome, [0.27, y], [0.2, 0.42], s * 0.035, 0.018);
    rbox(g, paint, [0.22, 0.12, 0.16], [0.06, 0.32, 0], 0.05);
    rbox(g, tyre, [0.2, 0.045, 0.13], [-0.1, 0.36, 0], 0.02);
    rbox(g, paint, [0.14, 0.06, 0.12], [-0.22, 0.35, 0], 0.025);
    rbox(g, paint, [0.08, 0.11, 0.13], [0.22, 0.4, 0], 0.035);
    rbox(g, paint, [0.08, 0.015, 0.07], [0.27, 0.28, 0], 0.006);
    rbox(g, trim, [0.12, 0.08, 0.1], [0.0, 0.2, 0], 0.025);
    bar(g, chrome, [-0.04, 0.17], [-0.3, 0.22], 0.08, 0.03);
    const handle = m(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), chrome, 0.19, 0.46, 0);
    handle.rotation.x = Math.PI / 2;
    g.add(handle);
    rbox(g, lightMat, [0.02, 0.045, 0.06], [0.265, 0.4, 0], 0.012);
    rbox(g, tailMat, [0.015, 0.03, 0.06], [-0.29, 0.36, 0], 0.008);

    const rider = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: '#2a2f45', roughness: 0.65 });
    rider.add(m(new THREE.CapsuleGeometry(0.075, 0.18, 6, 12), jacket, 0, 0.12, 0));
    for (const s of [-1, 1]) {
      const arm = m(new THREE.CapsuleGeometry(0.025, 0.17, 4, 8), jacket, 0.1, 0.17, s * 0.08);
      arm.rotation.z = -1.0;
      rider.add(arm);
      const leg = m(new THREE.CapsuleGeometry(0.03, 0.14, 4, 8), jacket, 0.07, -0.03, s * 0.07);
      leg.rotation.z = -1.3;
      rider.add(leg);
    }
    rider.add(m(new THREE.SphereGeometry(0.09, 24, 16), paint, 0.02, 0.32, 0));
    const visor = m(new THREE.SphereGeometry(0.092, 20, 12, Math.PI * 0.65, Math.PI * 0.7, Math.PI * 0.32, Math.PI * 0.3), glass, 0.02, 0.32, 0);
    rider.add(visor);
    rider.position.set(-0.08, 0.4, 0);
    rider.rotation.z = -0.22;
    g.add(rider);
    return g;
  },
  // Remís: a long dark-trimmed sedan with chrome along the waist.
  remis(color) {
    const g = sedan(color, { length: 0.92, hood: 0.29, deck: 0.2, back: 0.1 });
    for (const s of [-1, 1]) rbox(g, chrome, [0.84, 0.014, 0.01], [0, 0.255, s * 0.211], 0.004);
    return g;
  },
};

export function buildPiece(team) {
  const root = new THREE.Group();
  const lift = new THREE.Group();
  root.add(lift);

  if (!shadowTex) shadowTex = radialShadowTexture();
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  blob.renderOrder = 1;
  root.add(blob);

  const base = m(new THREE.CylinderGeometry(0.5, 0.54, 0.09, 48), body(team.color), 0, 0.045, 0);
  lift.add(base);
  const rim = m(new THREE.TorusGeometry(0.5, 0.025, 12, 64), new THREE.MeshStandardMaterial({ color: UBA.gold, metalness: 0.8, roughness: 0.25 }), 0, 0.09, 0);
  rim.rotation.x = Math.PI / 2;
  lift.add(rim);

  const built = (BUILDERS[team.id] || BUILDERS.auto)(team.color);
  const teamColor = new THREE.Color(team.color);
  const paints = new Set([base.material]);
  built.traverse((o) => {
    if (o.isMesh && o.material.color?.equals(teamColor)) paints.add(o.material);
  });
  const vehicle = mergeStatic(built);
  vehicle.position.y = 0.06;
  lift.add(vehicle);

  root.userData = { lift, vehicle, paints, teamId: team.id };
  return root;
}

export function setPieceColor(piece, color) {
  for (const mat of piece.userData.paints) mat.color.set(color);
}
