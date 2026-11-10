import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CARS } from '../engine/flow.js';
import { BARRIER_S, CAR_GAP, ENTRY, INICIO_S, LANES, MAIN, SQUARE_STEP, boardHalf, forkRoute, forkSlot, freeSide, verge } from './layout.js';
import { easeInOut } from './stage.js';

// Animations played on the board before a card opens, and the props they use.
// Each one moves the car to its square itself, so it can zigzag, brake or crash
// on the way. `lane` is the car's way for this move, stepping round the cars
// parked on the single road. Props stay on the board until the next turn starts.

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
    hole: new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.95 }),
    rim: new THREE.MeshStandardMaterial({ color: '#4a4c52', roughness: 0.9 }),
    dog: plastic('#C98A4B', { roughness: 0.5 }),
    dogDark: plastic('#6B4426', { roughness: 0.5 }),
    skin: plastic('#E9B48F', { roughness: 0.55, clearcoat: 0.2 }),
    bump: plastic('#E2564A', { roughness: 0.4 }),
    shirt: plastic('#2D8FD5'),
    jeans: plastic('#2B3A67'),
    robe: plastic('#1B1C22', { roughness: 0.5 }),
    wig: plastic('#F4F1EA', { roughness: 0.6, clearcoat: 0.2 }),
    brick: plastic('#B65A3A', { roughness: 0.5 }),
    white: plastic('#F6F3EC', { roughness: 0.3 }),
    wing: plastic('#E9EEF5', { roughness: 0.3, clearcoat: 0.8 }),
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

// A leafy branch, lying along local x.
function branch() {
  mats();
  const g = new THREE.Group();
  const stick = mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.95, 8), M.trunk);
  stick.rotation.z = Math.PI / 2;
  g.add(stick);
  const twig = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 6), M.trunk, 0.15, 0.08, 0.1);
  twig.rotation.set(0.6, 0, 1.0);
  g.add(twig);
  for (const [x, y, z, r] of [[0.42, 0.05, 0, 0.2], [0.25, 0.1, 0.12, 0.16], [0.05, 0.08, -0.1, 0.14], [0.3, 0.02, -0.12, 0.13]]) {
    g.add(mesh(new THREE.SphereGeometry(r, 12, 10), x > 0.3 ? M.leaf : M.leaf2, x, y, z));
  }
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
  g.rotation.order = 'YXZ';
  const body = new THREE.Group();
  body.add(mesh(new THREE.CapsuleGeometry(0.1, 0.22, 6, 12), M.shirt, 0, 0.42, 0));
  body.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), M.skin, 0, 0.7, 0));
  for (const s of [-1, 1]) {
    body.add(mesh(new THREE.CapsuleGeometry(0.04, 0.22, 4, 8), M.jeans, 0, 0.16, s * 0.06));
    const arm = mesh(new THREE.CapsuleGeometry(0.03, 0.2, 4, 8), M.shirt, 0, 0.45, s * 0.14);
    arm.rotation.x = s * 0.5;
    body.add(arm);
  }
  // Rolls about its own middle.
  body.position.y = -0.4;
  const pivot = new THREE.Group();
  pivot.position.y = 0.4;
  pivot.add(body);
  g.add(pivot);
  g.userData.pivot = pivot;
  g.scale.setScalar(1.2);
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

function pothole() {
  mats();
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), M.rim);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.046;
  rim.receiveShadow = true;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.33, 28), M.hole);
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.048;
  g.add(rim, hole);
  g.scale.set(1.25, 1, 0.8);
  return g;
}

// Two swept wings and a tail fin, in the vehicle's frame (nose along +x).
function wings() {
  mats();
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0.12, 0);
    shape.lineTo(-0.12, 0);
    shape.lineTo(-0.3, 0.7);
    shape.lineTo(-0.12, 0.7);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
    geo.rotateX(s * (Math.PI / 2));
    const w = mesh(geo, M.wing, 0, 0.27, s * 0.18);
    g.add(w);
  }
  const fin = new THREE.Shape();
  fin.moveTo(0, 0);
  fin.lineTo(-0.2, 0);
  fin.lineTo(-0.26, 0.28);
  fin.lineTo(-0.16, 0.28);
  fin.closePath();
  g.add(mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.025, bevelEnabled: false }), M.wing, -0.22, 0.45, -0.012));
  return g;
}

// ---------------------------------------------------------------- helpers

// Stand a prop beside the road, turned to it. Its own rotation.x then tips it
// about the road direction: positive towards +normal.
function stand(obj, s, side, extra) {
  const { pos, frame } = verge(s, side, extra);
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = frame.heading;
  g.add(obj);
  return g;
}

// Face the camera from wherever it is.
function faceCamera(stage, obj) {
  obj.rotation.y = Math.atan2(stage.camera.position.x - obj.position.x, stage.camera.position.z - obj.position.z);
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
const smooth = (k) => {
  const x = Math.min(1, Math.max(0, k));
  return x * x * (3 - 2 * x);
};

// Height of the roof of a game car, in the vehicle's own frame.
const ROOF = 0.5;

// ---------------------------------------------------------------- turn animations

// Car 1, El viaje: the passenger sleeps, the car zigzags, hits a traffic light
// and a tree, and rolls over.
async function choque(stage, { car, fromS, toS, lane, sound, ui }) {
  const side = freeSide(toS);
  const light = trafficLight(false);
  const lightStand = stand(light, toS - 0.75, side, 0.55);
  const t = tree(1.05);
  const treeStand = stand(t, toS + 0.75, side, 0.7);
  ui.bubble('zzz', () => stage.pieceTop(car), 3.4);
  await Promise.all([popIn(stage, lightStand), popIn(stage, treeStand)]);

  const sA = toS - 1.5;
  await stage.drive(car, fromS, sA, {
    path: lane,
    seconds: 2.4,
    shape: (k) => ({ lateral: Math.sin(k * Math.PI * 5) * 0.45 * k, yaw: Math.cos(k * Math.PI * 5) * 0.45 * k }),
  });
  // Off the road into the traffic light, which falls away from it.
  const hit = side * (boardHalf(toS) + 0.1);
  await stage.task(stage.dur(0.32), (k) => stage.pose(car, lane.at(sA + 0.75 * k), { lateral: hit * easeIn(k), yaw: side * 0.5 * k }));
  sound.crash();
  const fall = stage.task(stage.dur(0.6), (k) => {
    light.rotation.x = side * easeIn(k) * 1.35;
  });
  stage.burst(stage.pieces[car].position.clone());
  // Bounce into the tree.
  await stage.task(stage.dur(0.4), (k) => stage.pose(car, lane.at(sA + 0.75 + 1.05 * easeOut(k)), { lateral: hit + side * 0.15 * Math.sin(k * Math.PI), yaw: side * (0.5 - 0.9 * k) }));
  sound.thud();
  stage.task(stage.dur(0.8), (k) => {
    t.rotation.x = Math.sin(k * 30) * 0.12 * (1 - k);
  });
  // Roll over and land back on the square.
  const sB = sA + 1.8;
  await stage.task(stage.dur(1.0), (k) => {
    const e = easeInOut(k);
    stage.pose(car, lane.at(sB + (toS - sB) * e), { lateral: hit * (1 - e), yaw: side * -0.4 * (1 - e), roll: -side * e * Math.PI * 2, lift: Math.sin(k * Math.PI) * 0.9 });
  });
  stage.place(car, LANES[car], toS);
  await fall;
  await stage.jolt(car, 0.6, 0.4);
}

// Car 2, Me chocaron de atrás: stopped at a red light, right in front of car 1,
// which drives on and hits it from behind, then backs up to its square.
async function alcance(stage, { car, fromS, toS, lane, sound }) {
  const hitter = 0;
  popIn(stage, stand(trafficLight(true), toS + 1.0, freeSide(toS + 1.0), 0.5));
  await stage.drive(car, fromS, toS, { path: lane });
  stage.place(car, LANES[car], toS);
  await stage.wait(0.4);
  const from = stage.at[hitter].s;
  const contact = toS - CAR_GAP * 0.8;
  sound.horn();
  await stage.drive(hitter, from, contact, { path: LANES[hitter], seconds: 0.95, ease: easeIn });
  sound.crash();
  stage.burst(MAIN.at((contact + toS) / 2).p);
  await Promise.all([
    stage.task(stage.dur(0.45), (k) => stage.pose(car, LANES[car].at(toS + Math.sin(k * Math.PI) * 0.4))),
    stage.jolt(car, 1.2, 0.6),
    stage.task(stage.dur(0.5), (k) => stage.pose(hitter, LANES[hitter].at(contact - Math.sin(k * Math.PI) * 0.25))),
  ]);
  await stage.wait(0.35);
  sound.reverse();
  await stage.drive(hitter, contact, from, { path: LANES[hitter], seconds: 1.3 });
  stage.place(hitter, LANES[hitter], from);
  stage.place(car, LANES[car], toS);
}

// The clearest stretch of a drive: the point between fromS + lead and
// toS - tail farthest from every parked car.
function clearSpot(fromS, toS, parked, lead, tail) {
  let best = (fromS + toS) / 2;
  let room = -Infinity;
  for (let s = fromS + lead; s <= toS - tail; s += 0.1) {
    const d = Math.min(...parked.map((p) => Math.abs(p - s)), s - fromS, toS - s);
    if (d > room) {
      room = d;
      best = s;
    }
  }
  return best;
}

// Car 2, El perro y la tormenta: a dog runs across a clear stretch and the car
// brakes hard; then the orange alert, rain, and a branch falls on the roof.
async function perroTormenta(stage, { car, fromS, toS, lane, sound, ui }) {
  const cross = clearSpot(fromS, toS, lane.passing, 3.4, 3.4);
  const mid = cross - 1.0;
  const side = freeSide(cross);
  const d = dog();
  const reach = boardHalf(cross) + 1.2;
  const placeDog = (lat, yaw) => {
    const f = MAIN.at(cross);
    d.position.copy(f.p).addScaledVector(f.normal, lat);
    d.rotation.y = f.heading + yaw;
  };
  const run = (k, speed = 26) => {
    d.userData.legs.forEach((leg, i) => (leg.rotation.z = Math.sin(k * speed + i * Math.PI) * 0.7));
    d.userData.tail.rotation.x = Math.sin(k * 40) * 0.6;
  };
  placeDog(side * reach, -side * Math.PI * 0.5);
  const sBrake = mid - 1.4;
  const drive = stage.drive(car, fromS, sBrake, { path: lane, seconds: 1.8, ease: easeIn });
  await stage.wait(0.9);
  stage.fx.add(d);
  sound.bark();
  const dash = stage.task(stage.dur(1.4), (k) => {
    placeDog(side * reach * (1 - 2 * k), -side * Math.PI * 0.5);
    run(k);
  });
  await drive;
  sound.brake();
  // Hard stop: the car dips forward, the passenger with it.
  await stage.task(stage.dur(0.55), (k) => {
    stage.pose(car, lane.at(sBrake + (mid - sBrake) * easeOut(k)), { pitch: -Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.26 });
  });
  stage.at[car] = { path: lane, s: mid };
  await dash;
  sound.bark();
  await stage.task(stage.dur(0.8), (k) => {
    d.scale.setScalar(1.4 * Math.max(0.001, 1 - k));
    run(k * 2, 18);
  });
  stage.fx.remove(d);
  await stage.wait(0.3);

  // The storm.
  ui.storm(true);
  sound.rain(true);
  await stage.dim(0.3, 0.8);
  const flash = async () => {
    ui.lightning();
    sound.thunder();
    const lvl = stage.dimLevel;
    stage.setDim(1.6);
    await stage.wait(0.08);
    stage.setDim(lvl);
  };
  const t = tree(1.6);
  popIn(stage, stand(t, toS + 0.2, freeSide(toS + 0.2), 1.0), 0.35);
  flash();
  const go = stage.drive(car, mid, toS, { path: lane, seconds: 1.6 + (toS - mid) * 0.09 });
  await stage.wait(1.2);
  flash();
  await go;
  stage.place(car, LANES[car], toS);
  // The tree shakes and a branch drops onto the roof.
  stage.task(stage.dur(0.7), (k) => {
    t.rotation.x = Math.sin(k * 26) * 0.1 * (1 - k);
  });
  const b = stage.attach(car, branch());
  b.rotation.y = 0.5;
  await stage.task(stage.dur(0.55), (k) => {
    b.position.set(0, ROOF + 2.6 * (1 - easeIn(k)), 0);
    b.rotation.z = (1 - k) * 1.4;
  });
  flash();
  sound.thud();
  stage.shake = 0.8;
  const v = stage.pieces[car].userData.vehicle;
  await stage.task(stage.dur(0.35), (k) => v.scale.set(1, 1 - Math.sin(k * Math.PI * 0.5) * 0.18, 1));
  await stage.wait(0.6);
  await stage.dim(1, 0.8);
  ui.storm(false);
  sound.rain(false);
}

// Car 2, Me bajo acá: late for the exam, the passenger jumps out of the moving
// car and rolls over the grass.
async function salto(stage, { car, fromS, toS, lane, sound, ui, casilla }) {
  const p = person();
  ui.bubble('tarde', () => stage.pieceTop(car), 2.1, casilla.reloj);
  await stage.wait(1.6);
  const seconds = 3.6;
  const drive = stage.drive(car, fromS, toS, { path: lane, seconds });
  await stage.wait(1.0);
  ui.bubble('salto', () => stage.pieceTop(car), 1.9);
  sound.horn();
  await stage.wait(0.35);
  // Where the car is now along its drive.
  const s0 = fromS + (toS - fromS) * easeInOut(1.35 / seconds);
  const side = freeSide(s0 + 1.2);
  const at = (s) => MAIN.at(s);
  const lat0 = lane.lateral(s0);
  const lat1 = side * (boardHalf(s0) + 1.1);
  stage.fx.add(p);
  // Out of the door and through the air, sideways off the road.
  await stage.task(stage.dur(0.7), (k) => {
    const f = at(s0 + k * 0.9);
    p.position.copy(f.p).addScaledVector(f.normal, lat0 + (lat1 - lat0) * easeOut(k));
    p.position.y = Math.sin(k * Math.PI) * 0.9;
    p.rotation.y = f.heading;
    p.userData.pivot.rotation.x = side * k * Math.PI;
  });
  sound.thud();
  // Rolling over the grass.
  await stage.task(stage.dur(0.9), (k) => {
    const f = at(s0 + 0.9 + k * 0.6);
    p.position.copy(f.p).addScaledVector(f.normal, lat1 + side * 0.9 * easeOut(k));
    p.position.y = 0;
    p.rotation.y = f.heading;
    p.userData.pivot.rotation.x = side * (Math.PI + easeOut(k) * Math.PI * 3);
  });
  p.userData.pivot.rotation.x = side * Math.PI * 0.5;
  await drive;
  stage.place(car, LANES[car], toS);
}

// Car 3, El pozo: a pothole, a jump, "¡AY!" and a bump on the roof.
async function pozo(stage, { car, fromS, toS, lane, sound, ui }) {
  const holeS = toS - SQUARE_STEP / 2;
  const hole = pothole();
  const f = lane.at(holeS);
  hole.position.set(f.p.x, 0, f.p.z);
  hole.rotation.y = f.heading;
  await popIn(stage, hole, 0.35);
  let hit = false;
  await stage.drive(car, fromS, toS, {
    path: lane,
    seconds: 2.6,
    shape: (k, s) => {
      const d = s - holeS;
      if (!hit && d > -0.1) {
        hit = true;
        sound.thud();
        stage.shake = 0.5;
      }
      const lift = d > -0.1 && d < 1.3 ? Math.sin(((d + 0.1) / 1.4) * Math.PI) * 0.75 : 0;
      return { lift, pitch: d > -0.1 && d < 0.5 ? -0.2 : 0 };
    },
  });
  stage.place(car, LANES[car], toS);
  ui.bubble('ay', () => stage.pieceTop(car), 2.4);
  sound.knock();
  const bump = stage.attach(car, mesh(new THREE.SphereGeometry(0.11, 16, 12), M.bump, -0.05, ROOF - 0.03, 0));
  await Promise.all([
    stage.jolt(car, 0.8, 0.5),
    stage.task(stage.dur(0.6), (k) => bump.scale.setScalar(Math.max(0.001, easeOut(k) * (1 + Math.sin(k * Math.PI) * 0.4)))),
  ]);
  await stage.wait(0.8);
}

// Car 3, Ámsterdam: the car grows wings, takes off over the cars ahead, flies
// and lands on its square; then two windmills and an English-speaking judge.
async function amsterdam(stage, { car, fromS, toS, lane, sound, ui }) {
  const side = freeSide(toS);
  const w = stage.attach(car, wings());
  sound.whoosh();
  await stage.task(stage.dur(0.4), (k) => w.scale.set(1, 1, Math.max(0.001, easeOut(k))));
  const len = toS - fromS;
  const up = fromS + Math.min(len * 0.2, 3.5);
  const climb = Math.min(len * 0.15, 4.5);
  const landLen = SQUARE_STEP * 0.55;
  const down = toS - landLen - 0.7;
  await stage.drive(car, fromS, toS, {
    path: lane,
    seconds: 3.8,
    ease: (k) => k,
    shape: (k, s) => {
      const c = smooth((s - up) / climb);
      const land = smooth((s - down) / landLen);
      const lift = 2.4 * c * (1 - land);
      const pitch = (s > up && s < up + climb ? 0.3 : 0) + (s > down && s < down + landLen ? -0.18 : 0);
      return { lift: lift + Math.sin(k * 20) * 0.04 * c * (1 - land), pitch };
    },
  });
  sound.thud();
  await stage.task(stage.dur(0.3), (k) => w.scale.set(1, 1, Math.max(0.001, 1 - k)));
  stage.pieces[car].userData.vehicle.remove(w);
  stage.place(car, LANES[car], toS);

  const mills = [
    [toS + 0.9, 1.7],
    [toS - 1.6, 2.9],
  ].map(([s, extra]) => {
    const m = windmill();
    m.position.copy(verge(s, side, extra).pos);
    faceCamera(stage, m);
    return m;
  });
  const j = judge();
  j.position.copy(verge(toS - 0.2, side, 0.6).pos);
  faceCamera(stage, j);
  for (const m of mills) {
    sound.pop();
    await popIn(stage, m, 0.5);
    stage.frameHooks.add((dt) => (m.userData.hub.rotation.z += dt * 1.4));
  }
  sound.pop();
  await popIn(stage, j, 0.45);
  sound.knock();
  ui.bubble('juez', () => j.position.clone().add(new THREE.Vector3(0, 2.0, 0)), 3.2);
  await stage.wait(3.2);
}

// The judge's gavel over the board after a plain drive.
async function martillo(stage, ctx) {
  await plain(stage, ctx);
  await ctx.ui.gavel();
}

async function plain(stage, { car, fromS, toS, lane }) {
  await stage.drive(car, fromS, toS, { path: lane });
  stage.place(car, LANES[car], toS);
}

export const TURN_FX = { choque, alcance, perroTormenta, salto, pozo, amsterdam, martillo };

export function playMove(stage, anim, ctx) {
  return (TURN_FX[anim] || plain)(stage, ctx);
}

// ---------------------------------------------------------------- fork

const FORK_STOP = 4.6;

// The cars still waiting move up one place in the queue.
async function moveUp(stage, car) {
  const rest = [];
  for (let c = car + 1; c < CARS; c++) rest.push(c);
  if (!rest.length) return;
  await stage.wait(0.6);
  await stage.convoy(
    ENTRY,
    rest,
    rest.map((c) => forkSlot(c - car)),
    rest.map((c) => forkSlot(c - car - 1)),
    { seconds: 1.2 },
  );
  for (const c of rest) stage.at[c] = { path: ENTRY, s: forkSlot(c - car - 1) };
}

// Negotiating: the car drives into the barrier, a sign says no, and it backs
// up to the fork to choose again.
export async function forkNegociar(stage, { car, sound, ui }) {
  const route = forkRoute('negociar');
  const from = forkSlot(0);
  const front = ENTRY.length + BARRIER_S - 0.8;
  await stage.convoy(route, [car], [from], [front], { seconds: 2.0, ease: easeIn });
  sound.crash();
  stage.burst(route.at(front + 0.5).p, 0.8);
  await stage.jolt(car, 1.1, 0.5);
  await ui.adhesion();
  sound.reverse();
  await stage.convoy(route, [car], [front], [from], { seconds: 2.2 });
  stage.at[car] = { path: ENTRY, s: from };
}

// Reading: the car stops under the gantry while the terms scroll by, then goes on.
export async function forkLeer(stage, { car, ui }) {
  const route = forkRoute('leer', car);
  const from = forkSlot(0);
  const mid = ENTRY.length + FORK_STOP;
  const queue = moveUp(stage, car);
  await stage.convoy(route, [car], [from], [mid], { seconds: 1.8 });
  await Promise.all([ui.terms(), queue]);
  await stage.convoy(route, [car], [mid], [route.offsetOf(LANES[car]) + INICIO_S], { seconds: 2.6 });
  stage.at[car] = { path: LANES[car], s: INICIO_S };
}

export async function forkAceptar(stage, { car }) {
  const route = forkRoute('aceptar', car);
  const queue = moveUp(stage, car);
  await stage.convoy(route, [car], [forkSlot(0)], [route.offsetOf(LANES[car]) + INICIO_S], { seconds: 3.2 });
  await queue;
  stage.at[car] = { path: LANES[car], s: INICIO_S };
}
