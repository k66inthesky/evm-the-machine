// Chapter 04 — CROWDSALE (July–September 2014).
//
// A dark server room. Above the terminal, a marquee LED ticker shows BTC
// flowing in — the 42-day sale. You're staring at draft.txt, the paragraph
// you'll publish on the blog tomorrow morning to frame what people are
// actually buying. Four framings. The one you pick is hidden archetype.
import * as THREE from 'three';
import { Chamber } from './chamber';
import type { Input } from '../core/input';
import { FPSController } from '../core/fps-controller';
import type { ArchetypeVector } from '../systems/archetype';

interface Choice {
  key: string;
  label: string;
  body: string;
  weights: Partial<ArchetypeVector>;
}

const CHOICES: Choice[] = [
  { key: '1', label: 'Ether is fuel. You pay to compute.',        body: 'Ether is fuel — you pay to compute on the world machine.',              weights: { V: 1, E: 2 } },
  { key: '2', label: 'Ether is currency. Value on the wire.',      body: 'Ether is programmable value, moving at the speed of the internet.',     weights: { C: 2, S: 1 } },
  { key: '3', label: 'Ether is a vote. Stake in the protocol.',    body: 'Ether is a share — a vote in how the protocol evolves.',                weights: { G: 2, V: 1 } },
  { key: '4', label: 'Ether is security. Collateral for code.',    body: 'Ether secures the protocol — collateral behind every contract.',        weights: { B: 2, E: 1 } },
];

export class CrowdsaleChamber extends Chamber {
  chamberIndex = 3;
  title = 'CROWDSALE';

  private fps!: FPSController;
  private raycaster = new THREE.Raycaster();

  private monitor!: THREE.Mesh;
  private screen!: THREE.Mesh;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private tex!: THREE.CanvasTexture;

  private marquee!: THREE.Mesh;
  private marqueeCanvas!: HTMLCanvasElement;
  private marqueeCtx!: CanvasRenderingContext2D;
  private marqueeTex!: THREE.CanvasTexture;

  private phase: 'intro' | 'active' | 'picked' = 'intro';
  private prompt: HTMLDivElement | null = null;
  private btcTotal = 0;
  private tickerOffset = 0;
  private t = 0;

  private readonly ROOM = { xMin: -4, xMax: 4, zMin: -4, zMax: 4 };
  private readonly DESK = { xMin: -1.4, xMax: 1.4, zMin: -3.0, zMax: -2.1 };

  protected build() {
    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.Fog(0x020408, 3, 14);

    this.buildRoom();
    this.buildDesk();
    this.buildMonitor();
    this.buildMarquee();
    this.buildRacks();

    this.fps = new FPSController({
      eyeHeight: 1.65, walkSpeed: 2.7, sprintSpeed: 3.9,
      canMoveTo: (p) => this.canMoveTo(p),
      onGroundHeight: () => 0,
    });
    this.fps.setPosition(0, 1.65, -0.6);
    this.fps.setYaw(0);
    this.camera = this.fps.camera;

    this.renderScreen();
    this.installBriefing({
      code: 'CHAPTER 04 · 2014',
      title: 'CROWDSALE',
      subtitle: '眾籌之火 · DAY 37 OF 42',
      body: 'The sale is live. BTC is coming in fast. Tomorrow you publish the blog post that explains what this token actually IS — and five thousand people will read you, literally on faith. Pick the framing that matches what you believe.',
      action: 'read the draft on the terminal (<b>E</b>), then pick the framing with <b>1 / 2 / 3 / 4</b>.',
      objective: 'READ THE DRAFT · PRESS E',
    });
  }

  private buildRoom() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0x08080c }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0x02040a }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.6;
    this.scene.add(ceil);
    const wm = new THREE.MeshBasicMaterial({ color: 0x0c0e18 });
    const mk = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wm);
      m.position.set(x, y, z); m.rotation.y = ry;
      this.scene.add(m);
    };
    mk(8, 3.6, 0, 1.8, -4, 0);
    mk(8, 3.6, -4, 1.8, 0, Math.PI / 2);
    mk(8, 3.6, 4, 1.8, 0, -Math.PI / 2);
    mk(8, 3.6, 0, 1.8, 4, Math.PI);
  }

  private buildDesk() {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x202024 }));
    desk.position.set(0, 0.78, -2.55);
    this.scene.add(desk);
    const legMat = new THREE.MeshBasicMaterial({ color: 0x0a0a10 });
    [[-1.2, -2.95], [1.2, -2.95], [-1.2, -2.15], [1.2, -2.15]].forEach(([x, z]) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), legMat);
      l.position.set(x, 0.39, z); this.scene.add(l);
    });
    // Keyboard.
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x0a0a10 }));
    kb.position.set(0, 0.815, -2.1);
    this.scene.add(kb);
  }

  private buildMonitor() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x0a0a10 }));
    body.position.set(0, 1.35, -2.8);
    this.scene.add(body);
    this.monitor = body;

    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x0a0a10 }));
    stand.position.set(0, 1.0, -2.8);
    this.scene.add(stand);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280; this.canvas.height = 800;
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.magFilter = THREE.NearestFilter;
    this.tex.anisotropy = 8;
    this.tex.generateMipmaps = false;
    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.82),
      new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false }),
    );
    this.screen.position.set(0, 1.35, -2.77);
    this.scene.add(this.screen);
  }

  private buildMarquee() {
    // The LED ticker above the monitor. Wider than the monitor, thin.
    this.marqueeCanvas = document.createElement('canvas');
    this.marqueeCanvas.width = 2048; this.marqueeCanvas.height = 128;
    this.marqueeCtx = this.marqueeCanvas.getContext('2d')!;
    this.marqueeTex = new THREE.CanvasTexture(this.marqueeCanvas);
    this.marqueeTex.minFilter = THREE.LinearFilter;
    this.marqueeTex.magFilter = THREE.LinearFilter;
    this.marqueeTex.generateMipmaps = false;
    this.marquee = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.22),
      new THREE.MeshBasicMaterial({ map: this.marqueeTex, toneMapped: false }),
    );
    this.marquee.position.set(0, 2.3, -3.96);
    this.scene.add(this.marquee);
  }

  private buildRacks() {
    // Server rack silhouettes on side walls — blinkenlight canvases.
    const mk = (x: number, z: number, ry: number) => {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.4, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x0a0a12 }));
      rack.position.set(x, 1.2, z); rack.rotation.y = ry;
      this.scene.add(rack);
      // Blinkenlight plane on the front.
      const c = document.createElement('canvas');
      c.width = 256; c.height = 512;
      const cx = c.getContext('2d')!;
      cx.fillStyle = '#020206'; cx.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 40; i++) {
        cx.fillStyle = Math.random() < 0.7 ? '#40ff80' : '#ffaa40';
        cx.fillRect(20 + (i % 4) * 40, 20 + Math.floor(i / 4) * 40, 24, 24);
      }
      const tex = new THREE.CanvasTexture(c);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 2.1),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
      );
      face.position.set(x + (ry === Math.PI / 2 ? 0.26 : -0.26), 1.2, z);
      face.rotation.y = ry;
      this.scene.add(face);
    };
    mk(-3.7, -2, Math.PI / 2);
    mk(-3.7, 0, Math.PI / 2);
    mk(3.7, -2, -Math.PI / 2);
    mk(3.7, 0, -Math.PI / 2);
  }

  private renderScreen(picked: Choice | null = null) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const SX = W / 640, SY = H / 400;
    ctx.setTransform(SX, 0, 0, SY, 0, 0);
    const VW = 640, VH = 400;
    ctx.fillStyle = '#02040a'; ctx.fillRect(0, 0, VW, VH);

    ctx.fillStyle = '#40ffa0'; ctx.font = 'bold 20px monospace'; ctx.textBaseline = 'top';
    ctx.fillText('$ cat draft.txt', 18, 18);
    ctx.fillStyle = '#306050'; ctx.font = '14px monospace';
    ctx.fillText(`[ crowdsale · day 37 / 42 · ${this.btcTotal.toFixed(0)} BTC received ]`, 18, 44);

    if (this.phase === 'intro') {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 18px monospace';
      ctx.fillText('"What are we actually selling?"', 18, 88);
      ctx.font = '15px monospace'; ctx.fillStyle = '#a0b0c0';
      ctx.fillText('Pick one sentence. Five thousand people', 18, 120);
      ctx.fillText('are about to read it. No going back.', 18, 144);
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 15px monospace';
      ctx.fillText('[ press E to open the four framings ]', 18, VH - 26);
    } else if (this.phase === 'active' && !picked) {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 17px monospace';
      ctx.fillText('Pick the framing:', 18, 88);
      ctx.font = 'bold 14px monospace';
      CHOICES.forEach((c, i) => {
        ctx.fillStyle = '#9adfff';
        ctx.fillText(`[${c.key}] ${c.label}`, 18, 128 + i * 40);
      });
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 15px monospace';
      ctx.fillText('press 1 / 2 / 3 / 4', 18, VH - 26);
    } else if (picked) {
      ctx.fillStyle = '#ffd070'; ctx.font = 'bold 22px monospace';
      ctx.fillText('> published.', 18, 102);
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 16px monospace';
      wrap(ctx, picked.body, 18, 140, VW - 40, 26);
      ctx.fillStyle = '#5a7090'; ctx.font = '13px monospace';
      ctx.fillText('(sep 2, 2014. 31,529 BTC raised.)', 18, VH - 26);
    }
    this.tex.needsUpdate = true;
  }

  private renderMarquee() {
    const ctx = this.marqueeCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050a05'; ctx.fillRect(0, 0, 2048, 128);
    ctx.fillStyle = '#40ff60'; ctx.font = 'bold 72px monospace'; ctx.textBaseline = 'middle';
    const base = `  TOTAL: ${this.btcTotal.toFixed(2)} BTC   ·   ETH PRICE: 0.001953 BTC   ·   DAY 37 / 42   ·   CONTRIBUTORS: ${(this.btcTotal * 0.18 | 0)}   ·   `;
    const text = base + base + base;
    const w = 2048;
    const offset = (this.tickerOffset % w + w) % w;
    ctx.fillText(text, -offset, 64);
    ctx.fillText(text, -offset + w, 64);
    this.marqueeTex.needsUpdate = true;
  }

  update(dt: number, input: Input) {
    if (this.briefingActive) return;
    this.fps.update(dt, input);
    this.t += dt;
    // BTC inflow ramps — starts fast, slows down.
    const rate = this.phase === 'picked' ? 0 : (40 - Math.min(30, this.t * 0.8));
    this.btcTotal = Math.min(31529, this.btcTotal + rate * dt);
    this.tickerOffset += dt * 120;
    this.renderMarquee();
    if ((this.t * 2 | 0) !== ((this.t - dt) * 2 | 0)) this.renderScreen(this.phase === 'picked' ? null : null);
    this.updateInteractions(input);
  }

  private updateInteractions(input: Input) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects([this.monitor, this.screen], false);
    const target = hits.length > 0 && hits[0].distance < 2.8 ? hits[0].object : null;

    if (!target) this.setPrompt(null);
    else if (this.phase === 'intro') this.setPrompt('PRESS E TO OPEN DRAFT');
    else if (this.phase === 'active') this.setPrompt('PRESS 1 / 2 / 3 / 4 TO PUBLISH');

    if (target && input.wasPressed('KeyE') && this.phase === 'intro') {
      this.phase = 'active';
      this.renderScreen();
      this.game.audio.playSFX('interact');
      this.setObjective('PICK THE FRAMING · 1 / 2 / 3 / 4');
    }
    if (this.phase === 'active') {
      for (const c of CHOICES) if (input.wasPressed(`Digit${c.key}`)) { this.onChoose(c); break; }
    }
  }

  private onChoose(c: Choice) {
    if (this.phase !== 'active') return;
    this.phase = 'picked';
    this.game.archetype.add(3, `choice-${c.key}`, c.weights);
    this.game.audio.playSFX('mint');
    this.renderScreen(c);
    this.setObjective('PUBLISHED · CHAPTER COMPLETE');
    setTimeout(() => this.win(), 1800);
  }

  private canMoveTo(p: THREE.Vector3): boolean {
    const pad = 0.3;
    if (p.x < this.ROOM.xMin + pad || p.x > this.ROOM.xMax - pad) return false;
    if (p.z < this.ROOM.zMin + pad || p.z > this.ROOM.zMax - pad) return false;
    if (p.x > this.DESK.xMin && p.x < this.DESK.xMax && p.z > this.DESK.zMin && p.z < this.DESK.zMax) return false;
    return true;
  }

  private setPrompt(text: string | null) {
    if (!text) { if (this.prompt) this.prompt.style.opacity = '0'; return; }
    if (!this.prompt) this.prompt = this.game.hud.prompt(text);
    else this.prompt.textContent = text;
    this.prompt.style.opacity = '1';
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}
