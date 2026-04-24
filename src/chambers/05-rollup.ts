// Chamber 5 — Rollup.
// Spatial platforming. Three stacked cyan platforms (L1 → L2 → L3). Each
// platform has a glowing purple portal. Jump into the portal to be teleported
// straight up to the next platform. Reach platform L3 (top) to win.
//
// The platforms float in a bottomless void — if the player falls off, they
// respawn on the layer they were last on.
import * as THREE from 'three';
import { Chamber } from './chamber';
import type { Input } from '../core/input';
import { FPSController } from '../core/fps-controller';
import { COLOR } from '../core/palette';

interface Layer { y: number; radius: number; portal: THREE.Mesh; }

export class RollupChamber extends Chamber {
  chamberIndex = 4;
  title = 'ROLLUP';

  private fps!: FPSController;
  private layers: Layer[] = [];
  private currentLayer = 0;
  private teleportCooldown = 0;
  private statusEl: HTMLDivElement | null = null;

  protected build() {
    this.scene.fog = new THREE.Fog(COLOR.bg, 15, 90);

    // A starfield floor just for visual interest — there's no ground here.
    const starGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 200;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: COLOR.cyan, size: 0.15, transparent: true, opacity: 0.6 })));

    const layerCount = 3;
    for (let i = 0; i < layerCount; i++) {
      const y = i * 10;
      const radius = 8 - i * 1.5;
      const disk = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.4, 48, 1),
        new THREE.MeshBasicMaterial({ color: COLOR.cyan, transparent: true, opacity: 0.15 }),
      );
      disk.position.set(0, y, 0);
      this.scene.add(disk);
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(disk.geometry),
        new THREE.LineBasicMaterial({ color: COLOR.cyan }),
      );
      edge.position.copy(disk.position);
      this.scene.add(edge);
      // Label ring — prints "L1" / "L2" / "L3" as floating ring text via rings.
      for (let ring = 0; ring < 3; ring++) {
        const r = radius - 0.3 - ring * 0.25;
        const ringMesh = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.03, 8, 48),
          new THREE.MeshBasicMaterial({ color: COLOR.cyan, transparent: true, opacity: 0.3 - ring * 0.07 }),
        );
        ringMesh.position.set(0, y + 0.25, 0);
        ringMesh.rotation.x = Math.PI / 2;
        this.scene.add(ringMesh);
      }

      // Portal — except on the top layer, which is the win state.
      if (i < layerCount - 1) {
        const portalMat = new THREE.MeshBasicMaterial({ color: COLOR.purple, transparent: true, opacity: 0.8 });
        const portal = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.2, 12, 32), portalMat);
        portal.position.set(0, y + 1.5, radius - 2);
        this.scene.add(portal);
        const core = new THREE.Mesh(
          new THREE.CircleGeometry(1.1, 32),
          new THREE.MeshBasicMaterial({ color: COLOR.purple, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
        );
        core.position.copy(portal.position);
        this.scene.add(core);
        this.layers.push({ y, radius, portal });
      } else {
        // Win marker: a gold core at the top.
        const gold = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.8, 0),
          new THREE.MeshBasicMaterial({ color: COLOR.gold }),
        );
        gold.position.set(0, y + 2, 0);
        this.scene.add(gold);
        this.layers.push({ y, radius, portal: gold });
      }
    }

    this.fps = new FPSController({
      gravity: 22,
      jumpSpeed: 7.5,
      onGroundHeight: (pos) => {
        // Return the height of the disk the player is above, if any.
        const l = this.layers[this.currentLayer];
        const onDisk = Math.hypot(pos.x, pos.z) < l.radius - 0.2;
        return onDisk ? l.y + 0.2 : null;
      },
    });
    this.fps.setPosition(0, this.layers[0].y + 2, -4);
    this.camera = this.fps.camera;

    this.game.hud.crosshair();
    this.game.hud.prompt('FIND THE PORTAL · JUMP TO L2 · L3');
    this.statusEl = this.game.hud.element('L1', {
      position: 'absolute', top: '24px', right: '24px',
      fontFamily: 'Courier New, monospace', fontSize: '24px',
      color: '#8a00f0', letterSpacing: '0.3em', textShadow: '0 0 8px #8a00f0',
      pointerEvents: 'none',
    });
  }

  update(dt: number, input: Input) {
    this.fps.update(dt, input);
    this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);

    // Portal pulse.
    const layer = this.layers[this.currentLayer];
    layer.portal.rotation.z += dt;
    (layer.portal.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(performance.now() * 0.003) * 0.3;

    // Portal teleport check.
    if (this.teleportCooldown === 0 && this.currentLayer < this.layers.length - 1) {
      const portalPos = layer.portal.position;
      if (this.fps.position.distanceTo(portalPos) < 1.6) {
        this.teleport(this.currentLayer + 1);
        return;
      }
    }

    // Final layer: reach the gold.
    if (this.currentLayer === this.layers.length - 1) {
      if (this.fps.position.distanceTo(layer.portal.position) < 2) this.win();
    }

    // Fell off → respawn on current layer.
    if (this.fps.position.y < -20) {
      this.fps.setPosition(0, layer.y + 2, -Math.min(layer.radius - 1, 4));
    }
  }

  private teleport(toIndex: number) {
    this.teleportCooldown = 0.8;
    this.currentLayer = toIndex;
    const l = this.layers[toIndex];
    this.fps.setPosition(0, l.y + 2.5, -Math.min(l.radius - 1.5, 3));
    this.game.audio.playSFX('portal');
    if (this.statusEl) this.statusEl.textContent = `L${toIndex + 1}`;
  }
}
