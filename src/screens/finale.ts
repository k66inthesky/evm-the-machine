// FinaleScreen — shown after Chapter 08 is complete. Reveals the player's
// top two archetypes (the 8-dim vector the chapters have been silently
// adding to), shows the Journey NFT artwork, and offers two ways to mint:
// MetaMask (existing flow) or Google login (thirdweb inAppWallet, smart
// wallet under the hood — this is the lower-barrier path for web2 players).
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

// Same image the contract advertises in its tokenURI — we preview it here
// before the mint so the player sees what they're about to get.
const NFT_PREVIEW_URL = 'https://raw.githubusercontent.com/k66inthesky/evm-the-machine/main/submission/cover.png';

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
      pointerEvents: 'auto', overflowY: 'auto', padding: '40px 24px',
    });

    const [first, second] = game.archetype.top(2);
    const revealHtml = first
      ? `<div style="margin-top:30px;padding:22px 32px;border:1px solid #ffd70066;background:#1a105033;max-width:720px;">
           <div style="font-size:11px;letter-spacing:0.35em;opacity:0.7;">ARCHETYPE · MIRROR</div>
           <div style="font-size:28px;letter-spacing:0.22em;margin-top:6px;text-shadow:0 0 12px #ffd70088;">${ARCHETYPE_LABELS[first].toUpperCase()}</div>
           <div style="font-size:14px;letter-spacing:0.08em;opacity:0.85;margin-top:10px;line-height:1.7;">${ARCHETYPE_FLAVOR[first] || ''}</div>
           ${second ? `<div style="font-size:12px;letter-spacing:0.2em;opacity:0.55;margin-top:14px;">SECONDARY · ${ARCHETYPE_LABELS[second].toUpperCase()}</div>` : ''}
         </div>`
      : '';

    // NFT preview card — shown whether or not the chain is online so the
    // player sees the souvenir even without a wallet.
    const nftCardHtml = `
      <div id="nftCard" style="margin-top:32px;padding:18px;border:1px solid #ffd70066;background:#0a0a14cc;max-width:560px;">
        <div style="font-size:10px;letter-spacing:0.4em;opacity:0.55;">JOURNEY · NFT · SOULBOUND · SEPOLIA</div>
        <img src="${NFT_PREVIEW_URL}" alt="Journey NFT artwork"
             style="display:block;width:100%;max-width:520px;margin:14px auto 0;border:1px solid #ffd70033;background:#000;" />
        <div style="font-size:12px;letter-spacing:0.18em;opacity:0.65;margin-top:12px;line-height:1.7;">
          The artwork is the EVM: The Machine cover — neon EVM hero on the BLOOM trading-floor.<br/>
          Soulbound: it stays in the wallet that earned it.
        </div>
      </div>
    `;

    // Wallet section. Both buttons are ALWAYS shown when the chain is
    // deployed — that way the player sees both options and the click handler
    // surfaces a clear, specific error if a path isn't yet configured. (The
    // old "hide the Google button when no clientId" UX was confusing because
    // the player didn't know the option existed.)
    let walletHtml = '';
    if (game.chain.deployed) {
      walletHtml = `
        <div style="margin-top:30px;display:flex;gap:14px;flex-wrap:wrap;justify-content:center;">
          <button id="mintGoogle" style="padding:16px 32px;font-size:13px;letter-spacing:0.28em;background:#fff;border:2px solid #fff;color:#1a1a2a;font-family:inherit;cursor:pointer;font-weight:bold;">CLAIM&nbsp;WITH&nbsp;GOOGLE</button>
          <button id="mintMM" style="padding:16px 32px;font-size:13px;letter-spacing:0.28em;background:transparent;border:2px solid #ffd700;color:#ffd700;font-family:inherit;cursor:pointer;text-shadow:0 0 6px #ffd700;">CLAIM&nbsp;WITH&nbsp;METAMASK</button>
        </div>
        <div style="font-size:10px;letter-spacing:0.2em;opacity:0.5;margin-top:12px;">SEPOLIA TESTNET · FREE · OPTIONAL · NO GAS REQUIRED FOR GOOGLE PATH</div>
      `;
    } else {
      walletHtml = `<div style="margin-top:30px;font-size:13px;letter-spacing:0.25em;opacity:0.6;">ON-CHAIN LAYER OFFLINE — JOURNEY STILL SAVED LOCALLY</div>`;
    }

    root.innerHTML = `
      <div style="font-size:12px;letter-spacing:0.4em;opacity:0.6;">JOURNEY COMPLETE</div>
      <div style="font-size:48px;letter-spacing:0.2em;text-shadow:0 0 32px #ffd700;margin-top:8px;">YOU WALKED THE MACHINE</div>
      <div style="font-size:12px;letter-spacing:0.22em;opacity:0.7;margin-top:18px;max-width:720px;line-height:1.85;">
        LIMIT · WHITEPAPER · SPACESHIP · CROWDSALE · THE DAO · FORK · BLOOM · MERGE<br/>
        EIGHT CHAPTERS TRAVERSED IN FIRST PERSON.<br/>
        THE MACHINE RECORDED EVERYTHING YOU DID.
      </div>
      ${revealHtml}
      ${nftCardHtml}
      ${walletHtml}
      <div id="mintResult" style="margin-top:18px;font-size:12px;letter-spacing:0.2em;min-height:18px;max-width:560px;"></div>
      <div style="margin-top:36px;display:flex;gap:18px;">
        <button id="credits" style="background:transparent;border:1px solid #ffd700aa;color:#ffd700aa;padding:10px 24px;font-family:inherit;font-size:12px;letter-spacing:0.25em;cursor:pointer;">CREDITS</button>
        <button id="replay" style="background:transparent;border:1px solid #00f0ff;color:#00f0ff;padding:10px 24px;font-family:inherit;font-size:12px;letter-spacing:0.25em;cursor:pointer;">REPLAY</button>
      </div>
    `;

    root.querySelector('#credits')?.addEventListener('click', () => game.enterCredits());
    root.querySelector('#replay')?.addEventListener('click', () => game.enterSelect());

    const result = root.querySelector('#mintResult') as HTMLDivElement;
    const setBusy = (btn: HTMLButtonElement | null, busy: boolean, label: string) => {
      if (!btn) return;
      btn.disabled = busy;
      if (busy) btn.textContent = 'MINTING…';
      else btn.innerHTML = label;
    };

    const statusToMsg = (status: any): string => {
      switch (status.kind) {
        case 'no-wallet': return 'NO METAMASK DETECTED · INSTALL METAMASK OR USE GOOGLE PATH';
        case 'rejected': return 'METAMASK REQUEST REJECTED · TRY AGAIN OR USE GOOGLE PATH';
        case 'wrong-chain': return `WRONG NETWORK (CHAIN ${status.chainId}) · SWITCH TO SEPOLIA`;
        case 'no-google-config': return 'COINBASE SMART WALLET FAILED TO LOAD · CHECK CONNECTION';
        case 'google-cancelled': return 'SMART WALLET LOGIN CANCELLED · TRY AGAIN OR USE METAMASK';
        default: return 'WALLET CONNECTION FAILED · TRY THE OTHER PATH';
      }
    };

    const handleMint = async (via: 'metamask' | 'google') => {
      const btnMM = root.querySelector('#mintMM') as HTMLButtonElement | null;
      const btnG = root.querySelector('#mintGoogle') as HTMLButtonElement | null;
      const btn = via === 'google' ? btnG : btnMM;
      const label = via === 'google' ? 'CLAIM&nbsp;WITH&nbsp;GOOGLE' : 'CLAIM&nbsp;WITH&nbsp;METAMASK';
      setBusy(btn, true, label);
      result.textContent = via === 'google' ? 'OPENING GOOGLE LOGIN…' : 'WAITING FOR WALLET…';
      try {
        if (!game.chain.connectedAddress) {
          const status = via === 'google' ? await game.chain.connectWithGoogle() : await game.chain.connect();
          if (status.kind !== 'connected') {
            result.textContent = statusToMsg(status);
            setBusy(btn, false, label);
            return;
          }
        }
        result.textContent = 'SIGNING MINT…';
        const hash = await game.chain.mintJourney(Math.floor(performance.now() / 1000));
        if (hash) {
          result.innerHTML = `MINTED · <a href="${game.chain.etherscanTx(hash)}" target="_blank" style="color:#ffd700;text-decoration:underline;">VIEW ON ETHERSCAN</a>`;
          game.audio.playSFX('mint');
        } else {
          result.textContent = 'MINT FAILED OR DECLINED · PROGRESS STILL SAVED LOCALLY';
        }
      } finally {
        setBusy(btn, false, label);
      }
    };

    (root.querySelector('#mintMM') as HTMLButtonElement | null)?.addEventListener('click', () => handleMint('metamask'));
    (root.querySelector('#mintGoogle') as HTMLButtonElement | null)?.addEventListener('click', () => handleMint('google'));

    host.appendChild(root);
    this.root = root;
  }

  dispose() { this.root.remove(); }
}
