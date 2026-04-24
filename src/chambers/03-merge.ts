// Chamber 3 — The Merge.
// Interaction puzzle. Five black industrial "miner" cubes float around the
// room. The player crosshair-aims at each and clicks to convert it into a
// green crystalline "validator" octahedron. Win when all five are converted.
//
// Uses a simple THREE.Raycaster from the camera center — the crosshair.
// Raycaster's `intersectObjects` returns the list of meshes the ray hit in
// distance order; we check if the front miner is within our aim range.
import * as THREE from 'three';
import { Chamber } from './chamber';
import type { Input } from '../core/input';
import { FPSController } from '../core/fps-controller';
import { COLOR } from '../core/palette';

interface Miner { mesh: THREE.Mesh; converted: boolean; baseY: number; phase: number; }

export class MergeChamber extends Chamber {
  chamberIndex = 2;
  title = 'THE MERGE';

  private fps!: FPSController;
  private miners: Miner[] = [];
  private raycaster = new THREE.Raycaster();
  private center = new THREE.Vector2(0, 0);
  private convertedCount = 0;
  private statusEl: HTMLDivElement | null = null;

  protected build() {
    this.scene.fog = new THREE.Fog(COLOR.bg, 8, 60);

    const grid = new THREE.GridHelper(120, 60, COLOR.cyan, 0x0f1a2e);
    (grid.material as any).opacity = 0.3;
    (grid.material as any).transparent = true;
    this.scene.add(grid);

    // Miners — dark grey boxes with red edges so they feel "industrial".
    const miners = 5;
    for (let i = 0; i < miners; i++) {
      const a = (i / miners) * Math.PI * 2;
      const r = 6 + Math.random() * 3;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshBasicMaterial({ color: 0x111111 }),
      );
      body.position.set(Math.cos(a) * r, 2 + Math.random() * 1.5, Math.sin(a) * r);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(body.geometry),
        new THREE.LineBasicMaterial({ color: COLOR.red }),
      );
      body.add(edges);
      this.scene.add(body);
      this.miners.push({ mesh: body, converted: false, baseY: body.position.y, phase: Math.random() * Math.PI * 2 });
    }

    this.fps = new FPSController({ onGroundHeight: () => 0 });
    this.fps.setPosition(0, 1.6, 0);
    this.camera = this.fps.camera;

    this.game.hud.crosshair();
    this.game.hud.prompt('CLICK TO CONVERT · PROOF OF WORK → PROOF OF STAKE');
    this.statusEl = this.game.hud.element('0 / 5', {
      position: 'absolute', top: '24px', right: '24px',
      fontFamily: 'Courier New, monospace', fontSize: '16px',
      color: '#00f0ff', letterSpacing: '0.2em', textShadow: '0 0 8px #00f0ff',
      pointerEvents: 'none',
    });
  }

  update(dt: number, input: Input) {
    this.fps.update(dt, input);

    // Bob the miners.
    for (const m of this.miners) {
      m.phase += dt;
      m.mesh.position.y = m.baseY + Math.sin(m.phase) * 0.3;
      m.mesh.rotation.y += dt * (m.converted ? 2 : 0.6);
    }

    if (input.consumeClick()) this.tryConvert();

    if (this.convertedCount === this.miners.length) this.win();
  }

  private tryConvert() {
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(this.miners.map((m) => m.mesh));
    if (hits.length === 0) return;
    const hit = hits[0].object as THREE.Mesh;
    const miner = this.miners.find((m) => m.mesh === hit);
    if (!miner || miner.converted) return;
    if (hits[0].distance > 20) return;

    miner.converted = true;
    this.convertedCount++;
    this.game.audio.playSFX('merge');

    // Swap geometry + material to validator look: green octahedron wireframe.
    miner.mesh.geometry.dispose();
    miner.mesh.geometry = new THREE.OctahedronGeometry(0.9, 0);
    (miner.mesh.material as THREE.MeshBasicMaterial).color.set(0x00ff77);
    // Remove the red edges + add green ones.
    miner.mesh.clear();
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(miner.mesh.geometry),
      new THREE.LineBasicMaterial({ color: 0x00ff77 }),
    );
    miner.mesh.add(edges);

    if (this.statusEl) this.statusEl.textContent = `${this.convertedCount} / ${this.miners.length}`;
  }
}
