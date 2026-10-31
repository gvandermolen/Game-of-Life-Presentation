import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import studioHdr from '../assets/studio.hdr';
import { LANE_LENGTH, crossingAt } from '../engine/board.js';
import { buildBoard, PIECE_Y } from './board.js';
import { BOARD, SPINNER_POS, crossingCenter, laneSquare } from './layout.js';
import { UBA } from './palette.js';
import { Post } from './post.js';
import { Spinner } from './spinner.js';
import { buildPiece, setPieceColor } from './vehicles.js';
import { GpuTimer } from './gpu-timer.js';

// About 45 fps of headroom; the CPU side of a frame is only a few milliseconds.
const GPU_BUDGET_MS = 22;

const QUALITY = {
  // Below the screen's native ratio the board is upscaled and looks out of focus on Retina.
  alto: { pixelRatio: 2, shadow: 4096, shadows: true, post: { ao: true, aoSamples: 12 } },
  medio: { pixelRatio: 1.5, shadow: 2048, shadows: true, post: { ao: true, aoSamples: 8 } },
  bajo: { pixelRatio: 1, shadow: 1024, shadows: false, post: null },
};

const VIEWS = {
  overview: { pos: [0, 44.5, 35.5], look: [0, -1.5, 2.6] },
  intro: { pos: [-34, 9, 40], look: [0, 0, 0] },
  spinner: { pos: [SPINNER_POS.x, 10, SPINNER_POS.z + 9], look: [SPINNER_POS.x, 0.4, SPINNER_POS.z - 0.4] },
};

const damp = (k, dt) => 1 - Math.exp(-k * dt);

export class Stage {
  constructor(container, { quality = 'alto', onSpinTick } = {}) {
    this.container = container;
    this.q = QUALITY[quality] || QUALITY.alto;
    this.onSpinTick = onSpinTick;
    this.speed = 1;
    this.fast = false;
    this.pieces = new Map();
    this.tasks = new Set();
    this.clock = new THREE.Clock();
    this.time = 0;
    this.activeId = null;
    this.shake = 0;
  }

  async init(roster) {
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

    scene.add(new THREE.HemisphereLight('#fff4e0', '#3a2616', 0.42));
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
    scene.add(sun);
    const fill = new THREE.DirectionalLight('#bcd4ff', 0.55);
    fill.position.set(22, 18, -14);
    scene.add(fill);
    const spot = new THREE.SpotLight('#fff2d8', 70, 120, 0.55, 0.65, 1.4);
    spot.position.set(0, 46, 8);
    spot.target.position.set(0, 0, 0);
    scene.add(spot, spot.target);

    this.camera = new THREE.PerspectiveCamera(34, this.container.clientWidth / this.container.clientHeight, 0.5, 300);
    this.camPos = new THREE.Vector3(...VIEWS.intro.pos);
    this.camLook = new THREE.Vector3(...VIEWS.intro.look);
    this.camera.position.copy(this.camPos);
    this.wantPos = new THREE.Vector3(...VIEWS.overview.pos);
    this.wantLook = new THREE.Vector3(...VIEWS.overview.look);
    this.camRate = 1.1;

    const { group, roads } = buildBoard(roster, this.q === QUALITY.bajo ? 'bajo' : 'alto');
    scene.add(group);
    this.roads = roads;

    this.spinner = new Spinner(10);
    this.spinner.group.position.copy(SPINNER_POS);
    scene.add(this.spinner.group);

    this.buildMarkers();
    this.setRoster(roster);
    if (this.q.post) this.post = new Post(r, scene, this.camera, this.q.post);

    window.addEventListener('resize', () => this.resize());
    this.loop();
  }

  buildMarkers() {
    const gold = new THREE.MeshStandardMaterial({ color: UBA.gold, emissive: '#7a4f00', emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.25 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 12, 64), gold);
    ring.rotation.x = Math.PI / 2;
    this.activeRing = ring;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 24), gold);
    cone.rotation.x = Math.PI;
    cone.castShadow = true;
    this.activeArrow = cone;
    this.scene.add(ring, cone);

    const shardGeo = new THREE.TetrahedronGeometry(0.12);
    this.shards = new THREE.InstancedMesh(shardGeo, new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff8a00', emissiveIntensity: 0.8 }), 48);
    this.shards.visible = false;
    this.scene.add(this.shards);
  }

  setRoster(roster) {
    for (const p of this.pieces.values()) this.scene.remove(p);
    this.pieces.clear();
    this.roster = roster;
    for (const team of roster.filter((t) => t.enabled)) {
      const piece = buildPiece(team);
      this.pieces.set(team.id, piece);
      this.scene.add(piece);
    }
  }

  // Start names are rebuilt as text meshes, so colour-picker drags are debounced.
  recolor(roster) {
    clearTimeout(this.repaintTimer);
    this.repaintTimer = setTimeout(() => this.roads.recolor(roster), 120);
    for (const t of roster) {
      const piece = this.pieces.get(t.id);
      if (piece) setPieceColor(piece, t.color);
    }
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.post?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Placement for a team at a position, given who else shares the square.
  placement(state, teamId) {
    const team = state.teams.find((t) => t.id === teamId);
    return this.placementAt(state, team, team.pos);
  }

  placementAt(state, team, pos) {
    const id = pos > 0 && pos < LANE_LENGTH ? crossingAt(team.lane, pos) : null;
    const sq = laneSquare(team.lane, pos);
    if (id) {
      const here = state.teams.filter((t) => !t.finished && crossingAt(t.lane, t.pos) === id);
      if (here.length > 1 && here.includes(team)) {
        const c = crossingCenter(id);
        const i = here.indexOf(team);
        const a = sq.heading + (i / here.length) * Math.PI * 2 + Math.PI / 4;
        const p = new THREE.Vector3(c.x + Math.cos(a) * 0.72, PIECE_Y, c.z - Math.sin(a) * 0.72);
        return { pos: p, heading: a + Math.PI + 0.5 };
      }
    }
    return { pos: new THREE.Vector3(sq.pos.x, PIECE_Y, sq.pos.z), heading: sq.heading };
  }

  snap(state) {
    for (const t of state.teams) {
      const piece = this.pieces.get(t.id);
      if (!piece) continue;
      const { pos, heading } = this.placement(state, t.id);
      piece.position.copy(pos);
      piece.rotation.y = heading;
      piece.userData.lift.position.y = 0;
      piece.userData.lift.rotation.set(0, 0, 0);
    }
    this.setActive(state.phase === 'finished' ? null : state.teams[state.turn]?.id);
  }

  setActive(id) {
    this.activeId = id;
  }

  setSpeed(x) {
    this.speed = x;
  }

  skipAnimations() {
    this.fast = true;
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

  view(name, rate = 1.6) {
    const v = VIEWS[name];
    if (!v) return;
    this.followId = null;
    this.wantPos.set(...v.pos);
    this.wantLook.set(...v.look);
    this.camRate = rate;
  }

  focusPoint(p, { dist = 13, height = 13, rate = 2.2 } = {}) {
    this.followId = null;
    const x = THREE.MathUtils.clamp(p.x, -BOARD.width / 2 + 4, BOARD.width / 2 - 4);
    const z = THREE.MathUtils.clamp(p.z, -BOARD.depth / 2 + 3, BOARD.depth / 2 - 2);
    this.wantLook.set(x, 0, z);
    this.wantPos.set(x * 0.85, height, z + dist);
    this.camRate = rate;
  }

  // Keep a point visible in the upper third of the screen, above an open card.
  frameAbove(p) {
    this.followId = null;
    const x = THREE.MathUtils.clamp(p.x, -BOARD.width / 2 + 5, BOARD.width / 2 - 5);
    const z = THREE.MathUtils.clamp(p.z, -BOARD.depth / 2 + 3, BOARD.depth / 2 - 2);
    this.wantLook.set(x, 0, z + 7.5);
    this.wantPos.set(x * 0.92, 19, z + 7.5 + 13);
    this.camRate = 1.6;
  }

  piecePosition(teamId) {
    return this.pieces.get(teamId)?.position;
  }

  follow(teamId, opts = {}) {
    this.followId = teamId;
    this.followOpts = { dist: 12, height: 12.5, ...opts };
    this.camRate = opts.rate || 2.4;
  }

  async spin(value) {
    const plan = this.spinner.plan(value, this.dur(3.4), Math.sin(this.time * 13.7) * 0.9);
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

  async hop(teamId, to, height = 0.55, seconds = 0.3) {
    const piece = this.pieces.get(teamId);
    const lift = piece.userData.lift;
    const p0 = piece.position.clone();
    const h0 = piece.rotation.y;
    let dh = to.heading - h0;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    await this.task(this.dur(seconds), (k) => {
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      piece.position.lerpVectors(p0, to.pos, e);
      piece.rotation.y = h0 + dh * e;
      lift.position.y = Math.sin(Math.PI * k) * height;
      lift.rotation.z = Math.sin(Math.PI * k) * 0.12;
    });
    lift.position.y = 0;
    lift.rotation.z = 0;
  }

  // Walk a piece square by square. `state` is the state after the move.
  async walk(teamId, path, state, onStep) {
    const team = state.teams.find((t) => t.id === teamId);
    for (let i = 0; i < path.length; i++) {
      const last = i === path.length - 1;
      const target = last ? this.placement(state, teamId) : this.placementAt(state, team, path[i]);
      await this.hop(teamId, target);
      onStep?.(path[i]);
    }
  }

  async slide(teamId, state) {
    const target = this.placement(state, teamId);
    await this.hop(teamId, target, 0.9, 0.6);
  }

  // Re-seat pieces that share a cruce (or left one) without animation drama.
  async settle(state) {
    const jobs = [];
    for (const t of state.teams) {
      const piece = this.pieces.get(t.id);
      if (!piece) continue;
      const target = this.placement(state, t.id);
      if (piece.position.distanceTo(target.pos) > 0.05) jobs.push(this.hop(t.id, target, 0.25, 0.35));
    }
    await Promise.all(jobs);
  }

  async crash(cruce, teamIds) {
    const pos = crossingCenter(cruce);
    this.focusPoint(pos, { dist: 9, height: 8.5, rate: 3.2 });
    await this.wait(0.45);
    this.shake = 1;
    const dummy = new THREE.Object3D();
    const vel = [];
    for (let i = 0; i < this.shards.count; i++) {
      const a = (i / this.shards.count) * Math.PI * 2;
      const s = 2.2 + ((i * 37) % 10) * 0.25;
      vel.push(new THREE.Vector3(Math.cos(a) * s, 3 + ((i * 13) % 7) * 0.5, Math.sin(a) * s));
    }
    this.shards.visible = true;
    const pieces = teamIds.map((id) => this.pieces.get(id)).filter(Boolean);
    await this.task(this.dur(1.1), (k) => {
      const t = k * 1.1;
      for (let i = 0; i < this.shards.count; i++) {
        dummy.position.set(pos.x + vel[i].x * t, PIECE_Y + 0.4 + vel[i].y * t - 6 * t * t, pos.z + vel[i].z * t);
        dummy.rotation.set(t * 9 + i, t * 7, 0);
        dummy.scale.setScalar(Math.max(0.001, 1 - k));
        dummy.updateMatrix();
        this.shards.setMatrixAt(i, dummy.matrix);
      }
      this.shards.instanceMatrix.needsUpdate = true;
      pieces.forEach((p, i) => {
        p.userData.lift.rotation.z = Math.sin(k * 40 + i) * 0.25 * (1 - k);
        p.userData.lift.rotation.x = Math.cos(k * 33 + i) * 0.2 * (1 - k);
      });
    });
    this.shards.visible = false;
    pieces.forEach((p) => p.userData.lift.rotation.set(0, 0, 0));
  }

  async celebrate(teamId) {
    const piece = this.pieces.get(teamId);
    if (!piece) return;
    this.focusPoint(piece.position, { dist: 10, height: 7.5, rate: 1.6 });
    await this.task(this.dur(1.6), (k) => {
      piece.userData.lift.position.y = Math.abs(Math.sin(k * Math.PI * 3)) * 0.8 * (1 - k * 0.5);
      piece.userData.lift.rotation.y = k * Math.PI * 2;
    });
    piece.userData.lift.position.y = 0;
    piece.userData.lift.rotation.y = 0;
  }

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
        const k = Math.min(1, (this.time - t.start) / t.seconds);
        t.fn(k);
        if (k >= 1) {
          this.tasks.delete(t);
          t.resolve();
        }
      }
      if (!this.tasks.size) this.fast = false;
      this.updateCamera(dt);
      this.updateMarkers();
      const timing = !this.adapted && this.gpu?.begin();
      if (this.post) this.post.render();
      else this.renderer.render(this.scene, this.camera);
      if (timing) this.gpu.end();
    };
    tick();
  }

  updateCamera(dt) {
    if (this.followId) {
      const p = this.pieces.get(this.followId)?.position;
      if (p) {
        const { dist, height } = this.followOpts;
        const x = THREE.MathUtils.clamp(p.x, -BOARD.width / 2 + 4, BOARD.width / 2 - 4);
        const z = THREE.MathUtils.clamp(p.z, -BOARD.depth / 2 + 3, BOARD.depth / 2 - 2);
        this.wantLook.set(x, 0, z);
        this.wantPos.set(x * 0.85, height, z + dist);
      }
    }
    const k = damp(this.camRate, dt);
    this.camPos.lerp(this.wantPos, k);
    this.camLook.lerp(this.wantLook, k);
    const drift = 0.25;
    this.camera.position.set(
      this.camPos.x + Math.sin(this.time * 0.21) * drift,
      this.camPos.y + Math.sin(this.time * 0.17) * drift * 0.5,
      this.camPos.z,
    );
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
      this.shake *= 0.9;
    }
    this.camera.lookAt(this.camLook);
  }

  updateMarkers() {
    const p = this.activeId && this.pieces.get(this.activeId);
    this.activeRing.visible = this.activeArrow.visible = !!p;
    if (p) {
      const lift = p.userData.lift.position.y;
      this.activeRing.position.set(p.position.x, p.position.y + 0.03, p.position.z);
      const s = 1 + Math.sin(this.time * 4) * 0.06;
      this.activeRing.scale.set(s, s, s);
      this.activeArrow.position.set(p.position.x, p.position.y + 1.55 + lift + Math.sin(this.time * 3) * 0.12, p.position.z);
      this.activeArrow.rotation.y = this.time * 1.5;
    }
    for (const piece of this.pieces.values()) {
      piece.traverse((o) => {
        if (o.userData?.bob) o.position.y = o.userData.bob + Math.sin(this.time * 3 + piece.position.x) * 0.05;
      });
    }
  }
}
