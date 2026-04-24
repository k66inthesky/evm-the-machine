// Chamber — base class for the six rooms. Each concrete chamber builds its
// own THREE.Scene + camera, drives its own update loop, and eventually calls
// `this.win()` to hand control back to the Game.
//
// Keeping this deliberately thin so each chamber is mostly self-contained
// and judges can read 06-vitalik-core.ts without tracing eight layers of
// inheritance.
import * as THREE from 'three';
import type { Input } from '../core/input';
import type { Game } from '../core/game';

export abstract class Chamber {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  protected game!: Game;
  protected disposables: (() => void)[] = [];
  protected won = false;

  abstract chamberIndex: number;
  abstract title: string;

  mount(game: Game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.build();
    const titleEl = this.game.hud.title(this.title, `Chamber ${this.chamberIndex + 1} / 6`);
    // Fade the title after 3s so it doesn't clutter the playfield.
    setTimeout(() => {
      titleEl.style.transition = 'opacity 1.5s';
      titleEl.style.opacity = '0';
    }, 3000);
  }

  protected abstract build(): void;
  abstract update(dt: number, input: Input): void;

  protected win() {
    if (this.won) return;
    this.won = true;
    this.game.audio.playSFX('win');
    // Short pause so the player sees the win feedback before the next chamber loads.
    setTimeout(() => this.game.finishChamber(this.chamberIndex), 900);
  }

  dispose() {
    for (const fn of this.disposables) fn();
    this.disposables = [];
    this.scene?.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m: any) => m.dispose?.());
      }
    });
  }
}
