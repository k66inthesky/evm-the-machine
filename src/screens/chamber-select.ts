// ChamberSelect — the lobby between title and chamber play. Shows the six
// chambers, which ones are completed (from localStorage), and a wallet-
// connect button. Players can re-enter any completed chamber or start fresh.
import type { Game } from '../core/game';

const CHAMBERS = [
  { idx: 0, name: 'Genesis',         tag: 'THE FIRST BLOCK'        },
  { idx: 1, name: 'The DAO',         tag: 'THE REENTRANCY LOOP'    },
  { idx: 2, name: 'The Merge',       tag: 'PROOF OF STAKE'         },
  { idx: 3, name: 'Gas Storm',       tag: 'SURVIVE THE FEES'       },
  { idx: 4, name: 'Rollup',          tag: 'LAYER BY LAYER'         },
  { idx: 5, name: "Vitalik's Core",  tag: 'MINT YOUR JOURNEY'      },
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

    const walletInfo = game.chain.connectedAddress
      ? `<span style="color:#ffd700;">${short(game.chain.connectedAddress)}</span>`
      : game.chain.hasWallet
        ? '<button id="connect" style="background:transparent;border:1px solid #8a00f0;color:#8a00f0;padding:6px 18px;font-family:inherit;font-size:12px;letter-spacing:0.2em;cursor:pointer;">CONNECT WALLET</button>'
        : '<span style="opacity:0.5;font-size:12px;">NO WALLET — OFFLINE MODE</span>';

    root.innerHTML = `
      <div style="font-size:28px;letter-spacing:0.3em;text-shadow:0 0 12px #00f0ff;">SELECT CHAMBER</div>
      <div style="font-size:12px;letter-spacing:0.25em;opacity:0.6;margin-top:6px;">YOUR PATH THROUGH THE MACHINE</div>
      <div id="list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:40px;max-width:1100px;width:100%;"></div>
      <div style="margin-top:36px;font-size:12px;letter-spacing:0.25em;display:flex;gap:24px;align-items:center;">
        <span>${game.progress.completedCount()}/6 COMPLETE</span>
        <span>·</span>
        ${walletInfo}
        <span>·</span>
        <button id="back" style="background:transparent;border:1px solid #00f0ff55;color:#00f0ff99;padding:6px 18px;font-family:inherit;font-size:12px;letter-spacing:0.2em;cursor:pointer;">&lt; TITLE</button>
      </div>
    `;

    const list = root.querySelector('#list') as HTMLDivElement;
    for (const c of CHAMBERS) {
      const done = game.progress.has(c.idx);
      const locked = c.idx > 0 && !game.progress.has(c.idx - 1);
      const card = document.createElement('div');
      const borderColor = done ? '#ffd700' : locked ? '#ffffff22' : '#00f0ff';
      const textColor = done ? '#ffd700' : locked ? '#ffffff44' : '#00f0ff';
      Object.assign(card.style, {
        border: `2px solid ${borderColor}`,
        background: locked ? '#ffffff04' : '#00f0ff08',
        padding: '24px',
        cursor: locked ? 'not-allowed' : 'pointer',
        boxShadow: locked ? 'none' : `0 0 20px ${borderColor}33`,
        textAlign: 'left',
      });
      card.innerHTML = `
        <div style="font-size:10px;letter-spacing:0.3em;opacity:0.6;color:${textColor};">CHAMBER ${String(c.idx + 1).padStart(2, '0')}${done ? ' · COMPLETE' : locked ? ' · LOCKED' : ''}</div>
        <div style="font-size:22px;letter-spacing:0.15em;margin-top:6px;color:${textColor};">${c.name.toUpperCase()}</div>
        <div style="font-size:12px;letter-spacing:0.2em;opacity:0.5;margin-top:12px;color:${textColor};">${c.tag}</div>
      `;
      if (!locked) card.addEventListener('click', () => game.enterChamber(c.idx));
      list.appendChild(card);
    }

    root.querySelector('#back')?.addEventListener('click', () => game.enterTitle());
    root.querySelector('#connect')?.addEventListener('click', async () => {
      await game.chain.connect();
      // Refresh this screen to show the connected state.
      game.enterSelect();
    });

    host.appendChild(root);
    this.root = root;
  }

  dispose() { this.root.remove(); }
}

function short(a: string): string { return `${a.slice(0, 6)}…${a.slice(-4)}`; }
