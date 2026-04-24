// Chapter 08 — MERGE (September 15, 2022, 06:42:42 UTC).
//
// A server room full of PoW miners, humming, waiting. A single pedestal in
// the center holds a red MERGE button. When you press it, the miner lights
// fade row by row, the fans wind down, and the room goes quiet. A mirror
// behind the pedestal lights up with the archetype the chapters decided
// about you — the finale screen owns the reveal, this chamber just seats
// the moment.
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
  { key: '1', label: 'PRESS THE MERGE BUTTON',               body: 'You press it. The fans wind down row by row. The machine keeps running, quieter.', weights: { B: 2, V: 1 } },
  { key: '2', label: 'PAY RESPECT TO PoW · press after a beat', body: 'You stand still. One breath for the miners that carried this. Then you press it.',  weights: { E: 2, W: 1 } },
  { key: '3', label: 'CHECK THE CALL STACK · read, then press', body: 'You crouch to one of the miners and read its logs. You press when you\'re satisfied.',weights: { E: 1, W: 2 } },
  { key: '4', label: 'WALK OUT WITHOUT PRESSING',              body: 'You leave. The room will merge without you. You were never only here for the ceremony.',weights: { W: 2, R: 1 } },
];

export class MergeChamber extends Chamber {
  chamberIndex = 7;
  title = 'MERGE';

  private fps!: FPSController;
  private raycaster = new THREE.Raycaster();

  private button!: THREE.Mesh;
  private pedestal!: THREE.Mesh;
  private pedestalScreen!: THREE.Mesh;
  private pedestalCanvas!: HTMLCanvasElement;
  private pedestalCtx!: CanvasRenderingContext2D;
  private pedestalTex!: THREE.CanvasTexture;
  private minerRows: { plane: THREE.Mesh; tex: THREE.CanvasTexture; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; alive: boolean; dimming: number }[] = [];
  private phase: 'intro' | 'active' | 'picked' = 'intro';
  private prompt: HTMLDivElement | null = null;
  private t = 0;
  private exited = false;
  private readonly ROOM = { xMin: -5, xMax: 5, zMin: -7, zMax: 4 };

  protected build() {
    this.scene.background = new THREE.Color(0x02030a);
    this.scene.fog = new THREE.Fog(0x02030a, 4, 22);

    this.buildRoom();
    this.buildMiners();
    this.buildPedestal();
    this.buildExitDoor();

    this.fps = new FPSController({
      eyeHeight: 1.65, walkSpeed: 2.9, sprintSpeed: 4.2,
      canMoveTo: (p) => this.canMoveTo(p),
      onGroundHeight: () => 0,
    });
    this.fps.setPosition(0, 1.65, 3);
    this.fps.setYaw(Math.PI);
    this.camera = this.fps.camera;

    this.renderPedestal();
    this.installBriefing({
      code: 'CHAPTER 08 · 2022',
      title: 'MERGE',
      subtitle: '熔接 · 15 SEP · 06:42:42 UTC',
      body: 'The last PoW room on Earth. Racks of miners humming on either side. The red button on the pedestal tips the world computer from work to stake. The machine will not wait for you forever — but it will wait a minute.',
      action: 'walk up to the pedestal, press <b>E</b>, then <b>1 / 2 / 3 / 4</b> to decide how you meet the moment. Or walk out the back door.',
      objective: 'WALK TO THE PEDESTAL',
    });
  }

  private buildRoom() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 16),
      new THREE.MeshBasicMaterial({ color: 0x070810 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -2;
    this.scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 16),
      new THREE.MeshBasicMaterial({ color: 0x02030a }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4, -2);
    this.scene.add(ceil);
    const wm = new THREE.MeshBasicMaterial({ color: 0x08090f });
    const mk = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wm);
      m.position.set(x, y, z); m.rotation.y = ry;
      this.scene.add(m);
    };
    mk(14, 4, 0, 2, -10, 0);          // back wall behind pedestal (far)
    mk(14, 4, -7, 2, -2, Math.PI / 2);
    mk(14, 4, 7, 2, -2, -Math.PI / 2);
    // Front wall with exit door gap.
    mk(4, 4, -5, 2, 6, Math.PI);
    mk(4, 4, 5, 2, 6, Math.PI);
    mk(2, 1, 0, 3.5, 6, Math.PI); // lintel over the door
  }

  private buildMiners() {
    // Two rows of GPU rigs, five per side, facing inward.
    const rowZ = [-8, -6, -4, -2, 0];
    for (const z of rowZ) {
      this.spawnRow(-5.2, z, Math.PI / 2);
      this.spawnRow( 5.2, z, -Math.PI / 2);
    }
  }

  private spawnRow(x: number, z: number, ry: number) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.6, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x101018 }),
    );
    body.position.set(x, 0.8, z); body.rotation.y = ry;
    this.scene.add(body);
    // Blinkenlight face.
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    this.paintMinerFace(ctx, true, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.5),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    );
    plane.position.set(
      x + (ry === Math.PI / 2 ? 0.31 : -0.31),
      0.8, z,
    );
    plane.rotation.y = ry;
    this.scene.add(plane);
    this.minerRows.push({ plane, tex, canvas, ctx, alive: true, dimming: 0 });
  }

  private paintMinerFace(ctx: CanvasRenderingContext2D, alive: boolean, dim: number) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#02040a'; ctx.fillRect(0, 0, 256, 512);
    const rows = 14, cols = 4;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const base = alive ? (Math.random() < 0.8 ? '#40ff80' : '#ffaa40') : '#201510';
      ctx.fillStyle = alive ? base : '#201510';
      ctx.globalAlpha = alive ? 1 - dim * 0.8 : 0.3;
      ctx.fillRect(20 + c * 52, 20 + r * 32, 40, 20);
    }
    ctx.globalAlpha = 1;
  }

  private buildPedestal() {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 1.0, 16),
      new THREE.MeshBasicMaterial({ color: 0x1a1a24 }),
    );
    col.position.set(0, 0.5, -4);
    this.scene.add(col);
    this.pedestal = col;
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16),
      new THREE.MeshBasicMaterial({ color: 0x30303a }),
    );
    top.position.set(0, 1.03, -4);
    this.scene.add(top);
    // The button (a wide red dome).
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24),
      new THREE.MeshBasicMaterial({ color: 0xff3040 }),
    );
    btn.position.set(0, 1.09, -4);
    this.scene.add(btn);
    this.button = btn;
    // Pedestal screen angled up toward the player.
    this.pedestalCanvas = document.createElement('canvas');
    this.pedestalCanvas.width = 1024; this.pedestalCanvas.height = 640;
    this.pedestalCtx = this.pedestalCanvas.getContext('2d')!;
    this.pedestalTex = new THREE.CanvasTexture(this.pedestalCanvas);
    this.pedestalTex.minFilter = THREE.LinearFilter;
    this.pedestalTex.magFilter = THREE.NearestFilter;
    this.pedestalTex.generateMipmaps = false;
    this.pedestalScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.44),
      new THREE.MeshBasicMaterial({ map: this.pedestalTex, toneMapped: false }),
    );
    this.pedestalScreen.position.set(0, 1.04, -3.74);
    this.pedestalScreen.rotation.x = -0.6;
    this.scene.add(this.pedestalScreen);
  }

  private buildExitDoor() {
    // The back-out door, behind the player spawn. Simple glow panel.
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 3),
      new THREE.MeshBasicMaterial({ color: 0x081018 }),
    );
    door.position.set(0, 1.5, 5.98);
    door.rotation.y = Math.PI;
    this.scene.add(door);
    const sign = document.createElement('canvas');
    sign.width = 512; sign.height = 128;
    const s = sign.getContext('2d')!;
    s.fillStyle = '#06080e'; s.fillRect(0, 0, 512, 128);
    s.fillStyle = '#80ffa0'; s.font = 'bold 52px monospace'; s.textBaseline = 'middle'; s.textAlign = 'center';
    s.fillText('EXIT · WITNESS', 256, 64);
    const tex = new THREE.CanvasTexture(sign);
    tex.magFilter = THREE.NearestFilter;
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.4),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    );
    plate.position.set(0, 3.2, 5.97);
    plate.rotation.y = Math.PI;
    this.scene.add(plate);
  }

  private renderPedestal(picked: Choice | null = null) {
    const ctx = this.pedestalCtx;
    const W = this.pedestalCanvas.width, H = this.pedestalCanvas.height;
    const SX = W / 512, SY = H / 320;
    ctx.setTransform(SX, 0, 0, SY, 0, 0);
    const VW = 512, VH = 320;
    ctx.fillStyle = '#04060c'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#ff6080'; ctx.font = 'bold 20px monospace'; ctx.textBaseline = 'top';
    ctx.fillText('[ CEREMONY · 06:42:42 UTC ]', 18, 16);

    if (this.phase === 'intro') {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 17px monospace';
      ctx.fillText('The merge is ready.', 18, 66);
      ctx.font = '14px monospace'; ctx.fillStyle = '#9aa0b0';
      ctx.fillText('PoW is about to lay down. A decade', 18, 96);
      ctx.fillText('of work becomes a last block.', 18, 120);
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 15px monospace';
      ctx.fillText('[ press E to open the choice ]', 18, VH - 26);
    } else if (this.phase === 'active' && !picked) {
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 15px monospace';
      ctx.fillText('How do you meet this moment?', 18, 66);
      ctx.font = 'bold 12px monospace';
      CHOICES.forEach((c, i) => {
        ctx.fillStyle = '#9adfff';
        ctx.fillText(`[${c.key}] ${c.label}`, 18, 100 + i * 32);
      });
      ctx.fillStyle = '#ffb070'; ctx.font = 'italic bold 14px monospace';
      ctx.fillText('press 1 / 2 / 3 / 4', 18, VH - 26);
    } else if (picked) {
      ctx.fillStyle = '#40ff80'; ctx.font = 'bold 22px monospace';
      ctx.fillText('> merged.', 18, 82);
      ctx.fillStyle = '#e0eeff'; ctx.font = 'bold 14px monospace';
      wrap(ctx, picked.body, 18, 120, VW - 36, 22);
      ctx.fillStyle = '#5a7090'; ctx.font = '12px monospace';
      ctx.fillText('(the machine is quieter now.)', 18, VH - 26);
    }
    this.pedestalTex.needsUpdate = true;
  }

  update(dt: number, input: Input) {
    if (this.briefingActive) return;
    this.fps.update(dt, input);
    this.t += dt;

    // Ambient miner blink (while alive).
    if (Math.floor(this.t * 3) !== Math.floor((this.t - dt) * 3)) {
      this.minerRows.forEach((m) => {
        if (m.alive) this.paintMinerFace(m.ctx, true, 0);
        else {
          m.dimming = Math.min(1, m.dimming + 0.15);
          this.paintMinerFace(m.ctx, false, m.dimming);
        }
        m.tex.needsUpdate = true;
      });
    }

    // Button pulses red while still active.
    if (this.phase !== 'picked') {
      const mat = this.button.material as THREE.MeshBasicMaterial;
      mat.color.setHex(Math.sin(this.t * 3) > 0.3 ? 0xff4060 : 0xaa2030);
    }

    // Silent-exit: walk out the back door without choosing.
    if (!this.exited && this.phase !== 'picked' && this.fps.position.z > 5.4) {
      this.exited = true;
      this.game.archetype.add(7, 'silent-exit', { W: 2, R: 1 });
      this.game.audio.playSFX('portal');
      this.setObjective('YOU WALKED OUT · JOURNEY COMPLETE');
      setTimeout(() => this.win(), 900);
    }

    if (this.phase !== 'picked') this.updateInteractions(input);
  }

  private updateInteractions(input: Input) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects([this.pedestal, this.pedestalScreen, this.button], false);
    const target = hits.length > 0 && hits[0].distance < 2.8 ? hits[0].object : null;

    if (!target) this.setPrompt(null);
    else if (this.phase === 'intro') this.setPrompt('PRESS E TO BEGIN CEREMONY');
    else if (this.phase === 'active') this.setPrompt('PRESS 1 / 2 / 3 / 4');

    if (target && input.wasPressed('KeyE') && this.phase === 'intro') {
      this.phase = 'active';
      this.renderPedestal();
      this.game.audio.playSFX('interact');
      this.setObjective('CHOOSE HOW YOU MERGE · 1 / 2 / 3 / 4');
    }
    if (this.phase === 'active') {
      for (const c of CHOICES) if (input.wasPressed(`Digit${c.key}`)) { this.onChoose(c); break; }
    }
  }

  private onChoose(c: Choice) {
    if (this.phase !== 'active') return;
    this.phase = 'picked';
    this.game.archetype.add(7, `choice-${c.key}`, c.weights);
    this.game.audio.playSFX('merge');
    this.renderPedestal(c);
    this.setObjective('MERGED · CEREMONY COMPLETE');

    if (c.key === '4') {
      // Option 4 = walk out. Fade everything, no miner shutdown.
      setTimeout(() => this.win(), 1800);
      return;
    }

    // Wind down miners one row at a time.
    const delayPer = c.key === '2' ? 220 : c.key === '3' ? 180 : 120;
    this.minerRows.forEach((m, i) => {
      setTimeout(() => {
        m.alive = false;
        this.game.audio.playSFX('hit');
      }, 400 + i * delayPer);
    });
    setTimeout(() => this.win(), 400 + this.minerRows.length * delayPer + 900);
  }

  private canMoveTo(p: THREE.Vector3): boolean {
    const pad = 0.3;
    if (p.x < this.ROOM.xMin + pad || p.x > this.ROOM.xMax - pad) return false;
    if (p.z < this.ROOM.zMin + pad || p.z > this.ROOM.zMax + 2 - pad) return false;
    // Pedestal volume.
    const dx = p.x, dz = p.z - (-4);
    if (dx * dx + dz * dz < 0.7 * 0.7) return false;
    // Miner rows volumes.
    for (const zR of [-8, -6, -4, -2, 0]) {
      for (const xR of [-5.2, 5.2]) {
        if (Math.abs(p.x - xR) < 0.7 && Math.abs(p.z - zR) < 0.6) return false;
      }
    }
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
