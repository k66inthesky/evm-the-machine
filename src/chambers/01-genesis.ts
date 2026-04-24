// Chamber 1 — Genesis.
// Tutorial. Dark void + a single glowing cyan cube + a distant starfield of
// cyan points. Player walks to the cube, presses E, cube detonates into a
// wireframe lattice (the "genesis block"). Win condition: press E on the cube.
//
// Graphics notes for first-time Three.js readers:
// - scene.fog makes distant objects fade to the background color, cheap
//   atmosphere and free depth cue.
// - MeshBasicMaterial is "unlit" — the color you set is the color on screen.
//   Pairs well with bloom because the cube is literally emitting light from
//   the post-processing perspective.
import * as THREE from 'three';
import { Chamber } from './chamber';
import type { Input } from '../core/input';
import { FPSController } from '../core/fps-controller';
import { COLOR } from '../core/palette';

export class GenesisChamber extends Chamber {
  chamberIndex = 0;
  title = 'GENESIS';

  private fps!: FPSController;
  private cube!: THREE.Mesh;
  private lattice: THREE.LineSegments | null = null;
  private exploded = false;
  private latticePulse = 0;
  private prompt: HTMLDivElement | null = null;

  protected build() {
    this.scene.fog = new THREE.Fog(COLOR.bg, 10, 80);

    // Floor as a huge grid — gives the player spatial reference.
    const grid = new THREE.GridHelper(200, 80, COLOR.cyan, COLOR.dim);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as any).opacity = 0.35;
    this.scene.add(grid);

    // Starfield for depth. BufferGeometry + Points = super cheap.
    const starCount = 400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 300;
      starPos[i * 3 + 1] = Math.random() * 60 + 5;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: COLOR.cyan, size: 0.2, transparent: true, opacity: 0.7 })));

    // The cube the player is here to touch.
    const cubeGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    this.cube = new THREE.Mesh(cubeGeo, new THREE.MeshBasicMaterial({ color: COLOR.cyan }));
    this.cube.position.set(0, 2, -12);
    this.scene.add(this.cube);
    // Outline — a second cube rendered as wireframe slightly scaled up.
    const outline = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.7, 1.7),
      new THREE.MeshBasicMaterial({ color: COLOR.cyan, wireframe: true, transparent: true, opacity: 0.4 }),
    );
    this.cube.add(outline);

    this.fps = new FPSController({ onGroundHeight: () => 0 });
    this.fps.setPosition(0, 1.6, 0);
    this.camera = this.fps.camera;

    this.game.hud.crosshair();
    this.prompt = this.game.hud.prompt('WALK TO THE CUBE · PRESS E');
  }

  update(dt: number, input: Input) {
    this.fps.update(dt, input);

    // Idle cube rotation — sells that it's "alive".
    if (!this.exploded) {
      this.cube.rotation.y += dt * 0.6;
      this.cube.rotation.x += dt * 0.2;
      const dist = this.cube.position.distanceTo(this.fps.position);
      if (dist < 3 && input.wasPressed('KeyE')) this.detonate();
      if (this.prompt) this.prompt.style.opacity = dist < 3 ? '1' : '0.35';
    } else if (this.lattice) {
      // After the blast: lattice slowly expands + rotates, then we win once
      // it's had a moment to breathe.
      this.latticePulse += dt;
      const s = 1 + this.latticePulse * 0.8;
      this.lattice.scale.setScalar(s);
      this.lattice.rotation.y += dt * 0.8;
      if (this.latticePulse > 1.8) this.win();
    }
  }

  private detonate() {
    this.game.audio.playSFX('interact');
    this.scene.remove(this.cube);
    // EdgesGeometry draws only the box's edges — cleaner "wireframe block"
    // look than a wireframe material on a regular BoxGeometry.
    const box = new THREE.BoxGeometry(3, 3, 3);
    const edges = new THREE.EdgesGeometry(box);
    this.lattice = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: COLOR.cyan }));
    this.lattice.position.copy(this.cube.position);
    this.scene.add(this.lattice);
    this.exploded = true;
    if (this.prompt) this.prompt.textContent = 'THE FIRST BLOCK';
  }
}
