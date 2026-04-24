// Game — top-level controller. Owns the renderer, the state machine that
// switches between Title → ChamberSelect → Chamber → Finale, and the shared
// services (audio, chain, input). Chambers themselves are dumb scenes; the
// Game tells them when to spawn, tick, and die.
//
// The state machine is intentionally flat — 48h jam, no fancy framework.
import * as THREE from 'three';
import { Renderer } from './renderer';
import { Input } from './input';
import { HUD } from './hud';
import { TitleScreen } from '../screens/title';
import { ChamberSelect } from '../screens/chamber-select';
import { FinaleScreen } from '../screens/finale';
import { CreditsScreen } from '../screens/credits';
import type { Chamber } from '../chambers/chamber';
import { GenesisChamber } from '../chambers/01-genesis';
import { DAOChamber } from '../chambers/02-dao';
import { MergeChamber } from '../chambers/03-merge';
import { GasStormChamber } from '../chambers/04-gas-storm';
import { RollupChamber } from '../chambers/05-rollup';
import { VitalikCoreChamber } from '../chambers/06-vitalik-core';
import { Audio } from '../audio/audio';
import { Chain } from '../chain/chain';
import { Progress } from './progress';
import { installSettings } from './settings';

export type GameState =
  | { kind: 'title' }
  | { kind: 'select' }
  | { kind: 'chamber'; index: number }
  | { kind: 'finale' }
  | { kind: 'credits' };

export const CHAMBER_COUNT = 6;

export class Game {
  renderer: Renderer;
  input: Input;
  hud: HUD;
  audio: Audio;
  chain: Chain;
  progress: Progress;

  state: GameState = { kind: 'title' };
  private activeScreen: { dispose(): void } | null = null;
  private activeChamber: Chamber | null = null;
  private lastTime = 0;

  constructor(private host: HTMLElement) {
    this.renderer = new Renderer(host);
    this.input = new Input(this.renderer.canvas);
    this.hud = new HUD(host.querySelector('#ui') as HTMLDivElement);
    this.audio = new Audio();
    this.chain = new Chain();
    this.progress = new Progress();
  }

  start() {
    installSettings(this.host, this);
    this.enterTitle();
    requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000) || 0;
    this.lastTime = now;
    if (this.state.kind === 'chamber' && this.activeChamber) {
      // Esc bails out to chamber select — escape hatch if the player wants
      // to quit a chamber mid-way.
      if (this.input.wasPressed('Escape')) {
        this.enterSelect();
      } else {
        this.activeChamber.update(dt, this.input);
        this.renderer.render(this.activeChamber.scene, this.activeChamber.camera);
      }
    }
    this.input.endFrame();
    requestAnimationFrame(this.tick);
  };

  // --- State transitions -------------------------------------------------

  private teardown() {
    this.activeScreen?.dispose();
    this.activeScreen = null;
    if (this.activeChamber) {
      this.activeChamber.dispose();
      this.activeChamber = null;
    }
    this.hud.clear();
    this.input.releasePointer();
  }

  enterTitle() {
    this.teardown();
    this.state = { kind: 'title' };
    this.activeScreen = new TitleScreen(this);
  }

  enterSelect() {
    this.teardown();
    this.state = { kind: 'select' };
    this.activeScreen = new ChamberSelect(this);
  }

  enterChamber(index: number) {
    this.teardown();
    this.state = { kind: 'chamber', index };
    this.activeChamber = this.buildChamber(index);
    this.activeChamber.mount(this);
    this.input.requestPointer();
    this.audio.playChamberBGM(index);
  }

  finishChamber(index: number) {
    this.progress.mark(index);
    this.chain.markChamber(index).catch(() => {/* offline ok */});
    if (index + 1 < CHAMBER_COUNT) {
      this.enterChamber(index + 1);
    } else {
      this.enterFinale();
    }
  }

  enterFinale() {
    this.teardown();
    this.state = { kind: 'finale' };
    this.activeScreen = new FinaleScreen(this);
    this.audio.playFinale();
  }

  enterCredits() {
    this.teardown();
    this.state = { kind: 'credits' };
    this.activeScreen = new CreditsScreen(this);
  }

  private buildChamber(index: number): Chamber {
    switch (index) {
      case 0: return new GenesisChamber();
      case 1: return new DAOChamber();
      case 2: return new MergeChamber();
      case 3: return new GasStormChamber();
      case 4: return new RollupChamber();
      case 5: return new VitalikCoreChamber();
      default: throw new Error(`bad chamber index ${index}`);
    }
  }
}

// Re-export THREE to give other modules a single import site if they want it.
export { THREE };
