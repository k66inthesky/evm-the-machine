// FPSController — classic Quake-style first-person controls for a
// THREE.PerspectiveCamera. No physics engine; we step manually.
//
// Yaw rotates around world Y (horizontal look), pitch rotates around local X
// (vertical look). We store them as euler angles instead of composing the
// camera's quaternion directly because that's easier to clamp and debug.
//
// Collision is handled per-chamber with AABB queries — this controller just
// applies a caller-supplied `canMoveTo(next)` predicate.
import * as THREE from 'three';
import type { Input } from './input';

export interface FPSConfig {
  walkSpeed?: number;
  sprintSpeed?: number;
  jumpSpeed?: number;
  gravity?: number;
  mouseSensitivity?: number;
  eyeHeight?: number;
  canMoveTo?: (next: THREE.Vector3) => boolean;
  onGroundHeight?: (pos: THREE.Vector3) => number | null;
  /** Called once per visual head-bob cycle while moving — chambers wire
   *  this to the audio kit's 'step' SFX so footsteps match the bob. */
  onFootstep?: () => void;
}

export class FPSController {
  camera: THREE.PerspectiveCamera;
  position = new THREE.Vector3(0, 1.6, 0);
  private velocityY = 0;
  private yaw = 0;
  private pitch = 0;
  private grounded = true;
  // Walking head-bob: a small vertical offset added to the camera each frame
  // when the player is moving. Phase advances with travel distance so it
  // feels like footsteps, not just a sine over time. Subtle enough not to
  // induce nausea (~3 cm peak) but adds the bodily presence the chambers
  // were missing.
  private bobPhase = 0;
  cfg: Required<FPSConfig>;

  constructor(cfg: FPSConfig = {}) {
    this.cfg = {
      walkSpeed: 5.5,
      sprintSpeed: 9.0,
      jumpSpeed: 6.5,
      gravity: 18,
      mouseSensitivity: 0.0022,
      eyeHeight: 1.6,
      canMoveTo: () => true,
      onGroundHeight: () => 0,
      onFootstep: () => {},
      ...cfg,
    };
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.copy(this.position);
  }

  setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.camera.position.copy(this.position);
    this.velocityY = 0;
  }

  setYaw(y: number) {
    this.yaw = y;
    this.applyRotation();
  }

  update(dt: number, input: Input) {
    // Look
    this.yaw -= input.mouseDX * this.cfg.mouseSensitivity;
    this.pitch -= input.mouseDY * this.cfg.mouseSensitivity;
    const maxPitch = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    this.applyRotation();

    // Move
    const speed = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')
      ? this.cfg.sprintSpeed
      : this.cfg.walkSpeed;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    if (input.keys.has('KeyW')) wish.add(fwd);
    if (input.keys.has('KeyS')) wish.sub(fwd);
    if (input.keys.has('KeyD')) wish.add(right);
    if (input.keys.has('KeyA')) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed * dt);

    // X/Z with collision
    const nextX = this.position.clone().add(new THREE.Vector3(wish.x, 0, 0));
    if (this.cfg.canMoveTo(nextX)) this.position.x = nextX.x;
    const nextZ = this.position.clone().add(new THREE.Vector3(0, 0, wish.z));
    if (this.cfg.canMoveTo(nextZ)) this.position.z = nextZ.z;

    // Gravity + ground
    this.velocityY -= this.cfg.gravity * dt;
    this.position.y += this.velocityY * dt;
    const groundY = this.cfg.onGroundHeight(this.position);
    if (groundY !== null) {
      const floor = groundY + this.cfg.eyeHeight;
      if (this.position.y <= floor) {
        this.position.y = floor;
        this.velocityY = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    }

    if (input.wasPressed('Space') && this.grounded) {
      this.velocityY = this.cfg.jumpSpeed;
      this.grounded = false;
    }

    // Head-bob: advance phase by travel distance, ease toward zero when idle
    // so the camera doesn't snap back to centre on stop. Fire a footstep
    // SFX whenever the bob crosses a downstroke (sin transitions through
    // zero descending) — that's when a real foot would hit the floor.
    const moved = wish.length();
    if (moved > 0) {
      const prevPhase = this.bobPhase;
      this.bobPhase += moved * 8;
      const prevSin = Math.sin(prevPhase);
      const newSin = Math.sin(this.bobPhase);
      // Downstroke crossing: prev positive, now negative.
      if (prevSin > 0 && newSin <= 0) this.cfg.onFootstep();
    }
    const targetBob = moved > 0 ? Math.sin(this.bobPhase) * 0.03 : 0;
    this.camera.position.copy(this.position);
    this.camera.position.y += targetBob;
  }

  private applyRotation() {
    const q = new THREE.Quaternion();
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    q.multiplyQuaternions(qYaw, qPitch);
    this.camera.quaternion.copy(q);
  }

  forward(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  lookDirection(): THREE.Vector3 {
    const v = new THREE.Vector3(0, 0, -1);
    v.applyQuaternion(this.camera.quaternion);
    return v;
  }
}
