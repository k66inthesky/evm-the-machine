// Chamber 2 — The DAO.
// Escape puzzle. Player is placed in a mirror-hall maze representing the
// 2016 reentrancy attack. Red falling glyphs (Matrix-style) mark the exit
// corridor. Follow them to the green exit portal. Win on touching the portal.
//
// We build the maze as a ring of tall wireframe columns with one "gap" —
// that gap is the only way out. The gap rotates so the player has to follow
// the visual cue (the falling glyphs are brightest along the correct angle).
import * as THREE from 'three';
import { Chamber } from './chamber';
import type { Input } from '../core/input';
import { FPSController } from '../core/fps-controller';
import { COLOR } from '../core/palette';

export class DAOChamber extends Chamber {
  chamberIndex = 1;
  title = 'THE DAO';

  private fps!: FPSController;
  private exitPortal!: THREE.Mesh;
  private glyphs: { mesh: THREE.Mesh; speed: number; baseY: number }[] = [];
  private clock = 0;

  protected build() {
    this.scene.fog = new THREE.Fog(0x110010, 5, 45);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshBasicMaterial({ color: 0x0a0010 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(80, 40, COLOR.red, 0x220011);
    (grid.material as any).opacity = 0.4;
    (grid.material as any).transparent = true;
    this.scene.add(grid);

    // A ring of pillars — simulates the "hall of mirrors" / recursion.
    const pillarCount = 24;
    const radius = 14;
    const gapAngle = Math.PI * 0.15; // 27° gap
    const exitAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < pillarCount; i++) {
      const a = (i / pillarCount) * Math.PI * 2;
      // Skip pillars in the gap around the exit angle.
      const diff = Math.abs(((a - exitAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff > Math.PI - gapAngle) continue;
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 8, 0.8),
        new THREE.MeshBasicMaterial({ color: COLOR.red, wireframe: true }),
      );
      pillar.position.set(Math.cos(a) * radius, 4, Math.sin(a) * radius);
      this.scene.add(pillar);
    }

    // Exit portal: a glowing green rectangle placed in the gap.
    const portalMat = new THREE.MeshBasicMaterial({ color: 0x00ff77, transparent: true, opacity: 0.85 });
    this.exitPortal = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 4), portalMat);
    this.exitPortal.position.set(Math.cos(exitAngle) * (radius + 0.5), 2, Math.sin(exitAngle) * (radius + 0.5));
    this.exitPortal.lookAt(0, 2, 0);
    this.scene.add(this.exitPortal);
    // Portal frame so it reads as a door even when you're staring at it head-on.
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.7, 4.2)),
      new THREE.LineBasicMaterial({ color: 0x00ff77 }),
    );
    frame.position.copy(this.exitPortal.position);
    frame.rotation.copy(this.exitPortal.rotation);
    this.scene.add(frame);

    // Falling red glyphs — small vertical lines that spawn above, fall down,
    // and fade. The cluster toward the exit angle is denser → visual hint.
    for (let i = 0; i < 80; i++) {
      // Bias angle toward exitAngle so roughly 1/3 of glyphs are in the exit direction.
      const biased = Math.random() < 0.4 ? exitAngle + (Math.random() - 0.5) * 0.7 : Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 14;
      const x = Math.cos(biased) * r;
      const z = Math.sin(biased) * r;
      const baseY = 6 + Math.random() * 4;
      const glyph = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.5 + Math.random() * 0.8, 0.12),
        new THREE.MeshBasicMaterial({ color: COLOR.red, transparent: true, opacity: 0.6 + Math.random() * 0.4 }),
      );
      glyph.position.set(x, baseY, z);
      this.scene.add(glyph);
      this.glyphs.push({ mesh: glyph, speed: 1 + Math.random() * 2, baseY });
    }

    this.fps = new FPSController({ onGroundHeight: () => 0 });
    this.fps.setPosition(0, 1.6, 0);
    this.camera = this.fps.camera;

    this.game.hud.crosshair();
    this.game.hud.prompt('FIND THE EXIT · FOLLOW THE FALLING CODE');
  }

  update(dt: number, input: Input) {
    this.fps.update(dt, input);
    this.clock += dt;

    // Glyph rain.
    for (const g of this.glyphs) {
      g.mesh.position.y -= g.speed * dt;
      if (g.mesh.position.y < 0) g.mesh.position.y = g.baseY;
    }

    // Portal pulse + win check.
    const pulse = (Math.sin(this.clock * 4) + 1) * 0.5;
    (this.exitPortal.material as THREE.MeshBasicMaterial).opacity = 0.6 + pulse * 0.4;
    if (this.fps.position.distanceTo(this.exitPortal.position) < 2.2) {
      this.game.audio.playSFX('portal');
      this.win();
    }
  }
}
