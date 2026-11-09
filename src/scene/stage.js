import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import studioHdr from '../assets/studio.hdr';
import { AUTOS, AUTO_VUELTA, TITULO } from '../content/guion.js';
import { CARS, activeCar, carPlaces, lapPlace, spinShown, world } from '../engine/flow.js';
import { buildBoard, PIECE_Y } from './board.js';
import { LAP, lapS } from './lap.js';
import { BOARD, DESTINO_S, ENTRY, INICIO_S, LANES, SPINNER_POS, forkSlot, squareS } from './layout.js';
import { UBA } from './palette.js';
import { Post } from './post.js';
import { Spinner } from './spinner.js';
import { buildPiece } from './vehicles.js';
import { GpuTimer } from './gpu-timer.js';

// About 45 fps of headroom; the CPU side of a frame is only a few milliseconds.
const GPU_BUDGET_MS = 22;

const QUALITY = {
  // Below the screen's native ratio the board is upscaled and looks out of focus on Retina.
  alto: { pixelRatio: 2, shadow: 4096, shadows: true, post: { ao: true, aoSamples: 12 } },
  medio: { pixelRatio: 1.5, shadow: 2048, shadows: true, post: { ao: true, aoSamples: 8 } },
  bajo: { pixelRatio: 1, shadow: 1024, shadows: false, post: null },
};

// Game pieces are a little smaller so four fit side by side; the lap car, alone
// on its road, is bigger.
export const PIECE_SCALE = 1.05;
export const LAP_SCALE = 1.3;
// Index of the lap car in `pieces`, after the four game cars.
export const LAP_CAR = CARS;

const VIEWS = {
  overview: { pos: [0, 44.5, 35.5], look: [0, -1.5, 2.6] },
  intro: { pos: [-34, 9, 40], look: [0, 0, 0] },
  spinner: { pos: [SPINNER_POS.x, 10.5, SPINNER_POS.z + 9.5], look: [SPINNER_POS.x, 0.4, SPINNER_POS.z - 0.3] },
  salida: { pos: [-15.5, 13, 25], look: [-16.5, 0, 9.5] },
  fork: { pos: [-11, 21, 25], look: [-15.8, 0, 6.2] },
  // Steep enough to see the dead end over the gantry.
  barrier: { pos: [-15.5, 22, 12.5], look: [-19, 0, 3.2] },
  meta: { pos: [-11.5, 11, -0.5], look: [-14.4, 0.6, -11.6] },
  casa: { pos: [-5, 16, 19], look: [-6, 0, 5.2] },
};

const damp = (k, dt) => 1 - Math.exp(-k * dt);
export const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export class Stage {
  constructor(container, { quality = 'alto', title = TITULO, onSpinTick } = {}) {
    this.container = container;
    this.q = QUALITY[quality] || QUALITY.alto;
    this.title = title;
    this.onSpinTick = onSpinTick;
    this.speed = 1;
    this.fast = false;
    this.pieces = [];
    this.at = [];
    this.tasks = new Set();
    this.frameHooks = new Set();
    this.clock = new THREE.Clock();
    this.time = 0;
    this.activeIndex = null;
    this.shake = 0;
  }

  async init() {
    const r = new THREE.WebGLRenderer({ antialias: !this.q.post, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.pixelRatio));
    r.setSize(this.container.clientWidth, this.container.clientHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.shadowMap.enabled = this.q.shadows;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(r.domElement);
    this.renderer = r;
    this.gpu = GpuTimer.create(r);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a120c');
    scene.fog = new THREE.Fog('#1a120c', 70, 135);
    const pmrem = new THREE.PMREMGenerator(r);
    const hdr = await new RGBELoader().loadAsync(studioHdr);
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    pmrem.dispose();
    scene.environmentIntensity = 0.5;
    this.scene = scene;

    const hemi = new THREE.HemisphereLight('#fff4e0', '#3a2616', 0.42);
    const sun = new THREE.DirectionalLight('#ffe8c7', 2.3);
    sun.position.set(-16, 34, 18);
    sun.castShadow = this.q.shadows;
    sun.shadow.mapSize.set(this.q.shadow, this.q.shadow);
    const sc = sun.shadow.camera;
    sc.left = -30;
    sc.right = 30;
    sc.top = 24;
    sc.bottom = -24;
    sc.near = 5;
    sc.far = 90;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    const fill = new THREE.DirectionalLight('#bcd4ff', 0.55);
    fill.position.set(22, 18, -14);
    const spot = new THREE.SpotLight('#fff2d8', 70, 120, 0.55, 0.65, 1.4);
    spot.position.set(0, 46, 8);
    spot.target.position.set(0, 0, 0);
    scene.add(hemi, sun, fill, spot, spot.target);
    this.lights = [hemi, sun, fill, spot].map((l) => ({ l, base: l.intensity }));
    this.dimLevel = 1;

    this.camera = new THREE.PerspectiveCamera(34, this.container.clientWidth / this.container.clientHeight, 2, 300);
    this.camPos = new THREE.Vector3(...VIEWS.intro.pos);
    this.camLook = new THREE.Vector3(...VIEWS.intro.look);
    this.camera.position.copy(this.camPos);
    this.wantPos = this.camPos.clone();
    this.wantLook = this.camLook.clone();
    this.camRate = 1.1;

    const board = buildBoard(this.q === QUALITY.bajo ? 'bajo' : 'alto', this.title);
    scene.add(board.group);
    this.worlds = board.worlds;
    this.flag = board.flag;
    this.setBoardTitle = board.setTitle;
    this.frameHooks.add((dt, time) => this.flag.open > 0 && this.flag.wave(time));
    this.world = null;
    this.setWorld('vuelta');

    this.spinner = new Spinner(10, this.title);
    this.spinner.group.position.copy(SPINNER_POS);
    scene.add(this.spinner.group);

    // Transient props of the current animation (fallen tree, windmill...).
    this.fx = new THREE.Group();
    scene.add(this.fx);

    this.buildMarkers();
    this.buildPieces();
    if (this.q.post) this.post = new Post(r, scene, this.camera, this.q.post);

    window.addEventListener('resize', () => this.resize());
    this.loop();
  }

  setTitle(title) {
    this.title = title;
    this.setBoardTitle?.(title);
    this.spinner?.setTitle(title);
  }

  // Show the lap road or the game lanes.
  setWorld(name) {
    if (this.world === name) return;
    this.world = name;
    for (const [k, g] of Object.entries(this.worlds)) g.visible = k === name;
  }

  buildMarkers() {
    const gold = new THREE.MeshStandardMaterial({ color: UBA.gold, emissive: '#7a4f00', emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.25 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.06, 12, 64), gold);
    ring.rotation.x = Math.PI / 2;
    this.activeRing = ring;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.52, 24), gold);
    cone.rotation.x = Math.PI;
    cone.castShadow = true;
    this.activeArrow = cone;
    this.scene.add(ring, cone);

    const shardGeo = new THREE.TetrahedronGeometry(0.12);
    this.shards = new THREE.InstancedMesh(shardGeo, new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff8a00', emissiveIntensity: 0.8 }), 48);
    this.shards.visible = false;
    this.scene.add(this.shards);
  }

  buildPieces() {
    const add = (team, scale) => {
      const piece = buildPiece(team);
      piece.userData.scale = scale;
      piece.scale.setScalar(scale);
      piece.visible = false;
      piece.userData.index = this.pieces.length;
      this.pieces.push(piece);
      this.at.push(null);
      this.scene.add(piece);
    };
    for (const a of AUTOS) add({ id: a.vehiculo, color: a.color }, PIECE_SCALE);
    add({ id: AUTO_VUELTA.vehiculo, color: AUTO_VUELTA.color }, LAP_SCALE);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.post?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- placement

  // Path and arc length for a place from flow.carPlaces().
  spotOf(place, c) {
    switch (place.at) {
      case 'horquilla':
        return { path: ENTRY, s: forkSlot(place.slot) };
      case 'inicio':
        return { path: LANES[c], s: INICIO_S };
      case 'casilla':
        return { path: LANES[c], s: squareS(place.square) };
      case 'destino':
        return { path: LANES[c], s: DESTINO_S };
      default:
        return null;
    }
  }

  // Put car c on a frame of a path, with optional offsets for animations.
  pose(c, frame, { lateral = 0, lift = 0, yaw = 0, roll = 0, pitch = 0 } = {}) {
    const piece = this.pieces[c];
    piece.position.set(frame.p.x + frame.normal.x * lateral, PIECE_Y, frame.p.z + frame.normal.z * lateral);
    piece.rotation.y = frame.heading + yaw;
    const L = piece.userData.lift;
    L.position.y = lift;
    L.rotation.set(roll, 0, pitch);
  }

  place(c, path, s, opts) {
    this.at[c] = { path, s };
    this.pose(c, path.at(s), opts);
  }

  // Everything derived from the state, without animation.
  snap(state) {
    this.tidy();
    this.setWorld(world(state));
    carPlaces(state).forEach((place, c) => {
      const spot = this.spotOf(place, c);
      const piece = this.pieces[c];
      piece.visible = !!spot;
      if (spot) this.place(c, spot.path, spot.s);
      else this.at[c] = null;
    });
    const lap = lapPlace(state);
    const car = this.pieces[LAP_CAR];
    car.visible = lap.at === 'vuelta';
    if (car.visible) this.place(LAP_CAR, LAP, lapS(lap.pos));
    else this.at[LAP_CAR] = null;
    this.flag.set(state.phase === 'meta' ? 1 : 0);
    const shown = spinShown(state);
    if (shown) this.spinner.setAngle(this.spinner.restFor(shown));
    const active = activeCar(state);
    this.setActive(active ?? (car.visible ? LAP_CAR : null));
  }

  setActive(i) {
    this.activeIndex = i;
  }

  setSpeed(x) {
    this.speed = x;
  }

  // Finish every running animation now and play the rest of the step instantly,
  // until endSkip().
  skipAnimations() {
    this.fast = true;
  }

  endSkip() {
    this.fast = false;
  }

  dur(s) {
    return this.fast ? 0.001 : s / this.speed;
  }

  // Run fn(progress 0..1) for `seconds`; resolves when finished.
  task(seconds, fn) {
    return new Promise((resolve) => {
      const t = { start: this.time, seconds: Math.max(0.001, seconds), fn, resolve };
      this.tasks.add(t);
    });
  }

  wait(seconds) {
    return this.task(this.dur(seconds), () => {});
  }

  // ---------------------------------------------------------------- camera

  view(name, rate = 1.6) {
    const v = VIEWS[name];
    if (!v) return;
    this.followIndex = null;
    this.wantPos.set(...v.pos);
    this.wantLook.set(...v.look);
    this.camRate = rate;
  }

  focusPoint(p, { dist = 11, height = 10, rate = 2.2 } = {}) {
    this.followIndex = null;
    const x = THREE.MathUtils.clamp(p.x, -BOARD.width / 2 + 4, BOARD.width / 2 - 4);
    const z = THREE.MathUtils.clamp(p.z, -BOARD.depth / 2 + 3, BOARD.depth / 2 - 2);
    this.wantLook.set(x, 0, z);
    this.wantPos.set(x * 0.9, height, z + dist);
    this.camRate = rate;
  }

  // Keep a point in the left part of the screen, beside the card on the right.
  frameCard(p) {
    this.followIndex = null;
    const x = p.x + 5.2;
    const z = Math.max(p.z + 1.2, -BOARD.depth / 2 + 8.5);
    this.wantLook.set(x, 0, z);
    this.wantPos.set(x, 13.5, z + 12.5);
    this.camRate = 1.6;
  }

  // Keep a point in the bottom-left corner, under and beside a large slide.
  frameSlide(p) {
    this.followIndex = null;
    const x = p.x + 6.5;
    // Near the back edge the table would fill the top of the screen.
    const z = Math.max(p.z - 3.2, -BOARD.depth / 2 + 7.5);
    this.wantLook.set(x, 0, z);
    this.wantPos.set(x, 17, z + 15);
    this.camRate = 1.4;
  }

  follow(i, opts = {}) {
    this.followIndex = i;
    this.followOpts = { dist: 12, height: 11.5, ...opts };
    this.camRate = opts.rate || 2.4;
  }

  // Screen position (CSS pixels) of a world point, or null when behind the camera.
  screenOf(v) {
    const p = v.clone().project(this.camera);
    if (p.z > 1) return null;
    return { x: (p.x * 0.5 + 0.5) * this.container.clientWidth, y: (-p.y * 0.5 + 0.5) * this.container.clientHeight };
  }

  pieceTop(c, height = 1.25) {
    const piece = this.pieces[c];
    return piece.position.clone().add(new THREE.Vector3(0, height * piece.userData.scale + piece.userData.lift.position.y, 0));
  }

  // ---------------------------------------------------------------- motion

  // Drive car c along its current path (its lane, or the lap road) from s0 to
  // s1. `shape(k, s)` may add lateral offsets, lift or rotation for an animation.
  async drive(c, s0, s1, { seconds, ease = easeInOut, shape, path } = {}) {
    const road = path || this.at[c]?.path || LANES[c];
    const secs = seconds ?? 0.7 + Math.abs(s1 - s0) * 0.14;
    await this.task(this.dur(secs), (k) => {
      const s = s0 + (s1 - s0) * ease(k);
      this.pose(c, road.at(s), shape?.(k, s) || {});
    });
    this.at[c] = { path: road, s: s1 };
  }

  // The lap car hops square by square, counting the spin out loud.
  async hopLap(from, to, onHop) {
    const c = LAP_CAR;
    for (let k = from + 1; k <= to; k++) {
      const s0 = lapS(k - 1);
      const s1 = lapS(k);
      await this.task(this.dur(0.36), (t) => {
        const e = easeInOut(t);
        this.pose(c, LAP.at(s0 + (s1 - s0) * e), { lift: Math.sin(t * Math.PI) * 0.45 });
      });
      onHop?.(k);
    }
    this.at[c] = { path: LAP, s: lapS(to) };
  }

  // Raise the checkered flag at Destino.
  async raiseFlag() {
    await this.task(this.dur(0.9), (k) => this.flag.set(easeInOut(k)));
  }

  // Several cars along a route at once, each from its own start to its own end.
  async convoy(route, cars, from, to, { seconds = 2.4, ease = easeInOut } = {}) {
    await this.task(this.dur(seconds), (k) => {
      const e = ease(k);
      cars.forEach((c, i) => this.pose(c, route.at(from[i] + (to[i] - from[i]) * e)));
    });
  }

  // Cars pop out at the Facultad, one by one, and line up at the fork.
  async appear(onPop) {
    const start = 0.35;
    const jobs = this.pieces.slice(0, CARS).map(async (piece, c) => {
      await this.wait(0.25 + c * 0.45);
      piece.visible = true;
      this.place(c, ENTRY, start);
      onPop?.(c);
      await this.task(this.dur(0.4), (k) => {
        const s = 0.0001 + Math.sin(k * Math.PI * 0.5) * 1.1;
        piece.scale.setScalar(PIECE_SCALE * Math.min(1, s));
        piece.userData.lift.position.y = Math.sin(k * Math.PI) * 0.6;
      });
      piece.scale.setScalar(PIECE_SCALE);
      const end = forkSlot(c);
      await this.task(this.dur(1.1 + (end - start) * 0.08), (k) => this.pose(c, ENTRY.at(start + (end - start) * easeInOut(k))));
      this.at[c] = { path: ENTRY, s: end };
    });
    await Promise.all(jobs);
  }

  // All cars from their last squares, along their lanes, to home.
  async arrive() {
    const jobs = this.pieces.slice(0, CARS).map((_, c) => {
      const from = this.at[c]?.s ?? squareS(18);
      return this.drive(c, from, DESTINO_S, { seconds: 2.6, path: LANES[c] });
    });
    await Promise.all(jobs);
  }

  // Shake car c's body: a quick jolt after a hit.
  async jolt(c, strength = 1, seconds = 0.5) {
    const L = this.pieces[c].userData.lift;
    await this.task(this.dur(seconds), (k) => {
      const d = (1 - k) * strength;
      L.rotation.x = Math.sin(k * 38) * 0.22 * d;
      L.rotation.z = Math.cos(k * 31) * 0.16 * d;
      L.position.y = Math.abs(Math.sin(k * 20)) * 0.12 * d;
    });
    L.rotation.set(0, 0, 0);
    L.position.y = 0;
  }

  // Fix a prop to car c's body (a branch on the roof, wings) until the next tidy().
  attach(c, obj) {
    obj.userData.attached = true;
    this.pieces[c].userData.vehicle.add(obj);
    return obj;
  }

  async burst(pos, seconds = 1.0) {
    this.shake = 1;
    const dummy = new THREE.Object3D();
    const vel = [];
    for (let i = 0; i < this.shards.count; i++) {
      const a = (i / this.shards.count) * Math.PI * 2;
      const s = 2.2 + ((i * 37) % 10) * 0.25;
      vel.push(new THREE.Vector3(Math.cos(a) * s, 3 + ((i * 13) % 7) * 0.5, Math.sin(a) * s));
    }
    this.shards.visible = true;
    await this.task(this.dur(seconds), (k) => {
      const t = k * seconds;
      for (let i = 0; i < this.shards.count; i++) {
        dummy.position.set(pos.x + vel[i].x * t, PIECE_Y + 0.4 + vel[i].y * t - 6 * t * t, pos.z + vel[i].z * t);
        dummy.rotation.set(t * 9 + i, t * 7, 0);
        dummy.scale.setScalar(Math.max(0.001, 1 - k));
        dummy.updateMatrix();
        this.shards.setMatrixAt(i, dummy.matrix);
      }
      this.shards.instanceMatrix.needsUpdate = true;
    });
    this.shards.visible = false;
  }

  async spin(value) {
    const plan = this.spinner.plan(value, this.dur(4.2), Math.sin(this.time * 13.7));
    let lastSeg = this.spinner.segmentAt();
    await this.task(plan.duration, (k) => {
      const a = plan.angleAt(k * plan.duration);
      this.spinner.setAngle(a);
      const seg = this.spinner.segmentAt(a);
      if (seg !== lastSeg) {
        lastSeg = seg;
        this.onSpinTick?.();
        this.spinner.pointer.rotation.x = -0.18;
      }
      this.spinner.pointer.rotation.x *= 0.82;
    });
    this.spinner.setAngle(plan.end % (Math.PI * 2));
  }

  // ---------------------------------------------------------------- lighting

  setDim(level) {
    this.dimLevel = level;
    for (const { l, base } of this.lights) l.intensity = base * level;
    this.scene.environmentIntensity = 0.5 * level;
  }

  async dim(to, seconds = 0.8) {
    const from = this.dimLevel;
    await this.task(this.dur(seconds), (k) => this.setDim(from + (to - from) * easeInOut(k)));
  }

  clearFx() {
    for (const child of [...this.fx.children]) this.fx.remove(child);
    this.frameHooks.clear();
    this.frameHooks.add((dt, time) => this.flag.open > 0 && this.flag.wave(time));
  }

  // Undo what the last animation left behind (props, dim lights, a squashed roof).
  tidy() {
    this.clearFx();
    this.setDim(1);
    for (const piece of this.pieces) {
      const v = piece.userData.vehicle;
      for (const o of [...v.children]) if (o.userData.attached) v.remove(o);
      v.scale.set(1, 1, 1);
      piece.scale.setScalar(piece.userData.scale);
      piece.userData.lift.position.y = 0;
      piece.userData.lift.rotation.set(0, 0, 0);
    }
  }

  // ---------------------------------------------------------------- frame

  // While a frame costs too much, give up ambient occlusion first, then resolution,
  // one step every two seconds. GPU time is preferred over frame rate because the
  // browser caps frame rate in background tabs and embedded views regardless of load.
  adapt(dt) {
    // The first frames compile shaders and would read as a slow machine.
    if (this.adapted || this.time < 1.5) return;
    this.frames = (this.frames || 0) + 1;
    this.frameTime = (this.frameTime || 0) + dt;
    if (this.frameTime < 2) return;
    const fps = this.frames / this.frameTime;
    this.frames = 0;
    this.frameTime = 0;
    const gpu = this.gpu?.median();
    if (gpu == null && (this.gpu || document.hidden)) return;
    if (gpu != null ? gpu <= GPU_BUDGET_MS : fps >= 45) {
      this.adapted = true;
      return;
    }
    // Effects go before resolution: a blurry board hurts more than missing shadows in corners.
    if (this.post?.degrade()) return;
    const pr = this.renderer.getPixelRatio();
    if (pr > 1) {
      this.renderer.setPixelRatio(Math.max(1, pr - 0.25));
      this.resize();
    } else {
      this.adapted = true;
    }
  }

  loop() {
    const tick = () => {
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, this.clock.getDelta());
      this.time += dt;
      this.adapt(dt);
      for (const t of [...this.tasks]) {
        const k = this.fast ? 1 : Math.min(1, (this.time - t.start) / t.seconds);
        t.fn(k);
        if (k >= 1) {
          this.tasks.delete(t);
          t.resolve();
        }
      }
      for (const fn of this.frameHooks) fn(dt, this.time);
      this.updateCamera(dt);
      this.updateMarkers();
      const timing = !this.adapted && this.gpu?.begin();
      if (this.post) this.post.render();
      else this.renderer.render(this.scene, this.camera);
      if (timing) this.gpu.end();
      this.onFrame?.();
    };
    tick();
  }

  updateCamera(dt) {
    if (this.followIndex != null) {
      const p = this.pieces[this.followIndex]?.position;
      if (p) {
        const { dist, height } = this.followOpts;
        const x = THREE.MathUtils.clamp(p.x, -BOARD.width / 2 + 4, BOARD.width / 2 - 4);
        const z = THREE.MathUtils.clamp(p.z, -BOARD.depth / 2 + 3, BOARD.depth / 2 - 2);
        this.wantLook.set(x, 0, z);
        this.wantPos.set(x * 0.88, height, z + dist);
      }
    }
    const k = damp(this.camRate, dt);
    this.camPos.lerp(this.wantPos, k);
    this.camLook.lerp(this.wantLook, k);
    // No idle sway: thin board lines crawl across pixels whenever the camera moves,
    // and without temporal antialiasing that reads as flicker.
    this.camera.position.copy(this.camPos);
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
      this.shake *= 0.9;
    }
    this.camera.lookAt(this.camLook);
  }

  updateMarkers() {
    const i = this.activeIndex;
    const p = i != null && this.pieces[i]?.visible ? this.pieces[i] : null;
    this.activeRing.visible = this.activeArrow.visible = !!p;
    this.pieces.forEach((piece, j) => {
      const want = j === i ? 1.12 : 1;
      piece.userData.grow = (piece.userData.grow ?? 1) + (want - (piece.userData.grow ?? 1)) * 0.12;
      piece.userData.lift.scale.setScalar(piece.userData.grow);
    });
    if (p) {
      const lift = p.userData.lift.position.y;
      const scale = p.userData.scale;
      this.activeRing.position.set(p.position.x, p.position.y + 0.03, p.position.z);
      const s = scale * (1 + Math.sin(this.time * 4) * 0.06);
      this.activeRing.scale.set(s, s, s);
      this.activeArrow.position.set(p.position.x, p.position.y + 1.95 * scale + lift + Math.sin(this.time * 3) * 0.14, p.position.z);
      this.activeArrow.rotation.y = this.time * 1.5;
    }
    for (const piece of this.pieces) {
      piece.traverse((o) => {
        if (o.userData?.bob) o.position.y = o.userData.bob + Math.sin(this.time * 3 + piece.position.x) * 0.05;
      });
    }
  }
}
