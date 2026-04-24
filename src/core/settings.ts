// Settings — floating overlay gear in the top-right corner. Persists across
// screens (not cleared by hud.clear()). Scope is intentionally tiny: volume
// slider, mute, fullscreen toggle. The jam design doc explicitly forbids
// anything more.
import type { Game } from './game';

const KEY = 'evm-machine-settings-v1';

export function installSettings(host: HTMLElement, game: Game) {
  const saved = loadSaved();
  game.audio.setVolume(saved.muted ? 0 : saved.volume);

  const bar = document.createElement('div');
  Object.assign(bar.style, {
    position: 'fixed',
    top: '12px',
    left: '12px',
    display: 'flex',
    gap: '6px',
    zIndex: '100',
    fontFamily: 'Courier New, monospace',
    fontSize: '11px',
    letterSpacing: '0.2em',
    pointerEvents: 'auto',
  });

  const volBtn = mkBtn(saved.muted ? 'SND OFF' : `SND ${pct(saved.volume)}`);
  const fsBtn = mkBtn('FS');
  bar.appendChild(volBtn);
  bar.appendChild(fsBtn);
  host.appendChild(bar);

  // Hidden slider panel that shows when you hover SND.
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    top: '38px',
    left: '12px',
    padding: '10px 14px',
    background: '#0a0e1acc',
    border: '1px solid #00f0ff44',
    zIndex: '100',
    display: 'none',
    pointerEvents: 'auto',
  });
  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '0'; slider.max = '100';
  slider.value = String(Math.round((saved.muted ? 0 : saved.volume) * 100));
  slider.style.width = '140px';
  slider.style.accentColor = '#00f0ff';
  panel.appendChild(slider);
  host.appendChild(panel);

  let state = { ...saved };

  const repaintVol = () => { volBtn.textContent = state.muted ? 'SND OFF' : `SND ${pct(state.volume)}`; };

  volBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    game.audio.setVolume(state.muted ? 0 : state.volume);
    repaintVol();
    persist(state);
  });
  volBtn.addEventListener('mouseenter', () => { panel.style.display = 'block'; });
  panel.addEventListener('mouseleave', () => { panel.style.display = 'none'; });
  bar.addEventListener('mouseleave', (e) => {
    // Keep panel open if we moved onto it.
    const toEl = (e as MouseEvent).relatedTarget as HTMLElement | null;
    if (!toEl || !panel.contains(toEl)) panel.style.display = 'none';
  });

  slider.addEventListener('input', () => {
    state.volume = parseInt(slider.value, 10) / 100;
    state.muted = state.volume === 0;
    game.audio.setVolume(state.volume);
    repaintVol();
    persist(state);
  });

  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
}

function mkBtn(label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  Object.assign(b.style, {
    background: '#0a0e1acc',
    border: '1px solid #00f0ff66',
    color: '#00f0ff',
    padding: '6px 12px',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    letterSpacing: 'inherit',
    cursor: 'pointer',
  });
  return b;
}

function pct(v: number): string { return `${Math.round(v * 100)}%`; }

function loadSaved(): { volume: number; muted: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { volume: 0.7, muted: false };
}

function persist(s: { volume: number; muted: boolean }) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
