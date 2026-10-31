import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeStatic } from './merge.js';
import { UBA } from './palette.js';
import { radialShadowTexture, signTexture } from './textures.js';

// Vehicles face local +x. Every piece sits on a round team-coloured pawn base.

const glass = new THREE.MeshPhysicalMaterial({ color: '#1b2338', roughness: 0.08, metalness: 0.2, clearcoat: 1 });
const tyre = new THREE.MeshStandardMaterial({ color: '#16171b', roughness: 0.75 });
const chrome = new THREE.MeshStandardMaterial({ color: '#d9dde4', roughness: 0.2, metalness: 0.9 });
const whitePlastic = new THREE.MeshPhysicalMaterial({ color: '#f7f5ef', roughness: 0.35, clearcoat: 0.6 });
const lightMat = new THREE.MeshStandardMaterial({ color: '#fff6d6', emissive: '#fff1b8', emissiveIntensity: 0.9 });
const tailMat = new THREE.MeshStandardMaterial({ color: '#ff4a3a', emissive: '#ff2a1a', emissiveIntensity: 0.6 });
let shadowTex = null;

function body(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
}

function m(geo, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function wheels(g, xs, z, r = 0.1, y = r + 0.08) {
  const geo = new THREE.CylinderGeometry(r, r, 0.08, 20);
  geo.rotateX(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.085, 12);
  hub.rotateX(Math.PI / 2);
  for (const x of xs) {
    for (const s of [-1, 1]) {
      g.add(m(geo, tyre, x, y, s * z));
      g.add(m(hub, chrome, x, y, s * (z + 0.003)));
    }
  }
}

function lights(g, front, back, y, z) {
  const l = new THREE.BoxGeometry(0.02, 0.05, 0.08);
  for (const s of [-1, 1]) {
    g.add(m(l, lightMat, front, y, s * z));
    g.add(m(l, tailMat, back, y, s * z));
  }
}

function sedan(color, { length = 0.8, roofColor = null, cabinLen = 0.42 } = {}) {
  const g = new THREE.Group();
  const paint = body(color);
  g.add(m(new RoundedBoxGeometry(length, 0.2, 0.42, 3, 0.07), paint, 0, 0.2, 0));
  g.add(m(new RoundedBoxGeometry(cabinLen, 0.2, 0.38, 3, 0.07), roofColor ? body(roofColor) : paint, -0.04, 0.36, 0));
  g.add(m(new RoundedBoxGeometry(cabinLen - 0.06, 0.13, 0.395, 2, 0.04), glass, -0.04, 0.35, 0));
  wheels(g, [length * 0.3, -length * 0.3], 0.19);
  lights(g, length / 2 + 0.005, -length / 2 - 0.005, 0.22, 0.13);
  return g;
}

const BUILDERS = {
  colectivo(color) {
    const g = new THREE.Group();
    const paint = body(color);
    g.add(m(new RoundedBoxGeometry(1.05, 0.26, 0.44, 3, 0.07), paint, 0, 0.22, 0));
    g.add(m(new RoundedBoxGeometry(1.03, 0.2, 0.43, 3, 0.07), whitePlastic, 0, 0.44, 0));
    g.add(m(new RoundedBoxGeometry(0.98, 0.12, 0.445, 2, 0.03), glass, 0, 0.43, 0));
    g.add(m(new RoundedBoxGeometry(0.04, 0.16, 0.38, 2, 0.02), glass, 0.52, 0.42, 0));
    g.add(m(new RoundedBoxGeometry(1.0, 0.04, 0.4, 2, 0.02), paint, 0, 0.56, 0));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.07), new THREE.MeshBasicMaterial({ map: signTexture('152', { bg: '#111', fg: '#ffb300', w: 256, h: 64, size: 50 }) }));
    sign.position.set(0.531, 0.52, 0);
    sign.rotation.y = Math.PI / 2;
    g.add(sign);
    wheels(g, [0.33, -0.33], 0.2, 0.11);
    lights(g, 0.53, -0.53, 0.2, 0.15);
    return g;
  },
  taxi(color) {
    const g = sedan('#1b1c20', { roofColor: color });
    const sign = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.08, 0.14, 2, 0.02), new THREE.MeshStandardMaterial({ map: signTexture('TAXI', { bg: '#fff3c4', fg: '#1b1c20', w: 256, h: 96, size: 58 }), emissive: '#ffe9a8', emissiveIntensity: 0.25 }));
    sign.position.set(-0.04, 0.5, 0);
    sign.castShadow = true;
    g.add(sign);
    return g;
  },
  auto(color) {
    return sedan(color);
  },
  app(color) {
    const g = sedan(color, { length: 0.74, cabinLen: 0.48 });
    const pin = new THREE.Group();
    const pinMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, clearcoat: 1 });
    const head = m(new THREE.SphereGeometry(0.11, 24, 16), pinMat, 0, 0.12, 0);
    const tip = m(new THREE.ConeGeometry(0.1, 0.16, 24), pinMat, 0, 0.02, 0);
    tip.rotation.z = Math.PI;
    const dot = m(new THREE.SphereGeometry(0.05, 16, 12), body(color), 0, 0.12, 0);
    dot.scale.set(1, 1, 1.6);
    pin.add(head, tip, dot);
    pin.position.set(-0.04, 0.66, 0);
    pin.userData.bob = true;
    pin.userData.dynamic = true;
    g.add(pin);
    return g;
  },
  moto(color) {
    const g = new THREE.Group();
    const paint = body(color);
    const tyreGeo = new THREE.TorusGeometry(0.12, 0.045, 12, 24);
    g.add(m(tyreGeo, tyre, 0.26, 0.17, 0));
    g.add(m(tyreGeo, tyre, -0.26, 0.17, 0));
    g.add(m(new RoundedBoxGeometry(0.42, 0.14, 0.14, 2, 0.05), paint, 0, 0.3, 0));
    g.add(m(new RoundedBoxGeometry(0.2, 0.05, 0.13, 2, 0.02), tyre, -0.1, 0.39, 0));
    const bar = m(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 8), chrome, 0.22, 0.42, 0);
    bar.rotation.x = Math.PI / 2;
    g.add(bar);
    const rider = new THREE.Group();
    rider.add(m(new THREE.CapsuleGeometry(0.08, 0.2, 6, 12), new THREE.MeshStandardMaterial({ color: '#2a2f45', roughness: 0.6 }), 0, 0.12, 0));
    rider.add(m(new THREE.SphereGeometry(0.095, 20, 14), paint, 0.02, 0.33, 0));
    const visor = m(new THREE.SphereGeometry(0.07, 16, 10, 0, Math.PI), glass, 0.06, 0.33, 0);
    visor.rotation.y = Math.PI / 2;
    rider.add(visor);
    rider.position.set(-0.06, 0.4, 0);
    rider.rotation.z = -0.25;
    g.add(rider);
    g.add(m(new THREE.BoxGeometry(0.02, 0.05, 0.06), lightMat, 0.3, 0.36, 0));
    return g;
  },
  remis(color) {
    const g = sedan(color, { length: 0.92, cabinLen: 0.5 });
    g.add(m(new THREE.BoxGeometry(0.9, 0.02, 0.425), chrome, 0, 0.18, 0));
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

  const base = m(new THREE.CylinderGeometry(0.5, 0.54, 0.09, 40), body(team.color), 0, 0.045, 0);
  lift.add(base);
  const rim = m(new THREE.TorusGeometry(0.5, 0.025, 10, 48), new THREE.MeshStandardMaterial({ color: UBA.gold, metalness: 0.75, roughness: 0.28 }), 0, 0.09, 0);
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
