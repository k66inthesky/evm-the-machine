// TitleScreen — the first thing players see. DOM-based (no 3D scene needed
// yet) so we don't pay startup cost for a scene that's just two buttons.
// Also primes the audio context on first click.
import type { Game } from '../core/game';

export class TitleScreen {
  private root: HTMLDivElement;
  constructor(private game: Game) {
    const host = document.querySelector('#ui') as HTMLDivElement;
    const root = document.createElement('div');
    Object.assign(root.style, {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #12193a 0%, #0a0e1a 60%, #05070f 100%)',
      color: '#00f0ff',
      fontFamily: 'Courier New, monospace',
      textAlign: 'center',
      pointerEvents: 'auto',
    });

    root.innerHTML = `
      <div style="font-size:14px;letter-spacing:0.4em;opacity:0.5;margin-bottom:12px;">GAMEDEV.JS JAM 2026 — THEME: MACHINES</div>
      <div style="font-size:56px;letter-spacing:0.2em;text-shadow:0 0 24px #00f0ff;animation:pulse 3s ease-in-out infinite;">EVM</div>
      <div style="font-size:20px;letter-spacing:0.35em;opacity:0.8;margin-top:4px;">THE&nbsp;&nbsp;MACHINE</div>
      <div style="font-size:14px;letter-spacing:0.25em;margin-top:40px;max-width:640px;line-height:1.9;opacity:0.75;">
        STEP INSIDE THE WORLD COMPUTER.<br/>
        SIX CHAMBERS. SIX MOMENTS OF ETHEREUM.<br/>
        YOUR JOURNEY IS ETCHED ONTO THE CHAIN.
      </div>
      <button id="begin" style="margin-top:60px;padding:16px 48px;font-size:18px;letter-spacing:0.35em;background:transparent;border:2px solid #00f0ff;color:#00f0ff;font-family:inherit;cursor:pointer;text-shadow:0 0 8px #00f0ff;box-shadow:0 0 24px #00f0ff44;">BEGIN&nbsp;&nbsp;&gt;</button>
      <div style="font-size:11px;letter-spacing:0.2em;opacity:0.5;margin-top:24px;">WASD&nbsp;&nbsp;·&nbsp;&nbsp;MOUSE&nbsp;&nbsp;·&nbsp;&nbsp;E&nbsp;INTERACT&nbsp;&nbsp;·&nbsp;&nbsp;SHIFT&nbsp;RUN&nbsp;&nbsp;·&nbsp;&nbsp;SPACE&nbsp;JUMP</div>
      <style>
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
        #begin:hover { background:#00f0ff11; }
      </style>
    `;

    const begin = root.querySelector('#begin') as HTMLButtonElement;
    begin.addEventListener('click', async () => {
      await this.game.audio.prime();
      this.game.enterSelect();
    });

    host.appendChild(root);
    this.root = root;
  }

  dispose() { this.root.remove(); }
}
