// Input — tracks pressed keys, mouse delta (while pointer is locked), and
// per-frame edges (wasPressed). Chamber code reads this directly instead of
// subscribing to events — simpler, no callback soup.
export class Input {
  keys = new Set<string>();
  private pressedThisFrame = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  mouseClicked = false;
  pointerLocked = false;
  // True for one frame when pointer lock transitions from locked → unlocked.
  // Chrome/Firefox swallow the ESC keydown that releases pointer lock, so
  // chamber bail-out logic watches this flag instead of wasPressed('Escape').
  pointerJustReleased = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      const k = e.code;
      if (!this.keys.has(k)) this.pressedThisFrame.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    window.addEventListener('mousedown', () => {
      if (this.pointerLocked) this.mouseClicked = true;
    });
    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.pointerLocked;
      this.pointerLocked = document.pointerLockElement === canvas;
      if (wasLocked && !this.pointerLocked) this.pointerJustReleased = true;
    });
    // A user gesture is required to request pointer lock, so we capture a
    // click on the canvas whenever lock isn't held.
    canvas.addEventListener('click', () => {
      if (!this.pointerLocked) canvas.requestPointerLock();
    });
  }

  requestPointer() {
    if (!this.pointerLocked) this.canvas.requestPointerLock();
  }

  releasePointer() {
    if (this.pointerLocked) document.exitPointerLock();
  }

  wasPressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  consumeClick(): boolean {
    const clicked = this.mouseClicked;
    this.mouseClicked = false;
    return clicked;
  }

  endFrame() {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pressedThisFrame.clear();
    this.pointerJustReleased = false;
  }
}
