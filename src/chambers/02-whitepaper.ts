// Chapter 02 — WHITEPAPER (2013, Toronto attic, a month after THE LIMIT).
//
// You've been writing for weeks. Ethereum: A Next-Generation Smart Contract
// and Decentralized Application Platform. The attic is covered in equations
// on butcher paper. The laptop on the desk is open to the draft's opening
// paragraph — the sentence that will define what this machine IS.
//
// The player picks one of four opening paragraphs to commit. Each biases
// the archetype vector toward a different reading of why Ethereum exists.
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
  {
    key: '1',
    label: 'A generalized, Turing-complete state machine.',
    body: 'Ethereum is a generalized state machine with a Turing-complete scripting layer.',
    weights: { V: 2, E: 1 },
  },
  {
    key: '2',
    label: 'A world computer anyone can deploy to.',
    body: 'A world computer: any developer, any contract, any application.',
    weights: { V: 1, B: 2 },
  },
  {
    key: '3',
    label: 'Programmable money and governance primitives.',
    body: 'A platform for programmable money, governance, and identity.',
    weights: { C: 1, G: 2 },
  },
  {
    key: '4',
    label: 'A protocol no single party can stop.',
    body: 'A permissionless protocol that no single party can stop or censor.',
    weights: { R: 2, V: 1 },
  },
];

export class WhitepaperChamber extends Chamber {
  chamberIndex = 1;
  title = 'WHITEPAPER';

  private fps!: FPSController;
  private raycaster = new THREE.Raycaster();

  private laptopMesh!: THREE.Mesh;
  private laptopScreenMesh!: THREE.Mesh;
  private laptopCanvas!: HTMLCanvasElement;
  private laptopCtx!: CanvasRenderingContext2D;
  private laptopTexture!: THREE.CanvasTexture;

  private phase: 'intro' | 'active' | 'picked' | 'exiting' = 'intro';
  private choiceLogged = false;
  private readonly ROOM = { xMin: -4, xMax: 4, zMin: -4, zMax: 4 };
  private readonly DESK = { xMin: -1.1, xMax: 1.1, zMin: -2.9, zMax: -2.1 };
  private prompt: HTMLDivElement | null = null;

  protected build() {
    this.scene.background = new THREE.Color(0x08080c);
    this.scene.fog = new THREE.Fog(0x08080c, 3, 16);

    this.buildRoom();
    this.buildDesk();
    this.buildLaptop();
    this.buildWhiteboards();

    this.fps = new FPSController({
      eyeHeight: 1.65, walkSpeed: 2.6, sprintSpeed: 3.8,
      canMoveTo: (p) => this.canMoveTo(p),
      onGroundHeight: () => 0,
    });
    this.fps.setPosition(0, 1.65, 0.2);
    this.fps.setYaw(0);
    this.camera = this.fps.camera;

    this.renderLaptop();
    this.installBriefing({
      code: 'CHAPTER 02 · 2013',
      title: 'WHITEPAPER',
      subtitle: '白皮書 · TORONTO · DECEMBER',
      body: 'Six weeks after the forum thread. The attic is papered with equations. Your laptop is open to the draft. You need to commit to one opening sentence — the definition that the next decade of the machine will be built on.',
      action: 'walk to the laptop, press <b>E</b> to read the draft, then press <b>1 / 2 / 3 / 4</b> to choose the paragraph you publish.',
      objective: 'WALK TO THE LAPTOP · PRESS E',
    });
  }

  private buildRoom() {
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x141014 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const ceilMat = new THREE.MeshBasicMaterial({ color: 0x06060a });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.2;
    this.scene.add(ceil);

    const wallMat = new THREE.MeshBasicMaterial({ color: 0x18141a });
    const mkWall = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(x, y, z); m.rotation.y = ry;
      this.scene.add(m);
    };
    mkWall(8, 3.2, 0, 1.6, -4, 0);
    mkWall(8, 3.2, -4, 1.6, 0, Math.PI / 2);
    mkWall(8, 3.2, 4, 1.6, 0, -Math.PI / 2);
    mkWall(8, 3.2, 0, 1.6, 4, Math.PI);
  }

  private buildDesk() {
    const deskMat = new THREE.MeshBasicMaterial({ color: 0x2a1f14 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.9), deskMat);
    desk.position.set(0, 0.8, -2.5);
    this.scene.add(desk);
    const legMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const mkLeg = (x: number, z: number) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), legMat);
      l.position.set(x, 0.4, z); this.scene.add(l);
    };
    mkLeg(-1.1, -2.85); mkLeg(1.1, -2.85); mkLeg(-1.1, -2.15); mkLeg(1.1, -2.15);
  }

  private buildLaptop() {
    // Laptop base.
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.03, 0.42),
      new THREE.MeshBasicMaterial({ color: 0x151520 }),
    );
    base.position.set(0, 0.85, -2.46);
    this.scene.add(base);
    // Laptop screen back (the "lid" hinged up).
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.015),
      new THREE.MeshBasicMaterial({ color: 0x0a0a12 }),
    );
    lid.position.set(0, 1.02, -2.62);
    lid.rotation.x = -0.22;
    this.scene.add(lid);
    this.laptopMesh = lid;

    // Screen canvas — the draft page. Mipmaps + anisotropy avoid aliasing on a
    // small tilted plane viewed at ~2.8m.
    this.laptopCanvas = document.createElement('canvas');
    this.laptopCanvas.width = 1536;
    this.laptopCanvas.height = 1024;
    this.laptopCtx = this.laptopCanvas.getContext('2d')!;
    this.laptopTexture = new THREE.CanvasTexture(this.laptopCanvas);
    this.laptopTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.laptopTexture.magFilter = THREE.LinearFilter;
    this.laptopTexture.generateMipmaps = true;
    this.laptopTexture.anisotropy = 16;
    this.laptopScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.38),
      new THREE.MeshBasicMaterial({ map: this.laptopTexture, toneMapped: false }),
    );
    this.laptopScreenMesh.position.set(0, 1.02, -2.612);
    this.laptopScreenMesh.rotation.x = -0.22;
    this.scene.add(this.laptopScreenMesh);
  }

  private buildWhiteboards() {
    // Two whiteboards flanking the desk, covered in equations drawn on canvas.
    const mk = (x: number, rotY: number, lines: string[]) => {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 1536;
      const cx = c.getContext('2d')!;
      cx.fillStyle = '#f4f0e8';
      cx.fillRect(0, 0, c.width, c.height);
      cx.fillStyle = '#1a1a2a';
      cx.font = 'bold 44px monospace';
      cx.textBaseline = 'top';
      lines.forEach((ln, i) => cx.fillText(ln, 44, 60 + i * 68));
      const tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = 16;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 2.4),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
      );
      m.position.set(x, 1.7, -3.96);
      m.rotation.y = rotY;
      this.scene.add(m);
    };
    mk(-2.4, 0, [
      'state transition',
      '  σ_t+1 = Υ(σ_t, T)',
      '',
      'EVM opcodes',
      '  ADD MUL SUB DIV',
      '  JUMPI PUSH POP',
      '  SSTORE SLOAD',
      '  CALL CALLDATALOAD',
      '',
      'gas = fuel',
      'block.gasLimit caps',
      'each transaction',
      '',
      'nonce   balance',
      'storage code',
    ]);
    mk(2.4, 0, [
      'accounts:',
      '  externally-owned',
      '  contract',
      '',
      'why NOT bitcoin?',
      '  stack-based',
      '  no loops',
      '  bounded expression',
      '',
      'why a new chain?',
      '  generality > extension',
      '',
      'token:',
      '  fuel, not currency',
      '  price = work cost',
      '',
      'consensus: PoW (for now)',
    ]);
  }

  private renderLaptop(picked: Choice | null = null) {
    const ctx = this.laptopCtx;
    const W = 1024, H = 768;
    const SX = W / 512, SY = H / 384;
    ctx.setTransform(SX, 0, 0, SY, 0, 0);
    const VW = 512, VH = 384;
    ctx.fillStyle = '#f6f2e8';
    ctx.fillRect(0, 0, VW, VH);
    // Title bar.
    ctx.fillStyle = '#20202a';
    ctx.font = 'bold 18px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('ethereum_whitepaper.md', 18, 14);
    ctx.fillStyle = '#6a6a7a';
    ctx.font = '13px monospace';
    ctx.fillText('— draft 7 · unsaved —', 18, 36);
    ctx.fillStyle = '#20202a';

    if (this.phase === 'intro') {
      ctx.font = 'bold 20px monospace';
      ctx.fillText('Ethereum is ___', 18, 78);
      ctx.font = '15px monospace';
      ctx.fillStyle = '#40404a';
      ctx.fillText('(finish this sentence.)', 18, 110);
      ctx.fillText('Four candidate openings are saved.', 18, 134);
      ctx.fillStyle = '#a05020';
      ctx.font = 'italic bold 15px monospace';
      ctx.fillText('[ press E to see the four drafts ]', 18, VH - 28);
    } else if (this.phase === 'active' && !picked) {
      ctx.font = 'bold 18px monospace';
      ctx.fillText('Choose the opening sentence:', 18, 78);
      ctx.font = 'bold 14px monospace';
      CHOICES.forEach((c, i) => {
        ctx.fillStyle = '#20202a';
        ctx.fillText(`[${c.key}] ${c.label}`, 18, 118 + i * 40);
      });
      ctx.fillStyle = '#a05020';
      ctx.font = 'italic bold 15px monospace';
      ctx.fillText('press 1 / 2 / 3 / 4', 18, VH - 28);
    } else if (picked) {
      ctx.fillStyle = '#205020';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('> published.', 18, 92);
      ctx.fillStyle = '#20202a';
      ctx.font = 'bold 15px monospace';
      wrap(ctx, picked.body, 18, 130, VW - 36, 24);
      ctx.fillStyle = '#6a6a7a';
      ctx.font = '13px monospace';
      ctx.fillText('(dec 2013. the machine has a definition.)', 18, VH - 28);
    }
    this.laptopTexture.needsUpdate = true;
  }

  update(dt: number, input: Input) {
    if (this.briefingActive) return;
    this.fps.update(dt, input);
    this.updateInteractions(input);
  }

  private updateInteractions(input: Input) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects([this.laptopMesh, this.laptopScreenMesh], false);
    const target = hits.length > 0 && hits[0].distance < 2.2 ? hits[0].object : null;

    if (!target) {
      this.setPrompt(null);
    } else if (this.phase === 'intro') {
      this.setPrompt('PRESS E TO READ THE DRAFTS');
    } else if (this.phase === 'active') {
      this.setPrompt('PRESS 1 / 2 / 3 / 4 TO PUBLISH');
    }

    if (target && input.wasPressed('KeyE') && this.phase === 'intro') {
      this.phase = 'active';
      this.renderLaptop();
      this.setObjective('CHOOSE AN OPENING SENTENCE · 1 / 2 / 3 / 4');
      this.game.audio.playSFX('interact');
    }

    if (this.phase === 'active') {
      for (const c of CHOICES) {
        if (input.wasPressed(`Digit${c.key}`)) {
          this.onChoose(c);
          break;
        }
      }
    }
  }

  private onChoose(c: Choice) {
    if (this.choiceLogged) return;
    this.choiceLogged = true;
    this.phase = 'picked';
    this.game.archetype.add(1, `choice-${c.key}`, c.weights);
    this.game.audio.playSFX('win');
    this.renderLaptop(c);
    this.setObjective('PUBLISHED · CHAPTER COMPLETE');
    setTimeout(() => this.win(), 1800);
  }

  private canMoveTo(p: THREE.Vector3): boolean {
    const inRoom = p.x > this.ROOM.xMin + 0.3 && p.x < this.ROOM.xMax - 0.3 &&
                   p.z > this.ROOM.zMin + 0.3 && p.z < this.ROOM.zMax - 0.3;
    if (!inRoom) return false;
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
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lh; line = w;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}
