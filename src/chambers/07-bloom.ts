// Chapter 07 — BLOOM (2020–2021, DeFi summer / NFT explosion).
//
// A neon trading floor. Four glowing plinths, each a different protocol
// ethos — Money Lego (Uniswap), Primitive (Aave), Experiment (DAO tooling),
// Mania (NFT floor price tickers). The player walks between them, picks one
// to "mint" to. Each plinth pulses its own color and ticker.
//
// Visually dense so the chapter reads as "everything is happening at once."
import * as THREE from 'three';
import { Chamber } from './chamber';
import type { Input } from '../core/input';
import { FPSController } from '../core/fps-controller';
import type { ArchetypeVector } from '../systems/archetype';

interface Plinth {
  key: string;
  label: string;
  title: string;
  ethos: string;
  color: number;
  body: string;
  weights: Partial<ArchetypeVector>;
  mesh: THREE.Mesh;
  sign: THREE.Mesh;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  value: number;
  delta: number;
}

const PLINTH_SPECS: Omit<Plinth, 'mesh' | 'sign' | 'canvas' | 'ctx' | 'tex' | 'value' | 'delta'>[] = [
  {
    key: '1', label: 'MONEY LEGO', title: 'UNISWAP', ethos: 'trustless swaps',
    color: 0xff40a0,
    body: 'You kneel at the pink plinth. Trustless pools. Money that composes.',
    weights: { B: 2, E: 1 },
  },
  {
    key: '2', label: 'PRIMITIVE', title: 'AAVE', ethos: 'lending / liquidation',
    color: 0x8a40ff,
    body: 'You kneel at the violet plinth. New credit rails. Collateral at the speed of a block.',
    weights: { C: 2, V: 1 },
  },
  {
    key: '3', label: 'EXPERIMENT', title: 'DAO TOOLS', ethos: 'governance at scale',
    color: 0x40e0ff,
    body: 'You kneel at the cyan plinth. Governance as a protocol. Every vote on-chain.',
    weights: { G: 2, B: 1 },
  },
  {
    key: '4', label: 'MANIA', title: 'NFT FLOOR', ethos: 'speculation, culture, churn',
    color: 0xffa040,
    body: 'You kneel at the amber plinth. JPGs at the price of houses. Culture at the price of culture.',
    weights: { S: 2, R: 1 },
  },
];

export class BloomChamber extends Chamber {
  chamberIndex = 6;
  title = 'BLOOM';

  private fps!: FPSController;
  private raycaster = new THREE.Raycaster();
  private plinths: Plinth[] = [];
  private phase: 'intro' | 'picked' = 'intro';
  private prompt: HTMLDivElement | null = null;
  private t = 0;
  private readonly ROOM = { xMin: -5, xMax: 5, zMin: -5, zMax: 5 };

  protected build() {
    this.scene.background = new THREE.Color(0x050210);
    this.scene.fog = new THREE.Fog(0x050210, 4, 22);

    this.buildRoom();
    this.buildPlinths();

    this.fps = new FPSController({
      eyeHeight: 1.65, walkSpeed: 3.0, sprintSpeed: 4.4,
      canMoveTo: (p) => this.canMoveTo(p),
      onGroundHeight: () => 0,
    });
    this.fps.setPosition(0, 1.65, 3.2);
    this.fps.setYaw(0);
    this.camera = this.fps.camera;

    this.installBriefing({
      code: 'CHAPTER 07 · 2021',
      title: 'BLOOM',
      subtitle: '盛放 · DEFI SUMMER / NFT MANIA',
      body: 'The machine is running hot. Swaps, lends, JPGs, votes — every minute there is another protocol. Four plinths glow on this floor, one per ethos. Walk to the one you actually believe in and mint.',
      action: 'walk up to a plinth (look at it to see which key), then press <b>1 / 2 / 3 / 4</b> to mint to that ethos.',
      objective: 'WALK TO A PLINTH · PRESS 1-4 TO MINT',
    });
  }

  private buildRoom() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0x101020 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    // Neon grid overlay.
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 1024; gridCanvas.height = 1024;
    const gctx = gridCanvas.getContext('2d')!;
    gctx.fillStyle = '#0a0820'; gctx.fillRect(0, 0, 1024, 1024);
    gctx.strokeStyle = '#ff40a0'; gctx.lineWidth = 2;
    for (let i = 0; i <= 16; i++) {
      const p = (i / 16) * 1024;
      gctx.beginPath(); gctx.moveTo(p, 0); gctx.lineTo(p, 1024); gctx.stroke();
      gctx.beginPath(); gctx.moveTo(0, p); gctx.lineTo(1024, p); gctx.stroke();
    }
    const gTex = new THREE.CanvasTexture(gridCanvas);
    gTex.magFilter = THREE.LinearFilter; gTex.minFilter = THREE.LinearFilter;
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ map: gTex, transparent: true, opacity: 0.25, toneMapped: false }));
    grid.rotation.x = -Math.PI / 2; grid.position.y = 0.001;
    this.scene.add(grid);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0x050008 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 4;
    this.scene.add(ceil);
    const wm = new THREE.MeshBasicMaterial({ color: 0x0a0820 });
    const mk = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wm);
      m.position.set(x, y, z); m.rotation.y = ry;
      this.scene.add(m);
    };
    mk(10, 4, 0, 2, -5, 0);
    mk(10, 4, -5, 2, 0, Math.PI / 2);
    mk(10, 4, 5, 2, 0, -Math.PI / 2);
    mk(10, 4, 0, 2, 5, Math.PI);
  }

  private buildPlinths() {
    const spots = [
      { x: -2.2, z: -2 },
      { x:  2.2, z: -2 },
      { x: -2.2, z:  1 },
      { x:  2.2, z:  1 },
    ];
    PLINTH_SPECS.forEach((spec, i) => {
      const { x, z } = spots[i];
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.5, 1.1, 24),
        new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.7 }),
      );
      mesh.position.set(x, 0.55, z);
      this.scene.add(mesh);
      // Ring glow disc on floor.
      const glow = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 1.1, 32),
        new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      );
      glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.005, z);
      this.scene.add(glow);

      const canvas = document.createElement('canvas');
      canvas.width = 768; canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.anisotropy = 16;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.6),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
      );
      sign.position.set(x, 2, z);
      // Sign faces the middle of the room (origin of XZ plane).
      sign.lookAt(0, 2, 0);
      this.scene.add(sign);
      const p: Plinth = {
        ...spec,
        mesh, sign, canvas, ctx, tex,
        value: 1 + Math.random() * 5, delta: 0,
      };
      this.plinths.push(p);
      this.renderPlinthSign(p);
    });
  }

  private renderPlinthSign(p: Plinth) {
    const ctx = p.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05020a'; ctx.fillRect(0, 0, 768, 1024);
    // Border glow.
    ctx.strokeStyle = `#${p.color.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 760, 1016);
    // Content.
    ctx.textAlign = 'center';
    ctx.fillStyle = `#${p.color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 44px monospace'; ctx.textBaseline = 'top';
    ctx.fillText(`[${p.key}]`, 384, 40);
    ctx.font = 'bold 72px monospace';
    ctx.fillText(p.label, 384, 100);
    ctx.fillStyle = '#e0eeff';
    ctx.font = 'bold 48px monospace';
    ctx.fillText(p.title, 384, 200);
    ctx.font = 'bold 30px monospace'; ctx.fillStyle = '#9aa0b0';
    ctx.fillText(p.ethos, 384, 262);
    // Ticker value.
    ctx.fillStyle = p.delta >= 0 ? '#40ff80' : '#ff4060';
    ctx.font = 'bold 56px monospace';
    const prefix = p.key === '4' ? 'Ξ ' : '$ ';
    ctx.fillText(`${prefix}${p.value.toFixed(2)}`, 384, 360);
    ctx.fillStyle = p.delta >= 0 ? '#40ff80' : '#ff4060';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${p.delta >= 0 ? '+' : ''}${(p.delta * 100).toFixed(1)}%`, 384, 432);
    // Press hint.
    ctx.fillStyle = '#ffd070'; ctx.font = 'italic bold 32px monospace';
    ctx.fillText(`press ${p.key} to mint`, 384, 920);
    p.tex.needsUpdate = true;
  }

  update(dt: number, input: Input) {
    if (this.briefingActive) return;
    this.fps.update(dt, input);
    this.t += dt;
    // Values jitter each frame; re-render signs ~6 fps.
    if (Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) {
      this.plinths.forEach((p, i) => {
        const swing = (Math.sin(this.t * (0.8 + i * 0.3)) + (Math.random() - 0.5) * 1.6) * 0.04;
        p.delta = swing;
        p.value = Math.max(0.01, p.value * (1 + swing * 0.2));
        this.renderPlinthSign(p);
      });
    }
    // Pulse plinth opacity.
    this.plinths.forEach((p, i) => {
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + Math.sin(this.t * 2 + i * 1.2) * 0.15;
    });
    if (this.phase !== 'picked') this.updateInteractions(input);
  }

  private updateInteractions(input: Input) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(this.plinths.map(p => p.sign).concat(this.plinths.map(p => p.mesh)), false);
    const target = hits.length > 0 && hits[0].distance < 3.5 ? hits[0].object : null;
    const p = target ? this.plinths.find(pl => pl.sign === target || pl.mesh === target) : null;
    if (!p) this.setPrompt(null);
    else this.setPrompt(`PRESS ${p.key} TO MINT ${p.label}`);

    for (const pl of this.plinths) {
      if (input.wasPressed(`Digit${pl.key}`)) { this.onChoose(pl); break; }
    }
  }

  private onChoose(p: Plinth) {
    this.phase = 'picked';
    this.game.archetype.add(6, `mint-${p.key}`, p.weights);
    this.game.audio.playSFX('mint');
    this.setObjective(`MINTED · ${p.label}`);
    // Dim all other plinths; keep the chosen one lit.
    this.plinths.forEach((q) => {
      const mat = q.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = q === p ? 1 : 0.1;
    });
    setTimeout(() => this.win(), 1800);
  }

  private canMoveTo(pos: THREE.Vector3): boolean {
    const pad = 0.3;
    if (pos.x < this.ROOM.xMin + pad || pos.x > this.ROOM.xMax - pad) return false;
    if (pos.z < this.ROOM.zMin + pad || pos.z > this.ROOM.zMax - pad) return false;
    for (const p of this.plinths) {
      const dx = pos.x - p.mesh.position.x;
      const dz = pos.z - p.mesh.position.z;
      if (dx * dx + dz * dz < 0.6 * 0.6) return false;
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
