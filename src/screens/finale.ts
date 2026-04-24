// FinaleScreen — shown after Chamber 6 is complete. Offers the on-chain
// Journey NFT mint (optional, offline-ok) and a link to credits.
import type { Game } from '../core/game';

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

    root.innerHTML = `
      <div style="font-size:12px;letter-spacing:0.4em;opacity:0.6;">JOURNEY COMPLETE</div>
      <div style="font-size:56px;letter-spacing:0.2em;text-shadow:0 0 32px #ffd700;margin-top:8px;">YOU WALKED THE MACHINE</div>
      <div style="font-size:14px;letter-spacing:0.25em;opacity:0.8;margin-top:28px;max-width:720px;line-height:2;">
        GENESIS. THE DAO. THE MERGE. GAS. ROLLUPS. THE CORE.<br/>
        SIX MOMENTS TRAVERSED IN FIRST PERSON.<br/>
        THE WORLD COMPUTER KEEPS YOUR RECORD.
      </div>
      ${mintBtn}
      <div id="mintResult" style="margin-top:20px;font-size:12px;letter-spacing:0.2em;min-height:18px;"></div>
      <div style="margin-top:48px;display:flex;gap:24px;">
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
