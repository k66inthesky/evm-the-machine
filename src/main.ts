// Entry point. Boots the Game singleton which owns the render loop and all
// scenes. Everything downstream hangs off this one import.
import { Game } from './core/game';

// Silence unhandled-rejection noise from injected wallet extensions
// (Binance Wallet / OKX / Coinbase Wallet auto-fire connect attempts when
// they detect window.ethereum and crash with "Cannot read properties of
// undefined (reading 'addListener')" — that's their bug, not ours, but it
// dirties the console and looks alarming to judges). We only swallow if
// the rejection clearly originates inside an injected provider's inpage.js.
window.addEventListener('unhandledrejection', (e) => {
  const stack = String((e.reason as any)?.stack || '');
  const msg = String((e.reason as any)?.message || e.reason || '');
  if (stack.includes('inpage.js') ||
      msg.includes('Failed to connect to MetaMask') ||
      msg.includes("Cannot read properties of undefined (reading 'addListener')")) {
    e.preventDefault();
  }
});

const game = new Game(document.getElementById('app')!);
game.start();

// Expose for debugging from the browser console — the Open Source judges
// will poke at this, and so will I.
(window as any).game = game;

// Tell host platforms the game is ready. Each platform watches its own
// `window` injection and shows a 0% loader until we signal back. We try
// every known method defensively because the SDKs evolve and a wrong
// guess silently no-ops, while staying silent costs us a stuck loader.
//   - Wavedash → window.WavedashJS  (SDK injected by their iframe)
//   - YT Playables → window.ytgame.game.{firstFrameReady,gameReady}
//   - itch.io / standalone → no host present, every call no-ops
function signalReady() {
  const w: any = window;
  try { w.WavedashJS?.ready?.(); } catch {}
  try { w.WavedashJS?.gameLoaded?.(); } catch {}
  try { w.WavedashJS?.gameReady?.(); } catch {}
  try { w.WavedashJS?.firstFrameReady?.(); } catch {}
  try { w.ytgame?.game?.firstFrameReady?.(); } catch {}
  try { w.ytgame?.game?.gameReady?.(); } catch {}
  // Generic postMessage fallback for any iframe host that listens for
  // a ready event (Wavedash playtest historically did).
  try { window.parent?.postMessage({ type: 'ready', source: 'evm-the-machine' }, '*'); } catch {}
  try { window.parent?.postMessage({ type: 'gameReady', source: 'evm-the-machine' }, '*'); } catch {}
  try { window.parent?.postMessage({ type: 'loaded' }, '*'); } catch {}
}
// Fire on next frame so the title screen DOM is mounted first.
setTimeout(signalReady, 0);
// Wavedash sometimes injects WavedashJS slightly after page load; retry
// briefly to catch the late-bind case.
setTimeout(signalReady, 250);
setTimeout(signalReady, 1000);

// Archetype gain HUD flash — global listener so chambers don't have to wire
// their own. When a choice or behavioural event adds weight to one or more
// of the eight axes, a small fixed-position label fades in top-left for ~1.4s
// showing the dimension codes (V/E/C/G/R/S/B/W) and their increments. We
// deliberately don't show what the codes mean — that reveal is what the
// finale's archetype mirror is for. The flash exists to tell the player
// "the machine is paying attention" without spelling out the system.
window.addEventListener('archetype:gain', (e: Event) => {
  const weights = (e as CustomEvent).detail?.weights as Record<string, number> | undefined;
  if (!weights) return;
  // Camera shake on every choice commit — small impulse so the player feels
  // the decision land. The active chamber's FPS controller decays it.
  const ch = (window as any).game?.activeChamber as any;
  if (ch?.fps?.addShake) ch.fps.addShake(0.35);
  const parts = Object.entries(weights)
    .filter(([, v]) => v && v > 0)
    .map(([k, v]) => `+${k}${v && v > 1 ? v : ''}`)
    .join(' ');
  if (!parts) return;
  const label = document.createElement('div');
  label.textContent = `MACHINE · ${parts}`;
  Object.assign(label.style, {
    position: 'fixed', left: '24px', top: '24px',
    padding: '6px 12px',
    border: '1px solid rgba(0,240,255,0.55)',
    background: 'rgba(10,14,26,0.85)',
    color: '#00f0ff',
    fontFamily: 'Courier New, monospace',
    fontSize: '11px',
    letterSpacing: '0.25em',
    textShadow: '0 0 6px rgba(0,240,255,0.6)',
    pointerEvents: 'none',
    zIndex: '70',
    opacity: '0',
    transition: 'opacity 0.25s ease',
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(label);
  setTimeout(() => { label.style.opacity = '1'; }, 16);
  setTimeout(() => { label.style.opacity = '0'; }, 1100);
  setTimeout(() => { label.remove(); }, 1450);
});
