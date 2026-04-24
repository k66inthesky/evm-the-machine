// Chapter 05 — THE DAO (June 17, 2016).
//
// A reentrant hall of mirrors. Seven glass panels line a corridor, each one
// showing the same call: withdraw(). The attacker's contract is being re-
// entered. You watch the drain happen in miniature. At the end of the hall,
// a podium with a single terminal asks what this means to you.
//
// The scene conveys the bug visually: every mirror shows withdraw() being
// re-called before the balance updates. The counter ticks down on each one.
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
  { key: '1', label: 'Patch it. Save the funds now. Ship a fix.', body: 'The bug is in the contract. Ship a client patch. Recover the funds. Move on.',   weights: { B: 2, G: 1 } },
  { key: '2', label: 'Code is law. Let the attacker keep it.',     body: '"Code is law." What the contract allowed, it allowed. Accept the outcome.',     weights: { R: 2, V: 1 } },
  { key: '3', label: 'Study the trace. Publish a post-mortem.',     body: 'The chain won\'t lie. I\'ll walk the call graph until I understand.',           weights: { E: 2, W: 1 } },
  { key: '4', label: 'I\'m out. This is not what I signed up for.', body: 'Pull ether out. Watch from a distance. Maybe come back when this is over.',    weights: { W: 1, C: 1, S: 1 } },
];

export class TheDaoChamber extends Chamber {
  chamberIndex = 4;
  title = 'THE DAO';

  private fps!: FPSController;
  private raycaster = new THREE.Raycaster();

  private mirrors: { mesh: THREE.Mesh; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture; balance: number; depth: number }[] = [];
  private podium!: THREE.Mesh;
  private podiumScreen!: THREE.Mesh;
  private podiumCanvas!: HTMLCanvasElement;
  private podiumCtx!: CanvasRenderingContext2D;
  private podiumTex!: THREE.CanvasTexture;

  private phase: 'intro' | 'active' | 'picked' = 'intro';
  private prompt: HTMLDivElement | null = null;
  private t = 0;
  private readonly CORRIDOR = { xMin: -2, xMax: 2, zMin: -14, zMax: 2 };

  protected build() {
    this.scene.background = new THREE.Color(0x04060c);
    this.scene.fog = new THREE.Fog(0x04060c, 2, 20);

    this.buildCorridor();
    this.buildMirrors();
    this.buildPodium();

    this.fps = new FPSController({
      eyeHeight: 1.65, walkSpeed: 2.9, sprintSpeed: 4.2,
      canMoveTo: (p) => this.canMoveTo(p),
      onGroundHeight: () => 0,
    });
    this.fps.setPosition(0, 1.65, 1);
    this.fps.setYaw(0);
    this.camera = this.fps.camera;

    this.renderPodium();
    this.installBriefing({
      code: 'CHAPTER 05 · 2016',
      title: 'THE DAO',
      subtitle: '鏡廳 · 17 JUNE · REENTRANCY',
      body: 'The DAO raised 150 million dollars. This morning, an attacker called withdraw() inside withdraw() inside withdraw(). Seven panels in this hall show the drain replaying in miniature. Walk to the end and tell me what you think it means.',
      action: 'walk down the hall (look at the panels), reach the podium, press <b>E</b>, then pick your reading with <b>1 / 2 / 3 / 4</b>.',
      objective: 'WALK TO THE PODIUM',
    });
  }

  private buildCorridor() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 20),
      new THREE.MeshBasicMaterial({ color: 0x0a0c18 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -6;
    this.scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(6, 20),
      new THREE.MeshBasicMaterial({ color: 0x02040a }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.2, -6);
    this.scene.add(ceil);
    const wm = new THREE.MeshBasicMaterial({ color: 0x050820 });
    const mkSide = (x: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.2), wm);
      m.position.set(x, 1.6, -6);
      m.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(m);
    };
    mkSide(-3); mkSide(3);
    // End wall behind the podium.
    const end = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), wm);
    end.position.set(0, 1.6, -14);
    this.scene.add(end);
    // Front wall behind player (with a door silhouette).
    const front = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2),
      new THREE.MeshBasicMaterial({ color: 0x080a18 }));
    front.position.set(0, 1.6, 2); front.rotation.y = Math.PI;
    this.scene.add(front);
  }

  private buildMirrors() {
    // Seven panels down the corridor (alternating sides), each showing
    // withdraw() re-entering. As t advances the balance drains.
    const spots: { x: number; z: number; ry: number }[] = [
      { x: -2.95, z: -1.5, ry: Math.PI / 2 },
      { x:  2.95, z: -3,   ry: -Math.PI / 2 },
      { x: -2.95, z: -4.5, ry: Math.PI / 2 },
      { x:  2.95, z: -6,   ry: -Math.PI / 2 },
      { x: -2.95, z: -7.5, ry: Math.PI / 2 },
      { x:  2.95, z: -9,   ry: -Math.PI / 2 },
      { x: -2.95, z: -10.5, ry: Math.PI / 2 },
    ];
    spots.forEach((s, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = 768; canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.6),
        new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
      );
      mesh.position.set(s.x + (s.x > 0 ? -0.04 : 0.04), 1.6, s.z);
      mesh.rotation.y = s.ry;
      this.scene.add(mesh);
      // Frame.
      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 1.7),
        new THREE.MeshBasicMaterial({ color: 0x202840 }),
      );
      frame.position.set(s.x + (s.x > 0 ? -0.03 : 0.03), 1.6, s.z);
      frame.rotation.y = s.ry;
      this.scene.add(frame);
      this.mirrors.push({ mesh, canvas, ctx, texture, balance: 1_000_000 - i * 120_000, depth: 0 });
    });
  }

  private renderMirror(m: typeof this.mirrors[number], elapsed: number) {
    const ctx = m.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#080a18'; ctx.fillRect(0, 0, 768, 1024);
    // Header.
    ctx.fillStyle = '#ff4060'; ctx.font = 'bold 36px monospace'; ctx.textBaseline = 'top';
    ctx.fillText('withdraw()', 32, 24);
    ctx.fillStyle = '#8090b0'; ctx.font = '20px monospace';
    ctx.fillText('TheDAO.sol · line 667', 32, 70);
    // Call stack depth — draws nested frames.
    const depth = Math.min(7, 1 + Math.floor(elapsed * 0.9) - (m.balance < 100_000 ? 0 : 0));
    m.depth = depth;
    let y = 120;
    for (let d = 0; d < depth; d++) {
      ctx.fillStyle = d === depth - 1 ? '#ffa040' : '#506080';
      ctx.fillRect(32 + d * 14, y, 700 - d * 28, 80);
      ctx.fillStyle = '#02040a';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`frame #${d}  withdraw()`, 44 + d * 14, y + 10);
      ctx.font = '16px monospace';
      ctx.fillText(`-> call attacker.fallback()`, 44 + d * 14, y + 40);
      y += 90;
    }
    // Balance drain.
    const drainedEach = Math.min(80_000, elapsed * 30_000);
    const bal = Math.max(0, m.balance - drainedEach * depth);
    ctx.fillStyle = '#40ff80'; ctx.font = 'bold 28px monospace';
    ctx.fillText(`balance = ${bal.toFixed(0)} ETH`, 32, y + 40);
    ctx.fillStyle = '#ff4060'; ctx.font = 'bold 24px monospace';
    ctx.fillText(`(bal -= amount MOVED AFTER call)`, 32, y + 84);
    m.texture.needsUpdate = true;
  }

  private buildPodium() {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1, 1.1, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x202838 }));
    pod.position.set(0, 0.55, -13.2);
    this.scene.add(pod);
    this.podium = pod;

    this.podiumCanvas = document.createElement('canvas');
    this.podiumCanvas.width = 1024; this.podiumCanvas.height = 640;
    this.podiumCtx = this.podiumCanvas.getContext('2d')!;
    this.podiumTex = new THREE.CanvasTexture(this.podiumCanvas);
    this.podiumTex.minFilter = THREE.LinearFilter;
    this.podiumTex.magFilter = THREE.NearestFilter;
    this.podiumTex.generateMipmaps = false;
    this.podiumScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.82, 0.5),
      new THREE.MeshBasicMaterial({ map: this.podiumTex, toneMapped: false }),
    );
    this.podiumScreen.position.set(0, 1.1, -12.9);
    this.podiumScreen.rotation.x = -0.5;
    this.scene.add(this.podiumScreen);
  }

  private renderPodium(picked: Choice | null = null) {
    const ctx = this.podiumCtx;
    const W = this.podiumCanvas.width, H = this.podiumCanvas.height;
    const SX = W / 512, SY = H / 320;
    ctx.setTransform(SX, 0, 0, SY, 0, 0);
    const VW = 512, VH = 320;
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#ff4060'; ctx.font = 'bold 24px monospace'; ctx.textBaseline = 'top';
    ctx.fillText('[ THE DAO · 3.6M ETH DRAINED ]', 18, 16);

    if (this.phase === 'intro') {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 18px monospace';
      ctx.fillText('How do you read this?', 18, 76);
      ctx.font = '15px monospace'; ctx.fillStyle = '#9aa0b0';
      ctx.fillText('The bug is real. The ether is gone.', 18, 108);
      ctx.fillText('Everything downstream is politics.', 18, 132);
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 15px monospace';
      ctx.fillText('[ press E to answer ]', 18, VH - 26);
    } else if (this.phase === 'active' && !picked) {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 16px monospace';
      ctx.fillText('Your reading:', 18, 76);
      ctx.font = 'bold 13px monospace';
      CHOICES.forEach((c, i) => {
        ctx.fillStyle = '#9adfff';
        ctx.fillText(`[${c.key}] ${c.label}`, 18, 108 + i * 34);
      });
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 14px monospace';
      ctx.fillText('press 1 / 2 / 3 / 4', 18, VH - 26);
    } else if (picked) {
      ctx.fillStyle = '#ffa040'; ctx.font = 'bold 22px monospace';
      ctx.fillText('> noted.', 18, 86);
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 15px monospace';
      wrap(ctx, picked.body, 18, 124, VW - 36, 22);
      ctx.fillStyle = '#5a7090'; ctx.font = '12px monospace';
      ctx.fillText('(the fork debate begins tomorrow.)', 18, VH - 26);
    }
    this.podiumTex.needsUpdate = true;
  }

  update(dt: number, input: Input) {
    if (this.briefingActive) return;
    this.fps.update(dt, input);
    this.t += dt;
    // Throttle mirror renders — 4 fps is plenty for a call-stack animation.
    if (Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) {
      this.mirrors.forEach(m => this.renderMirror(m, this.t + (this.mirrors.indexOf(m) * 0.3)));
    }
    this.updateInteractions(input);
  }

  private updateInteractions(input: Input) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects([this.podium, this.podiumScreen], false);
    const target = hits.length > 0 && hits[0].distance < 2.6 ? hits[0].object : null;

    if (!target) this.setPrompt(null);
    else if (this.phase === 'intro') this.setPrompt('PRESS E TO ANSWER');
    else if (this.phase === 'active') this.setPrompt('PRESS 1 / 2 / 3 / 4');

    if (target && input.wasPressed('KeyE') && this.phase === 'intro') {
      this.phase = 'active';
      this.renderPodium();
      this.game.audio.playSFX('interact');
      this.setObjective('PICK YOUR READING · 1 / 2 / 3 / 4');
    }
    if (this.phase === 'active') {
      for (const c of CHOICES) if (input.wasPressed(`Digit${c.key}`)) { this.onChoose(c); break; }
    }
  }

  private onChoose(c: Choice) {
    if (this.phase !== 'active') return;
    this.phase = 'picked';
    this.game.archetype.add(4, `choice-${c.key}`, c.weights);
    this.game.audio.playSFX('damage');
    this.renderPodium(c);
    this.setObjective('READING LOGGED · CHAPTER COMPLETE');
    setTimeout(() => this.win(), 1800);
  }

  private canMoveTo(p: THREE.Vector3): boolean {
    const pad = 0.3;
    if (p.x < this.CORRIDOR.xMin - 0.8 + pad || p.x > this.CORRIDOR.xMax + 0.8 - pad) return false;
    if (p.z < this.CORRIDOR.zMin + pad || p.z > this.CORRIDOR.zMax - pad) return false;
    // Block podium volume.
    if (p.x > -0.7 && p.x < 0.7 && p.z > -13.6 && p.z < -12.8) return false;
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
