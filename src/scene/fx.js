import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BARRIER_S, CAR_GAP, ENTRY, MAIN, forkRoute, forkSlot, plaqueAt, queueSlot, squareS } from './layout.js';
import { easeInOut } from './stage.js';

// Animations played on the board before a card opens, and the props they use.
// Each one moves the car to its square itself, so it can zigzag, brake or crash
// on the way. Props stay on the board until the next turn starts.

function plastic(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.25, ...extra });
}

const M = {};
function mats() {
  if (M.trunk) return M;
  Object.assign(M, {
    trunk: new THREE.MeshStandardMaterial({ color: '#7A4E32', roughness: 0.8 }),
    leaf: plastic('#3F8F4A', { clearcoat: 0.35, roughness: 0.45 }),
    leaf2: plastic('#5BAF3A', { clearcoat: 0.35, roughness: 0.45 }),
    dark: new THREE.MeshStandardMaterial({ color: '#23262e', roughness: 0.45 }),
    dog: plastic('#C98A4B', { roughness: 0.5 }),
    dogDark: plastic('#6B4426', { roughness: 0.5 }),
    skin: plastic('#E9B48F', { roughness: 0.55, clearcoat: 0.2 }),
    shirt: plastic('#2D8FD5'),
    jeans: plastic('#2B3A67'),
    robe: plastic('#1B1C22', { roughness: 0.5 }),
    wig: plastic('#F4F1EA', { roughness: 0.6, clearcoat: 0.2 }),
    brick: plastic('#B65A3A', { roughness: 0.5 }),
    white: plastic('#F6F3EC', { roughness: 0.3 }),
    sail: plastic('#F4EEDD', { roughness: 0.5 }),
    wood: plastic('#6B4426', { roughness: 0.6 }),
    red: new THREE.MeshStandardMaterial({ color: '#ff3b2f', emissive: '#ff2a1a', emissiveIntensity: 2.2 }),
    off: new THREE.MeshStandardMaterial({ color: '#3a3d45', roughness: 0.4 }),
  });
  return M;
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- props

function tree(h = 1.1) {
  mats();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.08 * h, 0.12 * h, h, 10), M.trunk, 0, h / 2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.5 * h, 20, 14), M.leaf, 0, h + 0.3 * h, 0));
  g.add(mesh(new THREE.SphereGeometry(0.36 * h, 18, 12), M.leaf2, 0.25 * h, h + 0.55 * h, 0.1 * h));
  return g;
}

function trafficLight(red = true) {
  mats();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.5, 10), M.dark, 0, 0.75, 0));
  g.add(mesh(new RoundedBoxGeometry(0.3, 0.72, 0.26, 2, 0.06), M.dark, 0, 1.65, 0));
  [M.red, M.off, M.off].forEach((mat, i) => {
    const lamp = mesh(new THREE.SphereGeometry(0.075, 14, 10), i === 0 && red ? mat : M.off, 0, 1.88 - i * 0.22, 0.13);
    g.add(lamp);
  });
  return g;
}

function dog() {
  mats();
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.13, 0.32, 6, 12), M.dog, 0, 0.32, 0);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.13, 16, 12), M.dog, 0.3, 0.48, 0));
  g.add(mesh(new THREE.SphereGeometry(0.07, 12, 8), M.dogDark, 0.42, 0.44, 0));
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.06, 10, 8), M.dogDark, 0.27, 0.58, s * 0.09);
    ear.scale.set(0.6, 1.3, 0.6);
    g.add(ear);
  }
  const legs = [];
  for (const [x, z] of [[0.16, 0.08], [0.16, -0.08], [-0.16, 0.08], [-0.16, -0.08]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.26, z);
    pivot.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8), M.dog, 0, -0.12, 0));
    g.add(pivot);
    legs.push(pivot);
  }
  const tail = new THREE.Group();
  tail.position.set(-0.28, 0.4, 0);
  const t = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.22, 8), M.dog, 0, 0.1, 0);
  tail.add(t);
  tail.rotation.z = 0.6;
  g.add(tail);
  g.userData = { legs, tail };
  g.scale.setScalar(1.4);
  return g;
}

function person() {
  mats();
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.add(mesh(new THREE.CapsuleGeometry(0.1, 0.22, 6, 12), M.shirt, 0, 0.42, 0));
  body.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), M.skin, 0, 0.7, 0));
  for (const s of [-1, 1]) {
    body.add(mesh(new THREE.CapsuleGeometry(0.04, 0.22, 4, 8), M.jeans, 0, 0.16, s * 0.06));
    const arm = mesh(new THREE.CapsuleGeometry(0.03, 0.2, 4, 8), M.shirt, 0, 0.45, s * 0.14);
    arm.rotation.x = s * 0.5;
    body.add(arm);
  }
  g.add(body);
  g.userData.body = body;
  g.scale.setScalar(1.3);
  return g;
}

function windmill() {
  mats();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.62, 1.7, 8), M.brick, 0, 0.85, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.08, 8), M.white, 0, 0.62, 0));
  g.add(mesh(new THREE.ConeGeometry(0.52, 0.55, 8), M.wood, 0, 1.97, 0));
  g.add(mesh(new RoundedBoxGeometry(0.22, 0.34, 0.04, 1, 0.02), M.wood, 0, 0.17, 0.6));
  const hub = new THREE.Group();
  hub.position.set(0, 1.62, 0.5);
  hub.add(mesh(new THREE.SphereGeometry(0.08, 12, 8), M.wood));
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;
    arm.add(mesh(new THREE.BoxGeometry(0.05, 1.35, 0.03), M.wood, 0, 0.68, 0));
    arm.add(mesh(new THREE.BoxGeometry(0.26, 1.0, 0.015), M.sail, 0.15, 0.78, 0.01));
    hub.add(arm);
  }
  g.add(hub);
  g.userData.hub = hub;
  return g;
}

function judge() {
  mats();
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(0.3, 0.85, 16), M.robe, 0, 0.43, 0));
  g.add(mesh(new THREE.SphereGeometry(0.15, 16, 12), M.skin, 0, 0.98, 0));
  // Curly barrister's wig: a crown of small white balls and two side rolls.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), M.wig, Math.cos(a) * 0.12, 1.05 + Math.sin(a * 2) * 0.02, Math.sin(a) * 0.12 - 0.02));
  }
  g.add(mesh(new THREE.SphereGeometry(0.11, 12, 10), M.wig, 0, 1.12, -0.03));
  for (const s of [-1, 1]) {
    for (let j = 0; j < 3; j++) g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), M.wig, s * 0.16, 0.96 - j * 0.09, -0.04));
  }
  g.scale.setScalar(1.35);
  return g;
}

// ---------------------------------------------------------------- helpers

function sideOf(k) {
  // Props go on the audience side of the road, opposite the plaque.
  return -plaqueAt(k).side;
}

function beside(k, ds, lateral) {
  const f = MAIN.at(squareS(k) + ds);
  return { pos: f.p.clone().addScaledVector(f.normal, lateral), frame: f };
}

// Stand a prop beside square k, turned to the road. Its own rotation.x then
// tips it about the road direction: positive towards +normal.
function stand(obj, k, ds, lateral) {
  const { pos, frame } = beside(k, ds, lateral);
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = frame.heading;
  g.add(obj);
  return g;
}

async function popIn(stage, obj, seconds = 0.45) {
  stage.fx.add(obj);
  const base = obj.scale.x;
  await stage.task(stage.dur(seconds), (k) => {
    const e = Math.min(1, k * 1.6) * (1 + Math.sin(k * Math.PI) * 0.18);
    obj.scale.setScalar(Math.max(0.001, base * e));
  });
  obj.scale.setScalar(base);
}

const easeIn = (k) => k * k;
const easeOut = (k) => 1 - (1 - k) * (1 - k);

// ---------------------------------------------------------------- turn animations

// Car 1, square 1: zigzag, a traffic light, a tree, and a roll-over.
async function choque(stage, { car, fromS, sound }) {
  const k1 = 1;
  const s1 = squareS(k1);
  const side = sideOf(k1);
  const light = trafficLight(false);
  const lightStand = stand(light, k1, -0.75, side * 1.55);
  const t = tree(1.05);
  const treeStand = stand(t, k1, 0.75, side * 1.7);
  await Promise.all([popIn(stage, lightStand), popIn(stage, treeStand)]);

  const sA = s1 - 1.5;
  await stage.drive(car, fromS, sA, {
    seconds: 2.4,
    shape: (k) => ({ lateral: Math.sin(k * Math.PI * 5) * 0.5 * k, yaw: Math.cos(k * Math.PI * 5) * 0.45 * k }),
  });
  // Into the traffic light, which falls away from the road.
  await stage.task(stage.dur(0.32), (k) => stage.pose(car, MAIN.at(sA + 0.75 * k), { lateral: side * 0.95 * easeIn(k), yaw: side * 0.5 * k }));
  sound.crash();
  const fall = stage.task(stage.dur(0.6), (k) => {
    light.rotation.x = side * easeIn(k) * 1.35;
  });
  stage.burst(stage.pieces[car].position.clone());
  // Bounce into the tree.
  await stage.task(stage.dur(0.4), (k) => stage.pose(car, MAIN.at(sA + 0.75 + 1.05 * easeOut(k)), { lateral: side * (0.95 + 0.15 * Math.sin(k * Math.PI)), yaw: side * (0.5 - 0.9 * k) }));
  sound.thud();
  stage.task(stage.dur(0.8), (k) => {
    t.rotation.x = Math.sin(k * 30) * 0.12 * (1 - k);
  });
  // Roll over and land back on the square.
  const sB = sA + 1.8;
  await stage.task(stage.dur(1.0), (k) => {
    const e = easeInOut(k);
    stage.pose(car, MAIN.at(sB + (s1 - sB) * e), { lateral: side * 0.95 * (1 - e), yaw: side * -0.4 * (1 - e), roll: side * e * Math.PI * 2, lift: Math.sin(k * Math.PI) * 0.9 });
  });
  stage.place(car, MAIN, s1);
  await fall;
  await stage.jolt(car, 0.6, 0.4);
}

// Car 2, square 2: stopped at a red light, car 1 hits it from behind.
async function alcance(stage, { car, fromS, sound }) {
  const k2 = 2;
  const s2 = squareS(k2);
  popIn(stage, stand(trafficLight(true), k2, 0.95, sideOf(k2) * 1.55));
  await stage.drive(car, fromS, s2);
  await stage.wait(0.4);
  const hitter = 0;
  const s1 = stage.at[hitter].s;
  const contact = s2 - CAR_GAP * 0.78;
  sound.horn();
  await stage.drive(hitter, s1, contact, { seconds: 0.75, ease: easeIn, hop: false });
  sound.crash();
  stage.burst(MAIN.at((contact + s2) / 2).p);
  await Promise.all([
    stage.task(stage.dur(0.45), (k) => stage.pose(car, MAIN.at(s2 + Math.sin(k * Math.PI) * 0.4))),
    stage.jolt(car, 1.2, 0.6),
    stage.jolt(hitter, 0.8, 0.5),
  ]);
  await stage.wait(0.3);
  await stage.drive(hitter, contact, s1, { seconds: 1.0, hop: false });
  stage.place(car, MAIN, s2);
}

// Car 2, square 6: a dog runs across, the car brakes hard, the dog trots off.
async function perro(stage, { car, fromS, sound }) {
  const k6 = 6;
  const s6 = squareS(k6);
  const side = sideOf(k6);
  const d = dog();
  const startLat = -side * 2.4;
  const cross = s6 + 1.05;
  const place = (lat, yaw) => {
    const f = MAIN.at(cross);
    d.position.copy(f.p).addScaledVector(f.normal, lat);
    d.rotation.y = f.heading + yaw;
  };
  const run = (k, speed = 26) => {
    d.userData.legs.forEach((leg, i) => (leg.rotation.z = Math.sin(k * speed + i * Math.PI) * 0.7));
    d.userData.tail.rotation.x = Math.sin(k * 40) * 0.6;
  };
  place(startLat, side * Math.PI * 0.5);
  const sBrake = s6 - 1.9;
  const drive = stage.drive(car, fromS, sBrake, { seconds: 2.0, ease: easeIn });
  await stage.wait(1.1);
  stage.fx.add(d);
  sound.bark();
  const dash = stage.task(stage.dur(1.3), (k) => {
    place(startLat + (side * 2.4 - startLat) * k, -side * Math.PI * 0.5);
    run(k);
  });
  await drive;
  sound.brake();
  await stage.task(stage.dur(0.55), (k) => {
    const e = easeOut(k);
    stage.pose(car, MAIN.at(sBrake + (s6 - sBrake) * e), { pitch: -Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.22 });
  });
  stage.place(car, MAIN, s6);
  await dash;
  sound.bark();
  // Happy trot along the verge, then gone.
  await stage.task(stage.dur(1.6), (k) => {
    const f = MAIN.at(cross + k * 3.2);
    d.position.copy(f.p).addScaledVector(f.normal, side * 2.4);
    d.rotation.y = f.heading;
    run(k * 2, 18);
    d.scale.setScalar(1.4 * (k > 0.75 ? Math.max(0.001, (1 - k) * 4) : 1));
  });
  stage.fx.remove(d);
}

// Car 2, square 10: orange alert, rain, lightning and a tree falling on the roof.
async function tormenta(stage, { car, fromS, sound, ui }) {
  const k10 = 10;
  const s10 = squareS(k10);
  const side = sideOf(k10);
  ui.storm(true);
  sound.rain(true);
  await stage.dim(0.3, 0.9);
  const flash = async () => {
    ui.lightning();
    sound.thunder();
    const lvl = stage.dimLevel;
    stage.setDim(1.6);
    await stage.wait(0.08);
    stage.setDim(lvl);
  };
  const t = tree(1.6);
  popIn(stage, stand(t, k10, 0.15, side * 2.05), 0.35);
  flash();
  const drive = stage.drive(car, fromS, s10, { seconds: 2.6 });
  await stage.wait(1.3);
  flash();
  await drive;
  await stage.wait(0.25);
  // Falls across the road, crown on the roof.
  await stage.task(stage.dur(0.55), (k) => {
    t.rotation.x = -side * 1.32 * easeIn(k);
  });
  flash();
  sound.thud();
  stage.shake = 0.8;
  const v = stage.pieces[car].userData.vehicle;
  await stage.task(stage.dur(0.35), (k) => v.scale.set(1, 1 - Math.sin(k * Math.PI * 0.5) * 0.25, 1));
  await stage.wait(0.6);
  await stage.dim(1, 0.8);
  ui.storm(false);
  sound.rain(false);
}

// Car 2, square 14: the passenger jumps out of the moving car.
async function salto(stage, { car, fromS, sound, ui }) {
  const k14 = 14;
  const s14 = squareS(k14);
  const side = sideOf(k14);
  const p = person();
  const seconds = 3.0;
  const drive = stage.drive(car, fromS, s14, { seconds });
  await stage.wait(1.25);
  ui.bubble('salto', () => stage.pieceTop(car), 1.9);
  sound.horn();
  await stage.wait(0.25);
  // Halfway through the drive (the ease is symmetric): out the door.
  const jumpS = (fromS + s14) / 2;
  stage.fx.add(p);
  await stage.task(stage.dur(0.75), (k) => {
    const f = MAIN.at(jumpS + k * 0.8);
    p.position.copy(f.p).addScaledVector(f.normal, side * (0.4 + 1.9 * easeOut(k)));
    p.position.y = Math.sin(k * Math.PI) * 0.8;
    p.rotation.y = f.heading;
    p.rotation.x = side * k * Math.PI * 1.5;
  });
  sound.thud();
  await stage.task(stage.dur(0.4), (k) => {
    p.rotation.x = side * (Math.PI * 1.5 + k * Math.PI * 0.5);
  });
  await drive;
}

// Car 3, square 11: a windmill and an English-speaking judge in a wig.
async function amsterdam(stage, { car, fromS, sound, ui }) {
  const k11 = 11;
  const s11 = squareS(k11);
  const side = sideOf(k11);
  await stage.drive(car, fromS, s11);
  const w = windmill();
  const wp = beside(k11, 0.6, -side * 2.8);
  w.position.copy(wp.pos);
  w.rotation.y = Math.atan2(stage.camera.position.x - wp.pos.x, stage.camera.position.z - wp.pos.z);
  const j = judge();
  const jp = beside(k11, -1.0, -side * 1.6);
  j.position.copy(jp.pos);
  j.rotation.y = Math.atan2(stage.camera.position.x - jp.pos.x, stage.camera.position.z - jp.pos.z);
  sound.pop();
  await popIn(stage, w, 0.6);
  stage.frameHooks.add((dt) => (w.userData.hub.rotation.z += dt * 1.4));
  sound.pop();
  await popIn(stage, j, 0.45);
  sound.knock();
  ui.bubble('juez', () => j.position.clone().add(new THREE.Vector3(0, 2.0, 0)), 3.2);
  await stage.wait(3.2);
}

function plain(stage, { car, fromS, toS }) {
  return stage.drive(car, fromS, toS);
}

export const TURN_FX = { choque, alcance, perro, tormenta, salto, amsterdam };

export function playMove(stage, anim, ctx) {
  return (TURN_FX[anim] || plain)(stage, ctx);
}

// ---------------------------------------------------------------- fork

const FORK_STOP = 4.6;

// Negotiating: the convoy drives into the barrier, a sign says no, and every
// car backs up to the fork.
export async function forkNegociar(stage, { sound, ui }) {
  const route = forkRoute('negociar');
  const from = [0, 1, 2, 3].map(forkSlot);
  const front = ENTRY.length + BARRIER_S - 0.8;
  const to = from.map((_, c) => front - c * CAR_GAP);
  await stage.convoy(route, from, to, { seconds: 2.4, ease: easeIn });
  sound.crash();
  stage.burst(route.at(front + 0.5).p, 0.8);
  await Promise.all([0, 1, 2, 3].map((c) => stage.jolt(c, c ? 0.5 : 1.1, 0.5)));
  await ui.adhesion();
  sound.reverse();
  await stage.convoy(route, to, from, { seconds: 2.6 });
  for (let c = 0; c < 4; c++) stage.at[c] = { path: ENTRY, s: from[c] };
}

// Reading: the cars stop under the gantry while the terms scroll by, then go on.
export async function forkLeer(stage, { ui }) {
  const route = forkRoute('leer');
  const from = [0, 1, 2, 3].map(forkSlot);
  const mid = from.map((_, c) => ENTRY.length + FORK_STOP - c * CAR_GAP);
  await stage.convoy(route, from, mid, { seconds: 2.0 });
  await ui.terms();
  const end = from.map((_, c) => route.offsetOf(MAIN) + queueSlot(c));
  await stage.convoy(route, mid, end, { seconds: 3.0 });
  for (let c = 0; c < 4; c++) stage.at[c] = { path: MAIN, s: queueSlot(c) };
}

export async function forkAceptar(stage) {
  const route = forkRoute('aceptar');
  const from = [0, 1, 2, 3].map(forkSlot);
  const end = from.map((_, c) => route.offsetOf(MAIN) + queueSlot(c));
  await stage.convoy(route, from, end, { seconds: 3.6 });
  for (let c = 0; c < 4; c++) stage.at[c] = { path: MAIN, s: queueSlot(c) };
}
