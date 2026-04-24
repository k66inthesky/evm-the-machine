// Chapter 03 — SPACESHIP (Zug, summer 2014).
//
// The "Spaceship" is the rented house in Baar where the five original
// co-founders lived and built Ethereum for months. Whiteboards cover every
// wall. The kitchen table holds a single MacBook with a document titled
// "roles.md" — you've been avoiding committing to a role.
//
// The player walks up to the kitchen table and picks which of four roles
// they lean into. Each role biases the archetype.
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
  { key: '1', label: 'Code the protocol. Clients, EVM, yellowpaper.', body: 'You pick up Gavin\'s hex dump. Clients and the EVM spec are yours now.', weights: { E: 2, B: 1 } },
  { key: '2', label: 'Write. Spec, vision, public-facing docs.',    body: 'You take the whitepaper and the vision docs. The story is your job.',       weights: { V: 2, W: 1 } },
  { key: '3', label: 'Talk. Investors, press, foundation structure.', body: 'You take the phones. Zug incorporation, press, the Stiftung — you.',      weights: { C: 2, G: 1 } },
  { key: '4', label: 'Govern. Ethics, community, decision process.',  body: 'You take community and governance — how we decide, how we disagree.',      weights: { G: 2, R: 1 } },
];

export class SpaceshipChamber extends Chamber {
  chamberIndex = 2;
  title = 'SPACESHIP';

  private fps!: FPSController;
  private raycaster = new THREE.Raycaster();

  private laptop!: THREE.Mesh;
  private screen!: THREE.Mesh;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private tex!: THREE.CanvasTexture;

  private phase: 'intro' | 'active' | 'picked' = 'intro';
  private prompt: HTMLDivElement | null = null;
  private readonly ROOM = { xMin: -5, xMax: 5, zMin: -5, zMax: 5 };
  private readonly TABLE = { xMin: -1.4, xMax: 1.4, zMin: -0.9, zMax: 0.9 };

  protected build() {
    this.scene.background = new THREE.Color(0x0d1018);
    this.scene.fog = new THREE.Fog(0x0d1018, 4, 18);

    this.buildRoom();
    this.buildTable();
    this.buildLaptop();
    this.buildWhiteboards();
    this.buildCouch();

    this.fps = new FPSController({
      eyeHeight: 1.65, walkSpeed: 2.8, sprintSpeed: 4.0,
      canMoveTo: (p) => this.canMoveTo(p),
      onGroundHeight: () => 0,
    });
    this.fps.setPosition(0, 1.65, 2.5);
    this.fps.setYaw(Math.PI);
    this.camera = this.fps.camera;

    this.renderScreen();
    this.installBriefing({
      code: 'CHAPTER 03 · 2014',
      title: 'SPACESHIP',
      subtitle: '太空船屋 · BAAR · ZUG',
      body: 'The five of you rented this place in June. Whiteboards everywhere, no furniture worth the name. A document called "roles.md" sits open on the kitchen laptop. Nobody will write it for you.',
      action: 'walk to the kitchen table, press <b>E</b> to read, then <b>1 / 2 / 3 / 4</b> to pick the role you take on.',
      objective: 'WALK TO THE LAPTOP · PRESS E',
    });
  }

  private buildRoom() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0x1a1410 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0x080a10 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.4;
    this.scene.add(ceil);

    const wm = new THREE.MeshBasicMaterial({ color: 0x1c1824 });
    const mk = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wm);
      m.position.set(x, y, z); m.rotation.y = ry;
      this.scene.add(m);
    };
    mk(10, 3.4, 0, 1.7, -5, 0);
    mk(10, 3.4, -5, 1.7, 0, Math.PI / 2);
    mk(10, 3.4, 5, 1.7, 0, -Math.PI / 2);
    mk(10, 3.4, 0, 1.7, 5, Math.PI);

    // A bare hanging bulb over the table.
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe0a0 }),
    );
    bulb.position.set(0, 2.3, 0);
    this.scene.add(bulb);
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128; glowCanvas.height = 128;
    const gctx = glowCanvas.getContext('2d')!;
    const grad = gctx.createRadialGradient(64, 64, 2, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255,220,140,0.55)');
    grad.addColorStop(0.4, 'rgba(255,180,90,0.18)');
    grad.addColorStop(1, 'rgba(255,140,60,0)');
    gctx.fillStyle = grad; gctx.fillRect(0, 0, 128, 128);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(glowCanvas),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      opacity: 0.6,
    }));
    sprite.position.set(0, 2.3, 0);
    sprite.scale.set(1.1, 1.1, 1);
    this.scene.add(sprite);
  }

  private buildTable() {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.06, 1.6),
      new THREE.MeshBasicMaterial({ color: 0x3a2a1a }),
    );
    top.position.set(0, 0.78, 0);
    this.scene.add(top);
    const legMat = new THREE.MeshBasicMaterial({ color: 0x1a1208 });
    const mkLeg = (x: number, z: number) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), legMat);
      l.position.set(x, 0.39, z); this.scene.add(l);
    };
    mkLeg(-1.35, -0.75); mkLeg(1.35, -0.75); mkLeg(-1.35, 0.75); mkLeg(1.35, 0.75);

    // Empty pizza box and a mate can.
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x8a3020 }));
    box.position.set(-0.9, 0.82, 0.3);
    this.scene.add(box);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 16),
      new THREE.MeshBasicMaterial({ color: 0x306070 }));
    can.position.set(0.9, 0.88, 0.3);
    this.scene.add(can);
  }

  private buildLaptop() {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.03, 0.32),
      new THREE.MeshBasicMaterial({ color: 0xc0c0c8 }),
    );
    base.position.set(0, 0.82, -0.25);
    this.scene.add(base);
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.3, 0.015),
      new THREE.MeshBasicMaterial({ color: 0xb8b8c0 }),
    );
    lid.position.set(0, 0.97, -0.39);
    lid.rotation.x = -0.2;
    this.scene.add(lid);
    this.laptop = lid;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024; this.canvas.height = 768;
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.magFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.41, 0.28),
      new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false }),
    );
    this.screen.position.set(0, 0.97, -0.382);
    this.screen.rotation.x = -0.2;
    this.scene.add(this.screen);
  }

  private buildWhiteboards() {
    const mk = (x: number, z: number, ry: number, lines: string[]) => {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 768;
      const cx = c.getContext('2d')!;
      cx.fillStyle = '#f0efe3'; cx.fillRect(0, 0, 1024, 768);
      cx.fillStyle = '#1a2860';
      cx.font = 'bold 36px monospace';
      cx.textBaseline = 'top';
      lines.forEach((ln, i) => cx.fillText(ln, 28, 36 + i * 52));
      const tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.8),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
      );
      m.position.set(x, 1.6, z); m.rotation.y = ry;
      this.scene.add(m);
    };
    mk(0, -4.96, 0, [
      'CLIENTS:',
      '  - geth   (go)',
      '  - cpp    (c++)',
      '  - py     (python)',
      '  - rust?  (too early)',
      '',
      'YELLOW PAPER:',
      '  gavin. drafting.',
      '',
      'ZUG / STIFTUNG:',
      '  form a non-profit',
      '  swiss foundation',
    ]);
    mk(-4.96, 0, Math.PI / 2, [
      'WHO:',
      '  vitalik — vision',
      '  gavin  — protocol',
      '  joe    — operations',
      '  charles — ceo?',
      '  anthony — sales',
      '  mihai  — ?',
      '  amir   — events',
      '',
      'WHO PAYS WHAT?',
      '  dev grants',
      '  crowdsale (soon)',
    ]);
    mk(4.96, 0, -Math.PI / 2, [
      'TIMELINE:',
      '  jul 22 — crowdsale',
      '  42 days. BTC in.',
      '  frontier: next year.',
      '',
      'RISK:',
      '  legal (SEC?)',
      '  tech (clients not done)',
      '  funding (if sale flops)',
      '',
      'COFFEE: out. again.',
    ]);
  }

  private buildCouch() {
    const couch = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x403030 }));
    couch.position.set(-3, 0.25, 2.5);
    this.scene.add(couch);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x352828 }));
    back.position.set(-3, 0.75, 2.85);
    this.scene.add(back);
  }

  private renderScreen(picked: Choice | null = null) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const SX = W / 512, SY = H / 384;
    ctx.setTransform(SX, 0, 0, SY, 0, 0);
    const VW = 512, VH = 384;
    ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#7ac8ff'; ctx.font = 'bold 20px monospace'; ctx.textBaseline = 'top';
    ctx.fillText('~/roles.md', 16, 16);
    ctx.fillStyle = '#3a6a90'; ctx.font = '14px monospace';
    ctx.fillText('-- vim -- [modified] --', 16, 42);

    if (this.phase === 'intro') {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 18px monospace';
      ctx.fillText('# spaceship roles', 16, 82);
      ctx.font = '15px monospace'; ctx.fillStyle = '#a0b0c0';
      ctx.fillText('five of us. five hats. we keep', 16, 116);
      ctx.fillText('moving them around. pick one.', 16, 140);
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 15px monospace';
      ctx.fillText('[ press E to see the four roles ]', 16, VH - 24);
    } else if (this.phase === 'active' && !picked) {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 17px monospace';
      ctx.fillText('pick your role:', 16, 82);
      ctx.font = 'bold 14px monospace';
      CHOICES.forEach((c, i) => {
        ctx.fillStyle = '#9adfff';
        ctx.fillText(`[${c.key}] ${c.label}`, 16, 118 + i * 38);
      });
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 15px monospace';
      ctx.fillText('press 1 / 2 / 3 / 4', 16, VH - 24);
    } else if (picked) {
      ctx.fillStyle = '#80ff90'; ctx.font = 'bold 20px monospace';
      ctx.fillText('> committed.', 16, 98);
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 15px monospace';
      wrap(ctx, picked.body, 16, 136, VW - 32, 24);
      ctx.fillStyle = '#5a7090'; ctx.font = '13px monospace';
      ctx.fillText('(jun 2014. a shape emerges.)', 16, VH - 24);
    }
    this.tex.needsUpdate = true;
  }

  update(dt: number, input: Input) {
    if (this.briefingActive) return;
    this.fps.update(dt, input);
    this.updateInteractions(input);
  }

  private updateInteractions(input: Input) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects([this.laptop, this.screen], false);
    const target = hits.length > 0 && hits[0].distance < 2.6 ? hits[0].object : null;

    if (!target) this.setPrompt(null);
    else if (this.phase === 'intro') this.setPrompt('PRESS E TO OPEN roles.md');
    else if (this.phase === 'active') this.setPrompt('PRESS 1 / 2 / 3 / 4 TO COMMIT');

    if (target && input.wasPressed('KeyE') && this.phase === 'intro') {
      this.phase = 'active';
      this.renderScreen();
      this.game.audio.playSFX('interact');
      this.setObjective('PICK YOUR ROLE · 1 / 2 / 3 / 4');
    }
    if (this.phase === 'active') {
      for (const c of CHOICES) if (input.wasPressed(`Digit${c.key}`)) { this.onChoose(c); break; }
    }
  }

  private onChoose(c: Choice) {
    if (this.phase !== 'active') return;
    this.phase = 'picked';
    this.game.archetype.add(2, `choice-${c.key}`, c.weights);
    this.game.audio.playSFX('win');
    this.renderScreen(c);
    this.setObjective('ROLE COMMITTED · CHAPTER COMPLETE');
    setTimeout(() => this.win(), 1800);
  }

  private canMoveTo(p: THREE.Vector3): boolean {
    const pad = 0.3;
    if (p.x < this.ROOM.xMin + pad || p.x > this.ROOM.xMax - pad) return false;
    if (p.z < this.ROOM.zMin + pad || p.z > this.ROOM.zMax - pad) return false;
    if (p.x > this.TABLE.xMin && p.x < this.TABLE.xMax && p.z > this.TABLE.zMin && p.z < this.TABLE.zMax) return false;
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
