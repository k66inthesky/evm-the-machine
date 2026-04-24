// FinaleScreen — shown after Chapter 08 is complete. Reveals the player's
// top two archetypes (the 8-dim vector the chapters have been silently
// adding to), then offers the on-chain Journey NFT mint.
import type { Game } from '../core/game';
import { ARCHETYPE_LABELS } from '../systems/archetype';

const ARCHETYPE_FLAVOR: Record<string, string> = {
  V: 'The Visionary — you hear the machine\'s future first.',
  E: 'The Engineer — you read the machine and believe what you read.',
  C: 'The Capitalist — you watch value find its level.',
  G: 'The Governor — you care who decides, and how.',
  R: 'The Rebel — code is law, and so is refusal.',
  S: 'The Speculator — you are first in and first out.',
  B: 'The Builder — something works because you shipped it.',
  W: 'The Witness — you were there. You remember.',
};

export class FinaleScreen {
  private root: HTMLDivElement;

  constructor(private game: Game) {
    const host = document.querySelector('#ui') as HTMLDivElement;
    const root = document.createElement('div');
    Object.assign(root.style, {
      position: 'absolute', inset: '0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #1a1050 0%, #0a0e1a 70%)',
      color: '#ffd700', fontFamily: 'Courier New, monospace', textAlign: 'center',
      pointerEvents: 'auto',
    });

    const mintBtn = game.chain.hasWallet && game.chain.deployed
      ? `<button id="mint" style="margin-top:36px;padding:18px 56px;font-size:16px;letter-spacing:0.35em;background:transparent;border:2px solid #ffd700;color:#ffd700;font-family:inherit;cursor:pointer;text-shadow:0 0 8px #ffd700;box-shadow:0 0 24px #ffd70044;">MINT&nbsp;JOURNEY&nbsp;NFT</button>
         <div style="font-size:11px;letter-spacing:0.2em;opacity:0.55;margin-top:14px;">SEPOLIA TESTNET · FREE · OPTIONAL</div>`
      : `<div style="margin-top:36px;font-size:13px;letter-spacing:0.25em;opacity:0.6;">${game.chain.deployed ? 'NO WALLET DETECTED' : 'ON-CHAIN LAYER OFFLINE'}</div>`;

    const [first, second] = game.archetype.top(2);
    const revealHtml = first
      ? `<div style="margin-top:36px;padding:24px 32px;border:1px solid #ffd70066;background:#1a105033;max-width:720px;">
           <div style="font-size:11px;letter-spacing:0.35em;opacity:0.7;">ARCHETYPE · MIRROR</div>
           <div style="font-size:28px;letter-spacing:0.22em;margin-top:6px;text-shadow:0 0 12px #ffd70088;">${ARCHETYPE_LABELS[first].toUpperCase()}</div>
           <div style="font-size:14px;letter-spacing:0.08em;opacity:0.85;margin-top:10px;line-height:1.7;">${ARCHETYPE_FLAVOR[first] || ''}</div>
           ${second ? `<div style="font-size:12px;letter-spacing:0.2em;opacity:0.55;margin-top:14px;">SECONDARY · ${ARCHETYPE_LABELS[second].toUpperCase()}</div>` : ''}
         </div>`
      : '';

    root.innerHTML = `
      <div style="font-size:12px;letter-spacing:0.4em;opacity:0.6;">JOURNEY COMPLETE</div>
      <div style="font-size:52px;letter-spacing:0.2em;text-shadow:0 0 32px #ffd700;margin-top:8px;">YOU WALKED THE MACHINE</div>
      <div style="font-size:13px;letter-spacing:0.25em;opacity:0.75;margin-top:22px;max-width:720px;line-height:1.9;">
        LIMIT · WHITEPAPER · SPACESHIP · CROWDSALE · THE DAO · FORK · BLOOM · MERGE<br/>
        EIGHT CHAPTERS TRAVERSED IN FIRST PERSON.<br/>
        THE MACHINE RECORDED EVERYTHING YOU DID.
      </div>
      ${revealHtml}
      ${mintBtn}
      <div id="mintResult" style="margin-top:20px;font-size:12px;letter-spacing:0.2em;min-height:18px;"></div>
      <div style="margin-top:44px;display:flex;gap:24px;">
        <button id="credits" style="background:transparent;border:1px solid #ffd700aa;color:#ffd700aa;padding:10px 28px;font-family:inherit;font-size:12px;letter-spacing:0.25em;cursor:pointer;">CREDITS</button>
        <button id="replay" style="background:transparent;border:1px solid #00f0ff;color:#00f0ff;padding:10px 28px;font-family:inherit;font-size:12px;letter-spacing:0.25em;cursor:pointer;">REPLAY</button>
      </div>
    `;

    root.querySelector('#credits')?.addEventListener('click', () => game.enterCredits());
    root.querySelector('#replay')?.addEventListener('click', () => game.enterSelect());

    const mint = root.querySelector('#mint') as HTMLButtonElement | null;
    const result = root.querySelector('#mintResult') as HTMLDivElement;
    mint?.addEventListener('click', async () => {
      mint.disabled = true;
      mint.textContent = 'MINTING…';
      if (!game.chain.connectedAddress) await game.chain.connect();
      const hash = await game.chain.mintJourney(Math.floor(performance.now() / 1000));
      if (hash) {
        result.innerHTML = `MINTED · <a href="${game.chain.etherscanTx(hash)}" target="_blank" style="color:#ffd700;">VIEW ON ETHERSCAN</a>`;
        game.audio.playSFX('mint');
      } else {
        result.textContent = 'MINT DECLINED OR OFFLINE — PROGRESS STILL SAVED';
      }
      mint.textContent = 'MINT&nbsp;JOURNEY&nbsp;NFT';
      mint.disabled = false;
    });

    host.appendChild(root);
    this.root = root;
  }

  dispose() { this.root.remove(); }
}
