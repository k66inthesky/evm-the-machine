// Renderer — wraps THREE.WebGLRenderer with the post-processing pipeline
// (bloom + fog is done in-scene). Also handles resize.
//
// A quick note for non-graphics folks: "bloom" is the glow-halo effect you
// see around bright things in sci-fi movies. We render the scene once, then
// run two extra passes that extract bright pixels, blur them, and add the
// blur back on top. The synthwave look leans on this entirely.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private gl: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private currentScene: THREE.Scene | null = null;
  private currentCamera: THREE.Camera | null = null;

  constructor(host: HTMLElement) {
    this.gl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.gl.setSize(window.innerWidth, window.innerHeight);
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.1;
    host.appendChild(this.gl.domElement);
    this.canvas = this.gl.domElement;

    this.composer = new EffectComposer(this.gl);
    // RenderPass and bloom are re-attached per-scene in render().
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      /* strength */ 1.2,
      /* radius */ 0.6,
      /* threshold */ 0.15,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.gl.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    if (this.currentCamera && (this.currentCamera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const cam = this.currentCamera as THREE.PerspectiveCamera;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
  };

  render(scene: THREE.Scene, camera: THREE.Camera) {
    if (scene !== this.currentScene || camera !== this.currentCamera) {
      // Reset the render pass whenever the active scene/camera changes.
      // EffectComposer.passes[0] is always the RenderPass; replace it.
      this.composer.passes = this.composer.passes.filter((p) => !(p as any).isRenderPass);
      this.composer.insertPass(new RenderPass(scene, camera), 0);
      this.currentScene = scene;
      this.currentCamera = camera;
    }
    this.composer.render();
  }

  setBloom(strength: number, radius: number, threshold: number) {
    this.bloom.strength = strength;
    this.bloom.radius = radius;
    this.bloom.threshold = threshold;
  }
}
