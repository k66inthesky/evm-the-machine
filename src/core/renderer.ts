// Renderer — thin wrapper around THREE.WebGLRenderer.
//
// Earlier versions ran a UnrealBloom + EffectComposer pipeline. Two problems
// killed it: (1) EffectComposer caches the read/write render targets between
// frames, so swapping scene/camera in `render()` left the previous chamber's
// pixels on the canvas until the targets got overwritten — symptom: every
// chamber displayed the same OLD chamber's frame after a transition. (2) The
// diegetic canvas surfaces (laptops, whiteboards, monitors) all use light
// backgrounds with `toneMapped: false`, which sit way above any sane bloom
// threshold and got haloed into solid white blobs that drowned out the text.
// Direct `gl.render()` is bulletproof; the synthwave look comes from the
// palette, the fog, and the procedural geometry — not from a bloom pass.
import * as THREE from 'three';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private gl: THREE.WebGLRenderer;
  private currentCamera: THREE.Camera | null = null;

  constructor(host: HTMLElement) {
    this.gl = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      // Preserved so we can grab canvas.toDataURL() for jam screenshots.
      preserveDrawingBuffer: true,
    });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.gl.setSize(window.innerWidth, window.innerHeight);
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.1;
    host.appendChild(this.gl.domElement);
    this.canvas = this.gl.domElement;

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.gl.setSize(w, h);
    if (this.currentCamera && (this.currentCamera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const cam = this.currentCamera as THREE.PerspectiveCamera;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
  };

  render(scene: THREE.Scene, camera: THREE.Camera) {
    this.currentCamera = camera;
    this.gl.render(scene, camera);
  }

  // Kept as a no-op so existing call sites continue to compile.
  setBloom(_strength: number, _radius: number, _threshold: number) {}
}
