// ChamberSelect — the lobby. Eight chapters, each a moment in Ethereum's
// history. All eight ship in the v2 redesign; the card marks which the
// player has already completed.
import type { Game } from '../core/game';

interface ChapterCard {
  idx: number;
  code: string;   // "01" / "02"
  name: string;   // English chapter title
  zh: string;     // Chinese subtitle
  year: string;
  tag: string;    // one-line hook
}

const CHAPTERS: ChapterCard[] = [
  { idx: 0, code: '01', name: 'THE LIMIT',   zh: '極限',     year: '2013', tag: 'A DORM ROOM. A BITCOINTALK TAB.'   },
  { idx: 1, code: '02', name: 'WHITEPAPER',  zh: '白皮書',   year: '2013', tag: 'WORDS TRYING TO BECOME A MACHINE.' },
  { idx: 2, code: '03', name: 'SPACESHIP',   zh: '太空船屋', year: '2014', tag: 'FIVE CO-FOUNDERS IN ZUG.'          },
  { idx: 3, code: '04', name: 'CROWDSALE',   zh: '眾籌之火', year: '2014', tag: 'THIRTY-ONE THOUSAND BTC.'          },
  { idx: 4, code: '05', name: 'THE DAO',     zh: '鏡廳',     year: '2016', tag: 'A REENTRANT HALL OF MIRRORS.'      },
  { idx: 5, code: '06', name: 'FORK',        zh: '分叉',     year: '2016', tag: 'CODE IS LAW — OR IS IT?'           },
  { idx: 6, code: '07', name: 'BLOOM',       zh: '盛放',     year: '2021', tag: 'DEFI SUMMER NEVER ENDED.'          },
  { idx: 7, code: '08', name: 'MERGE',       zh: '熔接',     year: '2022', tag: 'PROOF OF WORK LAYS DOWN.'          },
];

export class ChamberSelect {
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
      background: 'radial-gradient(ellipse at center, #0f1330 0%, #0a0e1a 70%)',
      color: '#00f0ff',
      fontFamily: 'Courier New, monospace',
      padding: '48px 24px',
      pointerEvents: 'auto',
      overflow: 'auto',
    });

    // Wallet area — either shows the connected address, or a pair of buttons
    // (Google + MetaMask). Buttons surface specific status messages inline
    // instead of silently failing like the old single CONNECT WALLET button.
    const walletInfo = game.chain.connectedAddress
      ? `<span style="color:#ffd700;">${short(game.chain.connectedAddress)} <span style="opacity:0.5;font-size:10px;">(${game.chain.connectedVia_ || 'wallet'})</span></span>`
      : `<span id="walletButtons" style="display:inline-flex;gap:8px;">
           <button id="connectGoogle" style="background:#fff;border:1px solid #fff;color:#1a1a2a;padding:6px 14px;font-family:inherit;font-size:11px;letter-spacing:0.2em;cursor:pointer;font-weight:bold;">GOOGLE</button>
           <button id="connectMM" style="background:transparent;border:1px solid #ffa040;color:#ffa040;padding:6px 14px;font-family:inherit;font-size:11px;letter-spacing:0.2em;cursor:pointer;">METAMASK</button>
         </span>`;

    // Machine-readout strip — sells the "you are inside a machine" framing
    // by replacing the title slug with a gauge bank: 8 status lamps + a
    // pulsing power LED + a scrolling tape that reads MACHINE / IDLE /
    // READY / ARCHIVE depending on progress. Cheaper than a 3D HUD,
    // matches the diegetic-canvas idiom of the chambers themselves.
    const dotsHtml = Array.from({ length: 8 }, (_, i) =>
      `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${
        game.progress.has(i) ? '#ffd700' : 'rgba(0,240,255,0.22)'
      };box-shadow:${game.progress.has(i) ? '0 0 6px #ffd700' : 'none'};margin:0 4px;"></span>`
    ).join('');
    const power = game.progress.completedCount() === 8 ? '#ffd700' : '#00f0ff';
    const machineStatus = game.progress.completedCount() === 8
      ? 'JOURNEY · ARCHIVED'
      : game.progress.completedCount() > 0
        ? 'MACHINE · READY · INSERT NEXT CHAPTER'
        : 'MACHINE · IDLE · AWAITING FIRST OPERATOR';
    root.innerHTML = `
      <div style="font-size:28px;letter-spacing:0.3em;text-shadow:0 0 12px #00f0ff;">EVM — THE MACHINE</div>
      <div style="font-size:12px;letter-spacing:0.25em;opacity:0.6;margin-top:6px;">EIGHT CHAPTERS · ONE MACHINE · ONE OF YOU</div>
      <div style="margin-top:18px;display:flex;gap:20px;align-items:center;flex-wrap:wrap;justify-content:center;border:1px solid ${power}55;background:#05080fcc;padding:10px 22px;letter-spacing:0.25em;">
        <span style="display:inline-flex;align-items:center;gap:8px;font-size:11px;color:${power};">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${power};box-shadow:0 0 8px ${power};animation:powerpulse 1.6s ease-in-out infinite;"></span>
          POWER
        </span>
        <span style="opacity:0.55;font-size:11px;">CHAPTERS</span>
        ${dotsHtml}
        <span style="opacity:0.55;font-size:11px;">·</span>
        <span style="font-size:11px;color:${power};">${machineStatus}</span>
      </div>
      <style>@keyframes powerpulse { 0%,100%{opacity:1;} 50%{opacity:0.45;} }</style>
      ${game.progress.completedCount() === 8 ? `
        <button id="claimJourney" style="margin-top:18px;padding:14px 36px;background:transparent;border:2px solid #ffd700;color:#ffd700;font-family:inherit;font-size:14px;letter-spacing:0.32em;cursor:pointer;text-shadow:0 0 8px #ffd700;box-shadow:0 0 24px #ffd70044;animation:powerpulse 2s ease-in-out infinite;">
          ★ CLAIM JOURNEY NFT ★
        </button>
        <div style="font-size:10px;letter-spacing:0.25em;opacity:0.55;margin-top:8px;color:#ffd700;">8 / 8 COMPLETE · MINTABLE ON SEPOLIA · GOOGLE OR METAMASK</div>
      ` : ''}
      <div id="list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:32px;max-width:1200px;width:100%;"></div>
      <div style="margin-top:36px;font-size:12px;letter-spacing:0.25em;display:flex;gap:24px;align-items:center;flex-wrap:wrap;justify-content:center;">
        <span>${game.progress.completedCount()}/8 COMPLETE</span>
        <span>·</span>
        ${walletInfo}
        <span>·</span>
        <button id="back" style="background:transparent;border:1px solid #00f0ff55;color:#00f0ff99;padding:6px 18px;font-family:inherit;font-size:12px;letter-spacing:0.2em;cursor:pointer;">&lt; TITLE</button>
      </div>
      <div id="walletStatus" style="margin-top:14px;font-size:11px;letter-spacing:0.2em;min-height:14px;color:#ffd070;text-align:center;max-width:720px;"></div>
    `;

    const list = root.querySelector('#list') as HTMLDivElement;
    for (const c of CHAPTERS) {
      const done = game.progress.has(c.idx);
      const borderColor = done ? '#ffd700' : '#00f0ff';
      const textColor = done ? '#ffd700' : '#00f0ff';
      const card = document.createElement('div');
      Object.assign(card.style, {
        border: `2px solid ${borderColor}`,
        background: '#00f0ff08',
        padding: '22px 24px',
        cursor: 'pointer',
        boxShadow: `0 0 20px ${borderColor}33`,
        textAlign: 'left',
        position: 'relative',
      });
      const status = done ? 'COMPLETE' : 'READY';
      card.innerHTML = `
        <div style="font-size:10px;letter-spacing:0.3em;opacity:0.6;color:${textColor};">CHAPTER ${c.code} · ${c.year} · ${status}</div>
        <div style="font-size:22px;letter-spacing:0.18em;margin-top:8px;color:${textColor};">${c.name}</div>
        <div style="font-size:14px;letter-spacing:0.25em;margin-top:2px;opacity:0.75;color:${textColor};">${c.zh}</div>
        <div style="font-size:11px;letter-spacing:0.2em;opacity:0.5;margin-top:14px;color:${textColor};">${c.tag}</div>
      `;
      card.addEventListener('click', () => game.enterChamber(c.idx));
      list.appendChild(card);
    }

    root.querySelector('#back')?.addEventListener('click', () => game.enterTitle());
    // 8/8 complete → big "CLAIM JOURNEY NFT" CTA enters the finale screen,
    // which already owns the mint UI (NFT preview card + Coinbase / MetaMask
    // buttons + result line). Players who replay don't have to play through
    // ch08 again to reach the mint.
    root.querySelector('#claimJourney')?.addEventListener('click', () => game.enterFinale());

    const status = root.querySelector('#walletStatus') as HTMLDivElement;
    const buttons = root.querySelector('#walletButtons') as HTMLDivElement | null;
    const setBusy = (msg: string) => {
      if (status) status.textContent = msg;
      if (buttons) buttons.style.opacity = '0.5';
    };
    const setIdle = (msg: string) => {
      if (status) status.textContent = msg;
      if (buttons) buttons.style.opacity = '1';
    };
    const onConnected = (addrShort: string, via: string) => {
      if (buttons) buttons.innerHTML = `<span style="color:#ffd700;">${addrShort} <span style="opacity:0.5;font-size:10px;">(${via})</span></span>`;
      setIdle(game.progress.completedCount() === 8
        ? 'CONNECTED · CLICK ★ CLAIM JOURNEY NFT ★ ABOVE TO MINT'
        : 'CONNECTED · MINT BUTTON UNLOCKS WHEN YOU COMPLETE ALL 8 CHAPTERS');
    };

    root.querySelector('#connectMM')?.addEventListener('click', async () => {
      setBusy('OPENING METAMASK…');
      const r = await game.chain.connect();
      if (r.kind === 'connected') onConnected(short(r.address), 'metamask');
      else if (r.kind === 'no-wallet') setIdle('NO METAMASK DETECTED · INSTALL METAMASK OR USE GOOGLE');
      else if (r.kind === 'rejected') setIdle('METAMASK REQUEST REJECTED · TRY AGAIN OR USE GOOGLE');
      else if (r.kind === 'wrong-chain') setIdle(`WRONG NETWORK (CHAIN ${r.chainId}) · SWITCH TO SEPOLIA IN METAMASK`);
      else setIdle('CONNECTION FAILED · TRY GOOGLE');
    });

    root.querySelector('#connectGoogle')?.addEventListener('click', async () => {
      setBusy('OPENING GOOGLE LOGIN…');
      const r = await game.chain.connectWithGoogle();
      if (r.kind === 'connected') onConnected(short(r.address), 'google');
      else if (r.kind === 'no-google-config') setIdle('COINBASE SMART WALLET FAILED TO LOAD · CHECK CONNECTION');
      else if (r.kind === 'google-cancelled') setIdle('SMART WALLET LOGIN CANCELLED · TRY AGAIN OR USE METAMASK');
      else setIdle('CONNECTION FAILED · TRY METAMASK');
    });

    host.appendChild(root);
    this.root = root;
  }

  dispose() { this.root.remove(); }
}

function short(a: string): string { return `${a.slice(0, 6)}…${a.slice(-4)}`; }
