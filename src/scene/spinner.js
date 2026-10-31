import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeStatic } from './merge.js';
import { UBA } from './palette.js';
import { spinnerTexture } from './textures.js';

const RADIUS = 3.0;
const TWO_PI = Math.PI * 2;

export class Spinner {
  constructor(count = 10) {
    this.count = count;
    this.group = new THREE.Group();
    this.angle = 0;

    const navy = new THREE.MeshPhysicalMaterial({ color: UBA.navy, roughness: 0.35, clearcoat: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: UBA.gold, metalness: 0.75, roughness: 0.25 });
    const white = new THREE.MeshPhysicalMaterial({ color: '#f7f5ef', roughness: 0.3, clearcoat: 0.8 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS + 0.45, RADIUS + 0.6, 0.55, 72), navy);
    base.position.y = 0.275;
    base.castShadow = base.receiveShadow = true;
    this.group.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RADIUS + 0.46, 0.06, 12, 96), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    this.group.add(ring);

    this.wheel = new THREE.Group();
    this.wheel.position.y = 0.62;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS, RADIUS, 0.2, 96), white);
    rim.castShadow = rim.receiveShadow = true;
    this.wheel.add(rim);
    const faceGeo = new THREE.CircleGeometry(RADIUS - 0.02, 96);
    faceGeo.rotateX(-Math.PI / 2);
    const face = new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({ map: spinnerTexture(count), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }));
    face.position.y = 0.101;
    face.receiveShadow = true;
    this.wheel.add(face);

    // Pegs between segments, like the classic spinner.
    const pegGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12);
    for (let k = 0; k < count; k++) {
      const a = (k * TWO_PI) / count - Math.PI / 2;
      const peg = new THREE.Mesh(pegGeo, gold);
      peg.position.set(Math.cos(a) * (RADIUS - 0.12), 0.18, Math.sin(a) * (RADIUS - 0.12));
      peg.castShadow = true;
      this.wheel.add(peg);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 48), gold);
    hub.position.y = 0.2;
    hub.castShadow = true;
    this.wheel.add(hub);
    this.group.add(this.wheel);

    // Pointer at the back (-z), pointing to the centre.
    const pointer = new THREE.Group();
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.4, 1.0, 0.4, 2, 0.08), navy);
    post.position.y = 0.5;
    post.castShadow = true;
    pointer.add(post);
    const shape = new THREE.Shape();
    shape.moveTo(-0.28, 0);
    shape.lineTo(0.28, 0);
    shape.lineTo(0, 0.9);
    shape.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    arrowGeo.rotateX(Math.PI / 2);
    const arrow = new THREE.Mesh(arrowGeo, gold);
    arrow.position.set(0, 0.98, -0.1);
    arrow.castShadow = true;
    pointer.add(arrow);
    pointer.position.set(0, 0, -RADIUS - 0.35);
    this.pointer = pointer;
    this.group.add(pointer);

    mergeStatic(this.wheel);
    mergeStatic(this.pointer);
  }

  // Wheel rotation that puts value `v` under the pointer.
  targetFor(v) {
    const seg = TWO_PI / this.count;
    return (v - 0.5) * seg - Math.PI / 2 + Math.PI / 2;
  }

  // Returns a spin plan; `angleAt(t)` is a pure function of elapsed seconds.
  plan(value, duration, jitter = 0) {
    const seg = TWO_PI / this.count;
    const start = this.angle;
    const want = this.targetFor(value) + jitter * seg * 0.32;
    const turns = 4 + Math.floor(duration);
    let end = want + TWO_PI * Math.ceil((start + turns * TWO_PI - want) / TWO_PI);
    if (end < start + turns * TWO_PI) end += TWO_PI;
    const ease = (x) => 1 - Math.pow(1 - x, 3.4);
    return {
      duration,
      end,
      angleAt: (t) => start + (end - start) * ease(Math.min(1, t / duration)),
    };
  }

  setAngle(a) {
    this.angle = a;
    this.wheel.rotation.y = a;
  }

  segmentAt(angle = this.angle) {
    return Math.floor(angle / (TWO_PI / this.count));
  }
}
