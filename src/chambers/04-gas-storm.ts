// Chamber 4 — Gas Storm.
// Survival. Player stands in a corridor for 30 seconds while orange gas
// projectiles fly toward them from the far end. Too many hits = damage; if
// the timer runs out, you win.
//
// We use simple sphere-sphere collision (player radius + projectile radius
// vs center distance). Cheap and good enough.
import * as THREE from 'three';
import { Chamber } from './chamber';
import type { Input } from '../core/input';
import { FPSController } from '../core/fps-controller';
import { COLOR } from '../core/palette';

interface Projectile { mesh: THREE.Mesh; vel: THREE.Vector3; }

const SURVIVE_SECONDS = 30;
const CORRIDOR_HALF = 4.5; // inner corridor width / 2

export class GasStormChamber extends Chamber {
  chamberIndex = 3;
  title = 'GAS STORM';

  private fps!: FPSController;
  private projectiles: Projectile[] = [];
  private spawnTimer = 0;
  private elapsed = 0;
  private hp = 3;
  private timerEl: HTMLDivElement | null = null;
  private hpEl: HTMLDivElement | null = null;
  private invuln = 0;

  protected build() {
    this.scene.fog = new THREE.Fog(0x1a0500, 6, 60);

    const grid = new THREE.GridHelper(120, 60, COLOR.orange, 0x331500);
    (grid.material as any).opacity = 0.5;
    (grid.material as any).transparent = true;
    this.scene.add(grid);

    // Corridor walls — two long wireframe planes flanking the player.
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 6, 80),
        new THREE.MeshBasicMaterial({ color: COLOR.orange, wireframe: true }),
      );
      wall.position.set(side * CORRIDOR_HALF, 3, -30);
      this.scene.add(wall);
    }
    // Ceiling beams — adds depth without closing the ceiling.
    for (let z = -5; z > -65; z -= 4) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(CORRIDOR_HALF * 2 + 0.5, 0.15, 0.15),
        new THREE.MeshBasicMaterial({ color: COLOR.orange }),
      );
      beam.position.set(0, 6, z);
      this.scene.add(beam);
    }

    this.fps = new FPSController({
      onGroundHeight: () => 0,
      canMoveTo: (p) => Math.abs(p.x) < CORRIDOR_HALF - 0.3 && p.z > -65 && p.z < 8,
    });
    this.fps.setPosition(0, 1.6, 0);
    this.camera = this.fps.camera;

    this.game.hud.crosshair();
    this.game.hud.prompt(`SURVIVE ${SURVIVE_SECONDS}S · DODGE THE GAS`);
    this.timerEl = this.game.hud.element(`${SURVIVE_SECONDS}`, {
      position: 'absolute', top: '24px', right: '24px',
      fontFamily: 'Courier New, monospace', fontSize: '24px',
      color: '#ffa500', letterSpacing: '0.2em', textShadow: '0 0 8px #ffa500',
      pointerEvents: 'none',
    });
    this.hpEl = this.game.hud.element('HP ♦♦♦', {
      position: 'absolute', top: '24px', left: '24px',
      fontFamily: 'Courier New, monospace', fontSize: '16px',
      color: '#ff0055', letterSpacing: '0.2em', textShadow: '0 0 8px #ff0055',
      pointerEvents: 'none',
    });
  }

  update(dt: number, input: Input) {
    this.fps.update(dt, input);
    this.elapsed += dt;
    this.invuln = Math.max(0, this.invuln - dt);

    // Spawn rate ramps up.
    this.spawnTimer -= dt;
    const spawnInterval = Math.max(0.15, 0.6 - this.elapsed * 0.012);
    if (this.spawnTimer <= 0) {
      this.spawnProjectile();
      this.spawnTimer = spawnInterval;
    }

    for (const p of this.projectiles) {
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 4;
      if (this.invuln <= 0 && p.mesh.position.distanceTo(this.fps.position) < 0.9) {
        this.hp = Math.max(0, this.hp - 1);
        this.invuln = 0.6;
        this.game.audio.playSFX('damage');
        if (this.hpEl) this.hpEl.textContent = 'HP ' + '♦'.repeat(this.hp) + '◇'.repeat(3 - this.hp);
        p.mesh.position.z = -1000; // mark for GC below
      }
    }
    this.projectiles = this.projectiles.filter((p) => {
      if (p.mesh.position.z > 10 || p.mesh.position.z < -80 || p.mesh.position.z === -1000) {
        this.scene.remove(p.mesh);
        return false;
      }
      return true;
    });

    if (this.timerEl) this.timerEl.textContent = Math.max(0, Math.ceil(SURVIVE_SECONDS - this.elapsed)).toString();
    if (this.hp <= 0) {
      // Respawn instead of fail — jam-friendly: let the player progress.
      this.hp = 3;
      this.elapsed = 0;
      this.invuln = 2;
      this.fps.setPosition(0, 1.6, 0);
      for (const p of this.projectiles) this.scene.remove(p.mesh);
      this.projectiles = [];
      if (this.hpEl) this.hpEl.textContent = 'HP ♦♦♦';
    }
    if (this.elapsed >= SURVIVE_SECONDS) this.win();
  }

  private spawnProjectile() {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5, 0),
      new THREE.MeshBasicMaterial({ color: COLOR.orange, wireframe: true }),
    );
    mesh.position.set((Math.random() - 0.5) * (CORRIDOR_HALF * 2 - 1), 1.6 + (Math.random() - 0.5) * 1.2, -60);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    );
    mesh.add(core);
    this.scene.add(mesh);
    const speed = 12 + Math.random() * 6;
    this.projectiles.push({ mesh, vel: new THREE.Vector3(0, 0, speed) });
  }
}
