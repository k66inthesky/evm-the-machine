// Chapter 06 — FORK (July 20, 2016).
//
// A literal fork in the corridor. A divider splits the path: left passage
// glows orange (ETC — "code is law"), right passage glows cyan (ETH — the
// hard fork that returns the DAO funds). A gate before the junction locks
// you in place until you pick a side. Either vote counts — archetype weights
// differ.
//
// Ambient: a hanging sign overhead counts the running miner vote between
// the two chains.
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
  { key: '1', label: 'HARD FORK — return the DAO funds.',   body: 'You step into the cyan passage. The chain splits, the funds come back, Ethereum continues.', weights: { G: 2, B: 1 } },
  { key: '2', label: 'CLASSIC — code is law, do not fork.', body: 'You step into the orange passage. The chain stays pure. Ether is what it was.',               weights: { R: 2, V: 1 } },
  { key: '3', label: 'ABSTAIN — bear witness, pick later.',  body: 'You stay at the junction. Whoever wins, wins. You are here to record, not to choose.',       weights: { W: 2 } },
  { key: '4', label: 'BUILD — walk out, ship something new.',body: 'You leave the fork behind. Whatever chain wins, someone has to build the next thing.',      weights: { B: 1, V: 1, E: 1 } },
];

export class ForkChamber extends Chamber {
  chamberIndex = 5;
  title = 'FORK';

  private fps!: FPSController;
  private raycaster = new THREE.Raycaster();

  private terminal!: THREE.Mesh;
  private screen!: THREE.Mesh;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private tex!: THREE.CanvasTexture;

  private signCanvas!: HTMLCanvasElement;
  private signCtx!: CanvasRenderingContext2D;
  private signTex!: THREE.CanvasTexture;

  private ethCount = 85;
  private etcCount = 15;
  private phase: 'intro' | 'active' | 'picked' = 'intro';
  private prompt: HTMLDivElement | null = null;
  private t = 0;
  private pickedChoice: Choice | null = null;
  private flashTiles: { mesh: THREE.Mesh; color: number }[] = [];

  protected build() {
    this.scene.background = new THREE.Color(0x05050a);
    this.scene.fog = new THREE.Fog(0x05050a, 3, 18);

    this.buildCorridor();
    this.buildSign();
    this.buildTerminal();
    this.buildForkPortals();

    this.fps = new FPSController({
      eyeHeight: 1.65, walkSpeed: 2.8, sprintSpeed: 4.2,
      canMoveTo: (p) => this.canMoveTo(p),
      onGroundHeight: () => 0,
    });
    this.fps.setPosition(0, 1.65, 2);
    this.fps.setYaw(0);
    this.camera = this.fps.camera;

    this.renderScreen();
    this.installBriefing({
      code: 'CHAPTER 06 · 2016',
      title: 'FORK',
      subtitle: '分叉 · 20 JULY · BLOCK 1,920,000',
      body: 'The corridor ahead splits. Left, the chain that keeps the DAO losses — Ethereum Classic. Right, the hard fork that returns them. The vote is running overhead. A terminal at the junction takes your voice.',
      action: 'walk up to the terminal at the fork, press <b>E</b>, then <b>1 / 2 / 3 / 4</b> to cast your vote.',
      objective: 'WALK TO THE FORK · PRESS E',
    });
  }

  private buildCorridor() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 16),
      new THREE.MeshBasicMaterial({ color: 0x101018 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -4;
    this.scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(4, 16),
      new THREE.MeshBasicMaterial({ color: 0x02040a }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.2, -4);
    this.scene.add(ceil);
    const wm = new THREE.MeshBasicMaterial({ color: 0x0a0c18 });
    const mkSide = (x: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 3.2), wm);
      m.position.set(x, 1.6, -4);
      m.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(m);
    };
    mkSide(-2); mkSide(2);
  }

  private buildSign() {
    this.signCanvas = document.createElement('canvas');
    this.signCanvas.width = 1600; this.signCanvas.height = 256;
    this.signCtx = this.signCanvas.getContext('2d')!;
    this.signTex = new THREE.CanvasTexture(this.signCanvas);
    this.signTex.minFilter = THREE.LinearFilter;
    this.signTex.magFilter = THREE.NearestFilter;
    this.signTex.generateMipmaps = false;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 0.6),
      new THREE.MeshBasicMaterial({ map: this.signTex, toneMapped: false }),
    );
    sign.position.set(0, 2.6, -2);
    this.scene.add(sign);
  }

  private renderSign() {
    const ctx = this.signCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, 1600, 256);
    ctx.fillStyle = '#a0b8d0'; ctx.font = 'bold 44px monospace'; ctx.textBaseline = 'middle';
    ctx.fillText('MINER VOTE · BLOCK 1,920,000', 44, 54);
    // ETH bar.
    const barW = 1500, barH = 60, barX = 44, barY = 120;
    ctx.fillStyle = '#303040'; ctx.fillRect(barX, barY, barW, barH);
    const ethW = barW * (this.ethCount / 100);
    ctx.fillStyle = '#00d0ff'; ctx.fillRect(barX, barY, ethW, barH);
    ctx.fillStyle = '#ffa040'; ctx.fillRect(barX + ethW, barY, barW - ethW, barH);
    ctx.fillStyle = '#02040a'; ctx.font = 'bold 40px monospace';
    ctx.fillText(`HARDFORK ${this.ethCount}%`, barX + 24, barY + 30);
    ctx.textAlign = 'right';
    ctx.fillText(`${this.etcCount}% CLASSIC`, barX + barW - 24, barY + 30);
    ctx.textAlign = 'left';
    this.signTex.needsUpdate = true;
  }

  private buildTerminal() {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x1a2030 }));
    stand.position.set(0, 0.5, -4);
    this.scene.add(stand);
    this.terminal = stand;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024; this.canvas.height = 640;
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.magFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.42),
      new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false }),
    );
    this.screen.position.set(0, 1.05, -3.72);
    this.screen.rotation.x = -0.45;
    this.scene.add(this.screen);
  }

  private buildForkPortals() {
    // The fork: two archways behind the terminal. Both lit panels + wall
    // to suggest passages.
    const mkPassage = (x: number, color: number) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 2.6, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x202030 }),
      );
      // Doorframe pillars.
      for (const dx of [-1, 1]) {
        const p = frame.clone();
        p.position.set(x + dx * 0.7, 1.3, -5.5);
        this.scene.add(p);
      }
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.15, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x202030 }),
      );
      top.position.set(x, 2.55, -5.5);
      this.scene.add(top);
      // Colored glow plane inside the passage.
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 2.4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }),
      );
      glow.position.set(x, 1.3, -6.5);
      this.scene.add(glow);
      this.flashTiles.push({ mesh: glow, color });
      // Label plaque.
      const label = document.createElement('canvas');
      label.width = 512; label.height = 256;
      const lctx = label.getContext('2d')!;
      lctx.fillStyle = '#02040a'; lctx.fillRect(0, 0, 512, 256);
      lctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      lctx.font = 'bold 64px monospace'; lctx.textBaseline = 'middle'; lctx.textAlign = 'center';
      lctx.fillText(color === 0x00d0ff ? 'HARD FORK' : 'CLASSIC', 256, 100);
      lctx.font = 'bold 32px monospace';
      lctx.fillText(color === 0x00d0ff ? 'funds restored' : 'code is law', 256, 180);
      const tex = new THREE.CanvasTexture(label);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.6),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
      );
      sign.position.set(x, 2.1, -5.4);
      this.scene.add(sign);
    };
    mkPassage(-2.2, 0xffa040);
    mkPassage(2.2, 0x00d0ff);
  }

  private renderScreen(picked: Choice | null = null) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const SX = W / 512, SY = H / 320;
    ctx.setTransform(SX, 0, 0, SY, 0, 0);
    const VW = 512, VH = 320;
    ctx.fillStyle = '#060810'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#80d0ff'; ctx.font = 'bold 22px monospace'; ctx.textBaseline = 'top';
    ctx.fillText('[ VOTE BOOTH · FORK 2016 ]', 16, 16);

    if (this.phase === 'intro') {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 17px monospace';
      ctx.fillText('Two chains. One choice. Or none.', 16, 66);
      ctx.font = '14px monospace'; ctx.fillStyle = '#9aa0b0';
      ctx.fillText('Whatever you pick is on-record.', 16, 96);
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 15px monospace';
      ctx.fillText('[ press E to cast a vote ]', 16, VH - 26);
    } else if (this.phase === 'active' && !picked) {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 16px monospace';
      ctx.fillText('Cast your vote:', 16, 66);
      ctx.font = 'bold 13px monospace';
      CHOICES.forEach((c, i) => {
        ctx.fillStyle = c.key === '1' ? '#00d0ff' : c.key === '2' ? '#ffa040' : '#9adfff';
        ctx.fillText(`[${c.key}] ${c.label}`, 16, 100 + i * 32);
      });
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 14px monospace';
      ctx.fillText('press 1 / 2 / 3 / 4', 16, VH - 26);
    } else if (picked) {
      ctx.fillStyle = '#80ff80'; ctx.font = 'bold 20px monospace';
      ctx.fillText('> voted.', 16, 76);
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 14px monospace';
      wrap(ctx, picked.body, 16, 110, VW - 32, 22);
      ctx.fillStyle = '#5a7090'; ctx.font = '12px monospace';
      ctx.fillText('(block 1,920,000. the chain splits.)', 16, VH - 26);
    }
    this.tex.needsUpdate = true;
  }

  update(dt: number, input: Input) {
    if (this.briefingActive) return;
    this.fps.update(dt, input);
    this.t += dt;
    // Vote bar drifts toward 85/15 before the fork, then snaps to picked.
    if (this.phase !== 'picked') {
      const target = { eth: 85, etc: 15 };
      this.ethCount += (target.eth - this.ethCount) * dt * 0.5 + (Math.random() - 0.5) * 0.3;
      this.etcCount = 100 - this.ethCount;
    }
    if (Math.floor(this.t * 3) !== Math.floor((this.t - dt) * 3)) this.renderSign();
    // Pulse the two passage glows.
    this.flashTiles.forEach((t) => {
      const mat = t.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.28 + Math.sin(this.t * 2.5 + (t.color === 0xffa040 ? 0 : Math.PI)) * 0.08;
    });
    this.updateInteractions(input);
  }

  private updateInteractions(input: Input) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects([this.terminal, this.screen], false);
    const target = hits.length > 0 && hits[0].distance < 2.6 ? hits[0].object : null;

    if (!target) this.setPrompt(null);
    else if (this.phase === 'intro') this.setPrompt('PRESS E TO VOTE');
    else if (this.phase === 'active') this.setPrompt('PRESS 1 / 2 / 3 / 4');

    if (target && input.wasPressed('KeyE') && this.phase === 'intro') {
      this.phase = 'active';
      this.renderScreen();
      this.game.audio.playSFX('interact');
      this.setObjective('CAST YOUR VOTE · 1 / 2 / 3 / 4');
    }
    if (this.phase === 'active') {
      for (const c of CHOICES) if (input.wasPressed(`Digit${c.key}`)) { this.onChoose(c); break; }
    }
  }

  private onChoose(c: Choice) {
    if (this.phase !== 'active') return;
    this.phase = 'picked';
    this.pickedChoice = c;
    this.game.archetype.add(5, `choice-${c.key}`, c.weights);
    this.game.audio.playSFX('merge');
    this.renderScreen(c);
    // Snap the bar to reflect the community's actual split.
    this.ethCount = 85; this.etcCount = 15;
    this.setObjective('VOTE CAST · CHAPTER COMPLETE');
    setTimeout(() => this.win(), 2000);
  }

  private canMoveTo(p: THREE.Vector3): boolean {
    const pad = 0.3;
    if (p.x < -2 + pad || p.x > 2 - pad) return false;
    if (p.z < -5 + pad || p.z > 4 - pad) return false;
    // Terminal volume.
    if (p.x > -0.5 && p.x < 0.5 && p.z > -4.4 && p.z < -3.6) return false;
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
