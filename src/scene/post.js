import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';

// Post-processing that makes the board read as a real photographed miniature:
// ambient occlusion where pieces meet the board, a faint glow on gold and lamps,
// and a tilt-shift blur towards the top and bottom of the screen.
export class Post {
  constructor(renderer, scene, camera, { ao = true, aoSamples = 8, tiltShift = true } = {}) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    // No multisampled buffer: a half-float MSAA target costs more than every other
    // pass together on laptop GPUs. SMAA smooths the edges instead.
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
    const composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));

    if (ao) {
      const gtao = new GTAOPass(scene, camera, size.x, size.y);
      gtao.blendIntensity = 0.9;
      gtao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: aoSamples, screenSpaceRadius: false });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
      // Occlusion is soft, so half resolution is indistinguishable and much cheaper.
      const setSize = gtao.setSize.bind(gtao);
      gtao.setSize = (w, h) => setSize(Math.ceil(w / 2), Math.ceil(h / 2));
      composer.addPass(gtao);
      this.ao = gtao;
    }

    this.bloom = new UnrealBloomPass(size, 0.22, 0.45, 0.92);
    composer.addPass(this.bloom);

    if (tiltShift) {
      this.tiltH = new ShaderPass(HorizontalTiltShiftShader);
      this.tiltV = new ShaderPass(VerticalTiltShiftShader);
      this.tiltH.uniforms.r.value = this.tiltV.uniforms.r.value = 0.52;
      composer.addPass(this.tiltH);
      composer.addPass(this.tiltV);
    }

    composer.addPass(new OutputPass());
    composer.addPass(new SMAAPass(size.x, size.y));
    this.composer = composer;
    this.setSize(size.x, size.y);
  }

  setSize(w, h) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    if (this.tiltH) {
      const pr = this.renderer.getPixelRatio();
      // Mild enough that the META label at the top edge stays legible on a projector.
      this.tiltH.uniforms.h.value = 1.5 / (w * pr);
      this.tiltV.uniforms.v.value = 1.5 / (h * pr);
    }
  }

  // Drop one effect, tilt-shift before occlusion; false when none is left.
  degrade() {
    if (this.tiltH?.enabled) {
      this.tiltH.enabled = this.tiltV.enabled = false;
      return true;
    }
    if (this.ao?.enabled) {
      this.ao.enabled = false;
      return true;
    }
    return false;
  }

  render() {
    this.composer.render();
  }
}
