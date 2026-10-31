import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Collapse every static mesh under `root` into one mesh per material, so the
// board costs tens of draw calls instead of hundreds. Subtrees flagged with
// userData.dynamic are left untouched.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];

  root.traverse((o) => {
    if (o.userData.dynamic) return;
    let p = o.parent;
    while (p && p !== root) {
      if (p.userData.dynamic) return;
      p = p.parent;
    }
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}`;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
    if (!buckets.has(key)) buckets.set(key, { mesh: o, geos: [] });
    buckets.get(key).geos.push(g);
    remove.push(o);
  });

  for (const o of remove) o.parent.remove(o);
  for (const { mesh, geos } of buckets.values()) {
    const merged = new THREE.Mesh(mergeGeometries(geos, false), mesh.material);
    merged.castShadow = mesh.castShadow;
    merged.receiveShadow = mesh.receiveShadow;
    merged.renderOrder = mesh.renderOrder;
    root.add(merged);
    geos.forEach((g) => g.dispose());
  }
  // Drop groups left empty by the merge.
  const empty = [];
  root.traverse((o) => {
    if (o !== root && o.type === 'Group' && o.children.length === 0 && !o.userData.dynamic) empty.push(o);
  });
  empty.forEach((o) => o.parent?.remove(o));
  return root;
}
