// CreditsScreen — last stop. Calls out the jam, the theme, the challenges,
// and the tools. Kept short because the game is the main event.
import type { Game } from '../core/game';

export class CreditsScreen {
  private root: HTMLDivElement;

  constructor(private game: Game) {
    const host = document.querySelector('#ui') as HTMLDivElement;
    const root = document.createElement('div');
    Object.assign(root.style, {
      position: 'absolute', inset: '0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#0a0e1a', color: '#00f0ff', fontFamily: 'Courier New, monospace', textAlign: 'center',
      pointerEvents: 'auto', padding: '32px',
    });
    root.innerHTML = `
      <div style="font-size:28px;letter-spacing:0.3em;text-shadow:0 0 12px #00f0ff;">CREDITS</div>
      <div style="margin-top:40px;line-height:2.2;font-size:13px;letter-spacing:0.25em;max-width:560px;">
        <div style="opacity:0.6;">DESIGN · CODE · AUDIO</div>
        <div style="font-size:18px;margin-top:4px;">K66</div>
        <div style="opacity:0.6;margin-top:24px;">BUILT WITH</div>
        <div>THREE.JS · VITE · VIEM · TONE.JS · FOUNDRY</div>
        <div style="opacity:0.6;margin-top:24px;">FOR</div>
        <div>GAMEDEV.JS JAM 2026 — THEME: MACHINES</div>
        <div style="opacity:0.6;margin-top:24px;">CHALLENGES</div>
        <div>OPEN SOURCE · ETHEREUM · WAVEDASH</div>
      </div>
      <button id="back" style="margin-top:48px;background:transparent;border:1px solid #00f0ff;color:#00f0ff;padding:10px 32px;font-family:inherit;font-size:12px;letter-spacing:0.25em;cursor:pointer;">&lt; TITLE</button>
    `;
    root.querySelector('#back')?.addEventListener('click', () => game.enterTitle());
    host.appendChild(root);
    this.root = root;
  }

  dispose() { this.root.remove(); }
}
