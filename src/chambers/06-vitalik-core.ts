// Chamber 6 — Vitalik's Core.
// Finale. A slowly rotating, many-ringed gear/atom in the center of a dark
// hall. Walk to the core, press E, trigger the completion sequence which
// hands control to the FinaleScreen where the on-chain mint lives.
//
// The core structure is built from several concentric wireframe icosahedra
// and torus rings at different tilts — gives the "alien reactor" look.
import * as THREE from 'three';
import { Chamber } from './chamber';
import type { Input } from '../core/input';
import { FPSController } from '../core/fps-controller';
import { COLOR } from '../core/palette';

export class VitalikCoreChamber extends Chamber {
  chamberIndex = 5;
  title = "VITALIK'S CORE";

  private fps!: FPSController;
  private core = new THREE.Group();
  private activated = false;
  private activationTime = 0;
  private prompt: HTMLDivElement | null = null;

  protected build() {
    this.scene.fog = new THREE.Fog(COLOR.bg, 18, 100);

    // Ground: a huge reflective-looking cyan grid with a purple wash.
    const grid = new THREE.GridHelper(160, 80, COLOR.purple, COLOR.cyan);
    (grid.material as any).opacity = 0.45;
    (grid.material as any).transparent = true;
    this.scene.add(grid);

    // Core structure.
    this.core.position.set(0, 6, -18);
    this.scene.add(this.core);

    const hulls = [
      { geo: new THREE.IcosahedronGeometry(3.5, 0), color: COLOR.cyan },
      { geo: new THREE.OctahedronGeometry(2.6, 0),  color: COLOR.purple },
      { geo: new THREE.IcosahedronGeometry(1.8, 0), color: COLOR.gold },
    ];
    for (const h of hulls) {
      const mesh = new THREE.Mesh(h.geo, new THREE.MeshBasicMaterial({ color: h.color, wireframe: true, transparent: true, opacity: 0.85 }));
      this.core.add(mesh);
    }
    // Orbital rings at three tilts — the "atom" feel.
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.5, 0.06, 8, 64),
        new THREE.MeshBasicMaterial({ color: COLOR.cyan, transparent: true, opacity: 0.7 }),
      );
      ring.rotation.x = (i / 3) * Math.PI;
      ring.rotation.y = (i / 3) * Math.PI * 0.5;
      this.core.add(ring);
    }
    // Inner pulse sphere (solid — gets bloomed hard).
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), new THREE.MeshBasicMaterial({ color: COLOR.gold }));
    this.core.add(pulse);
    (this.core as any).userData.pulse = pulse;

    // Eight pillars ring the arena — makes the space feel ceremonial.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 22;
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 14, 0.6),
        new THREE.MeshBasicMaterial({ color: COLOR.purple, wireframe: true }),
      );
      pillar.position.set(Math.cos(a) * r, 7, Math.sin(a) * r);
      this.scene.add(pillar);
    }

    this.fps = new FPSController({ onGroundHeight: () => 0 });
    this.fps.setPosition(0, 1.6, 4);
    this.camera = this.fps.camera;

    this.game.hud.crosshair();
    this.prompt = this.game.hud.prompt('APPROACH THE CORE · PRESS E');
  }

  update(dt: number, input: Input) {
    this.fps.update(dt, input);

    this.core.rotation.y += dt * 0.25;
    // Counter-rotate inner hulls on different axes for the "machine" feel.
    if (this.core.children[0]) this.core.children[0].rotation.y -= dt * 0.4;
    if (this.core.children[1]) this.core.children[1].rotation.x += dt * 0.6;
    if (this.core.children[2]) this.core.children[2].rotation.z += dt * 0.9;

    if (!this.activated) {
      const dist = this.fps.position.distanceTo(this.core.position);
      if (this.prompt) this.prompt.style.opacity = dist < 6 ? '1' : '0.35';
      if (dist < 6 && input.wasPressed('KeyE')) this.activate();
    } else {
      // Ramp the bloom and scale the core up; after ~2s, advance to finale.
      this.activationTime += dt;
      const s = 1 + this.activationTime * 0.4;
      this.core.scale.setScalar(s);
      this.game.renderer.setBloom(Math.min(3, 1.2 + this.activationTime * 1.2), 0.8, 0.05);
      if (this.activationTime > 1.8) this.win();
    }
  }

  private activate() {
    this.activated = true;
    this.game.audio.playSFX('interact');
    this.game.audio.playSFX('mint');
    if (this.prompt) this.prompt.textContent = 'CORE ONLINE';
  }
}
