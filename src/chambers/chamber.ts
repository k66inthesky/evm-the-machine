// Chamber — base class for the eight chapters. Each concrete chamber builds
// its own THREE.Scene + camera, drives its own update loop, and eventually
// calls `this.win()` to hand control back to the Game.
//
// Helpers live here for cross-chamber UI concerns: an opening briefing card,
// a persistent "objective" tag, a crosshair, and the ESC hint. These keep
// each chamber file focused on its own world-building and interactions.
import * as THREE from 'three';
import type { Input } from '../core/input';
import type { Game } from '../core/game';

export interface BriefingSpec {
  code: string;          // "CHAPTER 02 · 2013"
  title: string;         // "WHITEPAPER"
  subtitle: string;      // "白皮書 · 2013 · TORONTO"
  body: string;          // story setup (one sentence or two)
  action: string;        // what to do (verbs + keys)
  objective: string;     // initial objective tag text
}

export abstract class Chamber {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  protected game!: Game;
  protected disposables: (() => void)[] = [];
  protected won = false;

  // HUD elements owned by the base class.
  protected briefingActive = true;
  private objectiveEl: HTMLDivElement | null = null;
  private crosshairEl: HTMLDivElement | null = null;
  private escHintEl: HTMLDivElement | null = null;
  private briefingEl: HTMLDivElement | null = null;

  abstract chamberIndex: number;
  abstract title: string;

  mount(game: Game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.build();
    const titleEl = this.game.hud.title(this.title, `Chapter ${String(this.chamberIndex + 1).padStart(2, '0')} / 08`);
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

  // ---- HUD helpers — callable from each concrete chamber's build() -------

  protected installBriefing(spec: BriefingSpec) {
    // Persistent objective tag + crosshair + ESC hint.
    this.objectiveEl = this.game.hud.element('', {
      position: 'absolute', right: '24px', top: '24px',
      padding: '8px 14px', border: '1px solid #00f0ff55',
      background: '#0a0e1acc', color: '#00f0ff',
      fontFamily: 'Courier New, monospace', fontSize: '12px',
      letterSpacing: '0.2em', textTransform: 'uppercase',
      textShadow: '0 0 6px #00f0ff88', pointerEvents: 'none',
      maxWidth: '360px',
    });
    this.setObjective(spec.objective);

    this.crosshairEl = this.game.hud.element('+', {
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)', color: '#00f0ff',
      fontFamily: 'Courier New, monospace', fontSize: '18px',
      opacity: '0.55', pointerEvents: 'none',
    });

    this.escHintEl = this.game.hud.element('ESC · BACK TO CHAPTER SELECT', {
      position: 'absolute', right: '24px', bottom: '24px',
      color: '#00f0ff99', fontFamily: 'Courier New, monospace',
      fontSize: '11px', letterSpacing: '0.2em', opacity: '0.7',
      pointerEvents: 'none',
    });

    // Full-screen briefing card.
    const html = `
      <div style="max-width:640px;padding:32px 40px;border:1px solid #00f0ff66;background:#05070ee8;box-shadow:0 0 32px #00f0ff22;">
        <div style="font-size:11px;letter-spacing:0.35em;color:#7ac8ff;opacity:0.7;">${spec.code}</div>
        <div style="font-size:28px;letter-spacing:0.22em;color:#00f0ff;margin-top:4px;text-shadow:0 0 10px #00f0ff88;">${spec.title}</div>
        <div style="font-size:14px;letter-spacing:0.18em;color:#9adfff;margin-top:2px;opacity:0.75;">${spec.subtitle}</div>
        <div style="height:1px;background:#00f0ff33;margin:20px 0;"></div>
        <div style="font-size:14px;line-height:1.85;color:#d0e8ff;letter-spacing:0.04em;">${spec.body}</div>
        <div style="height:12px;"></div>
        <div style="font-size:13px;line-height:1.9;color:#9adfff;letter-spacing:0.04em;">
          <b style="color:#ffd070;">WHAT TO DO —</b> ${spec.action}
        </div>
        <div style="height:16px;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:12px;color:#7ac8ff;letter-spacing:0.15em;">
          <span><b>WASD</b> · MOVE</span>
          <span><b>MOUSE</b> · LOOK</span>
          <span><b>E</b> · INTERACT</span>
          <span><b>SHIFT</b> · RUN</span>
          <span><b>1-4</b> · CHOOSE</span>
          <span><b>ESC</b> · BACK TO SELECT</span>
        </div>
        <div style="margin-top:26px;text-align:center;font-size:13px;letter-spacing:0.35em;color:#ffd070;animation:briefPulse 1.4s ease-in-out infinite;">
          [ CLICK OR PRESS ANY KEY TO BEGIN ]
        </div>
        <style>@keyframes briefPulse { 0%,100%{opacity:1;} 50%{opacity:0.45;} }</style>
      </div>
    `;
    this.briefingEl = this.game.hud.element(html, {
      position: 'absolute', inset: '0', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#000000b8', backdropFilter: 'blur(2px)',
      pointerEvents: 'auto', cursor: 'pointer', zIndex: '50',
    });
    const dismiss = () => this.dismissBriefing();
    this.briefingEl.addEventListener('click', dismiss);
    const keyHandler = () => { if (this.briefingActive) dismiss(); };
    window.addEventListener('keydown', keyHandler);
    this.disposables.push(() => window.removeEventListener('keydown', keyHandler));
  }

  protected dismissBriefing() {
    if (!this.briefingActive) return;
    this.briefingActive = false;
    if (this.briefingEl) {
      this.briefingEl.style.transition = 'opacity 0.35s';
      this.briefingEl.style.opacity = '0';
      this.briefingEl.style.pointerEvents = 'none';
      setTimeout(() => this.briefingEl?.remove(), 400);
    }
    this.game.input.requestPointer();
  }

  protected setObjective(text: string) {
    if (this.objectiveEl) {
      this.objectiveEl.innerHTML = `<span style="opacity:0.55;">OBJECTIVE ·</span> ${text}`;
    }
  }
}
