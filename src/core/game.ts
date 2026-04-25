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
import { LimitChamber } from '../chambers/01-limit';
import { WhitepaperChamber } from '../chambers/02-whitepaper';
import { SpaceshipChamber } from '../chambers/03-spaceship';
import { CrowdsaleChamber } from '../chambers/04-crowdsale';
import { TheDaoChamber } from '../chambers/05-thedao';
import { ForkChamber } from '../chambers/06-fork';
import { BloomChamber } from '../chambers/07-bloom';
import { MergeChamber } from '../chambers/08-merge';
import { Audio } from '../audio/audio';
import { Chain } from '../chain/chain';
import { Progress } from './progress';
import { ArchetypeTracker } from '../systems/archetype';
import { installSettings } from './settings';

export type GameState =
  | { kind: 'title' }
  | { kind: 'select' }
  | { kind: 'chamber'; index: number }
  | { kind: 'finale' }
  | { kind: 'credits' };

export const CHAMBER_COUNT = 8;
// Only chapter 01 (index 0) ships with the v2 redesign; 02-08 are locked in the select screen.
const IMPLEMENTED_CHAMBERS = new Set<number>([0, 1, 2, 3, 4, 5, 6, 7]);

export class Game {
  renderer: Renderer;
  input: Input;
  hud: HUD;
  audio: Audio;
  chain: Chain;
  progress: Progress;
  archetype: ArchetypeTracker;

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
    this.archetype = new ArchetypeTracker();
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
      // Bail out to chamber select — ESC, Q, or pointer-unlock (Chrome/FF
      // swallow the ESC keydown that releases pointer lock, so we also
      // watch the unlock edge while the chamber's briefing is dismissed).
      const bail =
        this.input.wasPressed('Escape') ||
        this.input.wasPressed('KeyQ') ||
        (this.input.pointerJustReleased && !this.activeChamber.briefingActive);
      if (bail) {
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
    // Brief fade-to-black during the swap so chambers don't cut hard. The
    // fader element is opacity-only (no pointer-events change) so the
    // briefing card underneath is still clickable the moment it lands.
    const fader = document.getElementById('fader');
    fader?.classList.add('show');
    this.teardown();
    this.state = { kind: 'chamber', index };
    this.activeChamber = this.buildChamber(index);
    this.activeChamber.mount(this);
    this.input.requestPointer();
    this.audio.playChamberBGM(index);
    // Fade back in after a short pause so the new scene has time to render
    // before the overlay clears. setTimeout (not rAF) because backgrounded
    // tabs throttle rAF to ~1Hz and the fader would stick in that case.
    setTimeout(() => fader?.classList.remove('show'), 60);
  }

  finishChamber(index: number) {
    this.progress.mark(index);
    this.chain.markChamber(index).catch(() => {/* offline ok */});
    const next = index + 1;
    if (next >= CHAMBER_COUNT) {
      // Finished the final chapter — archetype mirror / reveal screen.
      this.enterFinale();
    } else if (IMPLEMENTED_CHAMBERS.has(next)) {
      this.enterChamber(next);
    } else {
      this.enterSelect();
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
      case 0: return new LimitChamber();
      case 1: return new WhitepaperChamber();
      case 2: return new SpaceshipChamber();
      case 3: return new CrowdsaleChamber();
      case 4: return new TheDaoChamber();
      case 5: return new ForkChamber();
      case 6: return new BloomChamber();
      case 7: return new MergeChamber();
      default: throw new Error(`chamber ${index + 1} not implemented`);
    }
  }
}

// Re-export THREE to give other modules a single import site if they want it.
export { THREE };
