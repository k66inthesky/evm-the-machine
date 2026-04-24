// HUD — DOM overlay for text/prompts. Keeping text in DOM instead of WebGL
// because text-in-three is painful and we only need a few labels per chamber.
export class HUD {
  private root: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.root = root;
  }

  clear() {
    this.root.innerHTML = '';
  }

  element(html: string, style: Partial<CSSStyleDeclaration> = {}): HTMLDivElement {
    const el = document.createElement('div');
    el.innerHTML = html;
    Object.assign(el.style, style);
    this.root.appendChild(el);
    return el;
  }

  prompt(text: string): HTMLDivElement {
    return this.element(text, {
      position: 'absolute',
      left: '50%',
      bottom: '15%',
      transform: 'translateX(-50%)',
      color: '#00f0ff',
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      letterSpacing: '0.15em',
      textShadow: '0 0 8px #00f0ff',
      textTransform: 'uppercase',
      pointerEvents: 'none',
    });
  }

  title(text: string, subtitle?: string): HTMLDivElement {
    const html = `<div style="font-size:32px;letter-spacing:0.25em;">${text}</div>` +
      (subtitle ? `<div style="font-size:14px;opacity:0.7;margin-top:8px;letter-spacing:0.2em;">${subtitle}</div>` : '');
    return this.element(html, {
      position: 'absolute',
      left: '50%',
      top: '12%',
      transform: 'translateX(-50%)',
      color: '#00f0ff',
      fontFamily: 'Courier New, monospace',
      textAlign: 'center',
      textShadow: '0 0 12px #00f0ff',
      textTransform: 'uppercase',
      pointerEvents: 'none',
    });
  }

  crosshair() {
    return this.element('+', {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#00f0ff',
      fontSize: '20px',
      opacity: '0.6',
      pointerEvents: 'none',
    });
  }
}
