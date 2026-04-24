// Chamber 01 — THE LIMIT (2012–2013, Toronto dorm room).
//
// You are Vitalik-before-Vitalik: a 19-year-old in a dorm room, reading a
// Bitcointalk thread about whether scripting on Bitcoin could ever loop. A
// CRT on the desk is the only source of cold light; a desk lamp the only
// source of warm. The chamber is entirely diegetic — everything the player
// reads is drawn onto a mesh in the scene (CRT screen + whiteboard + phone),
// never as HUD, so the first-person frame never breaks.
//
// What the chamber tracks (hidden):
//   - which of 4 forum replies you pick (V/E/C/G/R/S weights)
//   - whether you look at the whiteboard ("what if scripts could loop?")
//   - whether you pick up Mastering Bitcoin
//   - whether you leave through the hallway without ever replying (W+2)
//
// Win condition: submit a reply on the CRT OR walk past the hallway whiteboard.
import * as THREE from 'three';
import { Chamber } from './chamber';
import type { Input } from '../core/input';
import { FPSController } from '../core/fps-controller';
import type { Archetype, ArchetypeVector } from '../systems/archetype';

// A Bitcointalk reply option — picked via keys 1/2/3/4 when the CRT is active.
interface Choice {
  key: string;           // '1' | '2' | '3' | '4'
  label: string;         // short preview on CRT
  body: string;          // the full line quoted after selection
  weights: Partial<ArchetypeVector>;
}

const CHOICES: Choice[] = [
  {
    key: '1',
    label: '> Scripts need a Turing-complete language.',
    body: 'Scripts need a Turing-complete language to be meaningful.',
    weights: { V: 2 },
  },
  {
    key: '2',
    label: '> Solve throughput first.',
    body: 'Solve throughput first. Everything else follows.',
    weights: { E: 1, B: 1 },
  },
  {
    key: '3',
    label: '> Close this. Open notepad. Write.',
    body: '(You close the tab and start writing.)',
    weights: { V: 1, W: 1 },
  },
  {
    key: '4',
    label: '> Check BTC price first.',
    body: 'You glance at the price. $122. Back to the thread.',
    weights: { C: 1, S: 1 },
  },
];

export class LimitChamber extends Chamber {
  chamberIndex = 0;
  title = 'THE LIMIT';

  private fps!: FPSController;
  private raycaster = new THREE.Raycaster();

  // Props the player can look at / interact with.
  private crtMesh!: THREE.Mesh;        // the box of the monitor (for raycast)
  private crtScreen!: THREE.Mesh;      // the glowing plane (for texture target)
  private crtCanvas!: HTMLCanvasElement;
  private crtCtx!: CanvasRenderingContext2D;
  private crtTexture!: THREE.CanvasTexture;
  private phoneMesh!: THREE.Mesh;
  private bookMesh!: THREE.Mesh;
  private whiteboardMesh!: THREE.Mesh;

  // Diegetic flash targets.
  private lampGlow!: THREE.Sprite;
  private windowSnow: THREE.Points | null = null;

  // State.
  private phase: 'intro' | 'active' | 'picked' | 'exiting' = 'intro';
  private briefing = true;              // blocking overlay shown until dismissed
  private timeInScene = 0;
  private phoneBuzzAt = [4, 6.5, 9];   // seconds into the scene
  private phoneBuzzPlayed: boolean[] = [false, false, false];
  private whiteboardDwell = 0;          // seconds looking at whiteboard
  private whiteboardLogged = false;
  private bookPickedUp = false;
  private phoneRead = false;
  private choiceLogged = false;

  // Room bounds for collision.
  private readonly ROOM = { xMin: -3, xMax: 3, zMin: -3, zMax: 3 };
  private readonly HALL = { xMin: -1, xMax: 1, zMin: 3, zMax: 6 };
  // Desk AABB — blocks the player from walking through the desk.
  private readonly DESK = { xMin: -1.4, xMax: 1.4, zMin: -2.8, zMax: -2.1 };
  // Bed AABB.
  private readonly BED = { xMin: -2.8, xMax: -1.2, zMin: 0.3, zMax: 2.3 };

  // HUD elements.
  private prompt: HTMLDivElement | null = null;
  private objective: HTMLDivElement | null = null;
  private crosshair: HTMLDivElement | null = null;
  private escHint: HTMLDivElement | null = null;
  private introBriefingEl: HTMLDivElement | null = null;

  protected build() {
    this.scene.background = new THREE.Color(0x0a0a10);
    this.scene.fog = new THREE.Fog(0x0a0a10, 2, 18);

    this.buildRoom();
    this.buildDesk();
    this.buildCRT();
    this.buildPhone();
    this.buildBed();
    this.buildWhiteboard();
    this.buildWindowAndSnow();

    // FPS controller — player spawns in the middle of the room, facing the CRT.
    this.fps = new FPSController({
      eyeHeight: 1.65,
      walkSpeed: 2.6,        // slower than the synthwave chambers: this is a room, not a highway
      sprintSpeed: 3.8,
      canMoveTo: (p) => this.canMoveTo(p),
      onGroundHeight: () => 0,
    });
    // Spawn close to the desk so the CRT fills a readable chunk of the view
    // on first sight — the player can still back up and walk around.
    this.fps.setPosition(0, 1.65, -0.6);
    this.fps.setYaw(0); // face -Z (toward CRT)
    this.camera = this.fps.camera;

    // Render the initial CRT screen content.
    this.renderCRT();
    this.renderWhiteboard();

    // Persistent HUD: objective tag, crosshair, ESC hint, and an opening
    // briefing card so the player knows where they are and what to do.
    this.buildObjectiveHUD();
    this.buildCrosshair();
    this.buildEscHint();
    this.buildBriefing();
    this.updateObjective('WALK TO THE CRT · PRESS E TO READ');
  }

  // ---- Scene construction ------------------------------------------------

  private buildRoom() {
    // Floor (dark wood).
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x1c1812 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Hallway floor extension.
    const hall = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), floorMat.clone());
    hall.rotation.x = -Math.PI / 2;
    hall.position.set(0, 0.001, 4.5);
    this.scene.add(hall);

    // Ceiling — low, to sell "small dorm room".
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0f }),
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 2.8;
    this.scene.add(ceil);

    // Walls — four panels of the main room with a gap on +Z for the hallway.
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x1a1620 });
    const mkWall = (w: number, h: number, x: number, y: number, z: number, ry = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      this.scene.add(m);
    };
    mkWall(6, 2.8, 0, 1.4, -3, 0);             // north wall (behind desk)
    mkWall(6, 2.8, -3, 1.4, 0, Math.PI / 2);   // west wall
    mkWall(6, 2.8, 3, 1.4, 0, -Math.PI / 2);   // east wall
    // South wall has a 2m gap in the middle for the hallway.
    mkWall(2, 2.8, -2, 1.4, 3, Math.PI);
    mkWall(2, 2.8, 2, 1.4, 3, Math.PI);

    // Hallway walls.
    mkWall(3, 2.4, -1, 1.2, 4.5, Math.PI / 2);
    mkWall(3, 2.4, 1, 1.2, 4.5, -Math.PI / 2);
    // Hallway end wall (whiteboard mounts on this).
    mkWall(2, 2.4, 0, 1.2, 6, Math.PI);

    // A small warm halo right under the lamp head — not a scene-filling flare.
    // Additive blending + tight falloff so it reads as a bulb, not a sun.
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const gctx = glowCanvas.getContext('2d')!;
    const grad = gctx.createRadialGradient(64, 64, 2, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255,190,110,0.55)');
    grad.addColorStop(0.35, 'rgba(255,150,70,0.18)');
    grad.addColorStop(1, 'rgba(255,120,40,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      opacity: 0.75,
    }));
    this.lampGlow.position.set(-0.8, 1.35, -2.35);
    this.lampGlow.scale.set(0.55, 0.55, 1);
    this.scene.add(this.lampGlow);
  }

  private buildDesk() {
    const deskMat = new THREE.MeshBasicMaterial({ color: 0x2a1f14 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.9), deskMat);
    desk.position.set(0, 0.8, -2.4);
    this.scene.add(desk);

    // Desk legs — four thin boxes.
    const legMat = new THREE.MeshBasicMaterial({ color: 0x1a1208 });
    const mkLeg = (x: number, z: number) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.07), legMat);
      leg.position.set(x, 0.4, z);
      this.scene.add(leg);
    };
    mkLeg(-1.4, -2.75); mkLeg(1.4, -2.75); mkLeg(-1.4, -2.05); mkLeg(1.4, -2.05);

    // Desk lamp — a thin pole + an angled cone head.
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x3a2a1a });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), poleMat);
    pole.position.set(-0.8, 1.2, -2.5);
    this.scene.add(pole);
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.22, 8),
      new THREE.MeshBasicMaterial({ color: 0x4a3018 }),
    );
    head.position.set(-0.8, 1.55, -2.35);
    head.rotation.x = Math.PI * 0.55;
    this.scene.add(head);

    // Coke / Mate can.
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.14, 16),
      new THREE.MeshBasicMaterial({ color: 0x8a2020 }),
    );
    can.position.set(0.8, 0.91, -2.2);
    this.scene.add(can);

    // Keyboard — a thin wide slab in front of the CRT.
    const keyboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.03, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x0d0d12 }),
    );
    keyboard.position.set(0, 0.855, -2.0);
    this.scene.add(keyboard);

    // Scattered notes — three thin white quads.
    for (let i = 0; i < 3; i++) {
      const note = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.24),
        new THREE.MeshBasicMaterial({ color: 0xd8cfae }),
      );
      note.rotation.x = -Math.PI / 2;
      note.position.set(0.3 + i * 0.12 + Math.random() * 0.1, 0.851, -2.35 + Math.random() * 0.25);
      note.rotation.z = Math.random() * 0.6 - 0.3;
      this.scene.add(note);
    }
  }

  private buildCRT() {
    // The CRT body — a dark cube on the desk, sized to frame the screen.
    const crtBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.95, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x101015 }),
    );
    crtBody.position.set(0, 1.3, -2.5);
    this.scene.add(crtBody);
    this.crtMesh = crtBody;

    // The glowing screen — a plane inset slightly on the front of the CRT.
    // Canvas is deliberately oversized (1280×960) so the text stays crisp when
    // the player leans close. Anisotropy lifts the off-angle sharpness too.
    this.crtCanvas = document.createElement('canvas');
    this.crtCanvas.width = 1280;
    this.crtCanvas.height = 960;
    this.crtCtx = this.crtCanvas.getContext('2d')!;
    this.crtTexture = new THREE.CanvasTexture(this.crtCanvas);
    // NearestFilter for magnification keeps text crisp — LinearFilter was
    // adding a halo around every letter that the user read as blur.
    this.crtTexture.minFilter = THREE.LinearFilter;
    this.crtTexture.magFilter = THREE.NearestFilter;
    this.crtTexture.anisotropy = 8;
    this.crtTexture.generateMipmaps = false;
    this.crtScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.86),
      new THREE.MeshBasicMaterial({ map: this.crtTexture, toneMapped: false }),
    );
    this.crtScreen.position.set(0, 1.3, -2.196);
    this.scene.add(this.crtScreen);
  }

  private buildPhone() {
    const phone = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.018, 0.20),
      new THREE.MeshBasicMaterial({ color: 0x050510 }),
    );
    phone.position.set(1.1, 0.849, -2.0);
    this.scene.add(phone);
    // Screen pulse — a glowing top plane with a legible message from Mom.
    // Canvas is oversized and Nearest-filtered so the text stays crisp
    // when the player leans over the desk to look at it.
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 512;
    screenCanvas.height = 256;
    const sctx = screenCanvas.getContext('2d')!;
    this.drawPhoneScreen(sctx, false);
    const tex = new THREE.CanvasTexture(screenCanvas);
    // Phone is viewed at a steep angle (flat-ish on desk). Anisotropic linear
    // filter + a slight tilt toward the player keeps text readable from above.
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.generateMipmaps = false;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.28),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    );
    // Tilt the phone so the screen faces the player's eyes, not straight up.
    screen.rotation.x = -Math.PI / 2 + 0.5;
    screen.position.set(1.05, 0.92, -1.95);
    this.scene.add(screen);
    (phone as any).__screen = { canvas: screenCanvas, ctx: sctx, texture: tex };
    this.phoneMesh = phone;
  }

  private drawPhoneScreen(ctx: CanvasRenderingContext2D, read: boolean) {
    const W = 512, H = 256;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = read ? '#0a1020' : '#0a1a3a';
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'top';
    // Header bar.
    ctx.fillStyle = read ? '#4a6080' : '#80c8ff';
    ctx.font = 'bold 40px monospace';
    ctx.fillText(read ? 'MOM' : 'MOM', 24, 22);
    ctx.fillStyle = read ? '#4a6080' : '#ffd070';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(read ? '(read)' : '● NEW', W - 170, 30);
    // Divider.
    ctx.fillStyle = '#223040';
    ctx.fillRect(24, 78, W - 48, 2);
    // Message body.
    ctx.fillStyle = '#e0eeff';
    ctx.font = 'bold 32px monospace';
    if (!read) {
      ctx.fillText('when r u', 24, 98);
      ctx.fillText('home for xmas?', 24, 136);
      ctx.fillStyle = '#9adfff';
      ctx.font = 'italic bold 24px monospace';
      ctx.fillText('— press E to read —', 24, 200);
    } else {
      ctx.fillText('ok. love u.', 24, 98);
      ctx.fillStyle = '#5a7090';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('sent · just now', 24, 150);
    }
  }

  private buildBed() {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.2, 2),
      new THREE.MeshBasicMaterial({ color: 0x20181a }),
    );
    frame.position.set(-2, 0.2, 1.3);
    this.scene.add(frame);

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.15, 1.9),
      new THREE.MeshBasicMaterial({ color: 0x3a2a2a }),
    );
    mattress.position.set(-2, 0.37, 1.3);
    this.scene.add(mattress);

    // Mastering Bitcoin book.
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.04, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xa64820 }),
    );
    book.position.set(-1.5, 0.47, 1.3);
    this.scene.add(book);
    this.bookMesh = book;

    // A band poster on the west wall above the bed.
    const posterCanvas = document.createElement('canvas');
    posterCanvas.width = 256; posterCanvas.height = 384;
    const pctx = posterCanvas.getContext('2d')!;
    pctx.fillStyle = '#0a0a0a'; pctx.fillRect(0, 0, 256, 384);
    pctx.fillStyle = '#d84060'; pctx.font = 'bold 32px monospace';
    pctx.fillText('DOGE', 40, 80);
    pctx.fillStyle = '#f8b840'; pctx.font = 'bold 36px monospace';
    pctx.fillText('2013', 60, 140);
    pctx.fillStyle = '#806040'; pctx.font = '14px monospace';
    pctx.fillText('much wow', 80, 190);
    const posterTex = new THREE.CanvasTexture(posterCanvas);
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.9),
      new THREE.MeshBasicMaterial({ map: posterTex }),
    );
    poster.position.set(-2.99, 1.8, 1);
    poster.rotation.y = Math.PI / 2;
    this.scene.add(poster);
  }

  private buildWhiteboard() {
    this.whiteboardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ color: 0xf0f0e8 }),
    );
    this.whiteboardMesh.position.set(0, 1.5, 5.98);
    this.scene.add(this.whiteboardMesh);

    // A text texture drawn into the plane above.
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 768;
    wCanvas.height = 512;
    const wctx = wCanvas.getContext('2d')!;
    wctx.fillStyle = '#f3f0e5';
    wctx.fillRect(0, 0, 768, 512);
    wctx.strokeStyle = '#1a3078';
    wctx.lineWidth = 5;
    wctx.font = 'italic 72px "Courier New", monospace';
    wctx.fillStyle = '#1a3078';
    wctx.fillText('What if', 80, 170);
    wctx.fillText('scripts', 80, 260);
    wctx.fillText('could', 80, 350);
    wctx.fillText('loop?', 80, 440);
    // Small arrow doodles.
    wctx.beginPath();
    wctx.moveTo(500, 120); wctx.lineTo(620, 230); wctx.lineTo(600, 230);
    wctx.moveTo(620, 230); wctx.lineTo(620, 210);
    wctx.stroke();
    const wTex = new THREE.CanvasTexture(wCanvas);
    const wDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.95),
      new THREE.MeshBasicMaterial({ map: wTex }),
    );
    wDisplay.position.set(0, 1.5, 5.975);
    this.scene.add(wDisplay);
  }

  private buildWindowAndSnow() {
    // A dark rectangle on the north wall, hint of night outside.
    const window = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1),
      new THREE.MeshBasicMaterial({ color: 0x040820 }),
    );
    window.position.set(1.8, 1.8, -2.99);
    this.scene.add(window);

    // Window frame.
    const fm = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const mkBar = (x: number, y: number, w: number, h: number) => {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fm);
      b.position.set(x, y, -2.985);
      this.scene.add(b);
    };
    mkBar(1.8, 1.8, 0.04, 1);
    mkBar(1.8, 1.8, 1.2, 0.04);

    // Snow particles behind the window — THREE.Points drifting downward.
    const SNOW = 180;
    const pos = new Float32Array(SNOW * 3);
    for (let i = 0; i < SNOW; i++) {
      pos[i * 3]     = 1.8 + (Math.random() - 0.5) * 1.2;
      pos[i * 3 + 1] = Math.random() * 1.2 + 1.2;
      pos[i * 3 + 2] = -3.3 - Math.random() * 1.5;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.windowSnow = new THREE.Points(snowGeo, new THREE.PointsMaterial({
      color: 0xc8d8f0, size: 0.03, transparent: true, opacity: 0.8,
    }));
    this.scene.add(this.windowSnow);
  }

  // ---- Per-frame update --------------------------------------------------

  update(dt: number, input: Input) {
    // Briefing card owns input until dismissed — no movement, no interactions,
    // no timer advance. The snow keeps drifting because it looks alive.
    if (this.briefing) {
      this.updateSnow(dt);
      return;
    }

    this.fps.update(dt, input);
    this.timeInScene += dt;

    this.updateSnow(dt);
    this.updatePhoneBuzz();
    this.updateCRTPulse();
    this.updateWhiteboardGaze(dt);
    this.updateInteractions(input);
    this.updateHallwayExit();
  }

  private updateSnow(dt: number) {
    if (!this.windowSnow) return;
    const arr = this.windowSnow.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < arr.count; i++) {
      let y = arr.getY(i) - dt * 0.15;
      if (y < 0.3) y = 2.4;
      arr.setY(i, y);
    }
    arr.needsUpdate = true;
  }

  private updatePhoneBuzz() {
    for (let i = 0; i < this.phoneBuzzAt.length; i++) {
      if (!this.phoneBuzzPlayed[i] && this.timeInScene >= this.phoneBuzzAt[i]) {
        this.phoneBuzzPlayed[i] = true;
        this.game.audio.playSFX('hit');
        // A bigger visual twitch and a quick objective nudge the first time,
        // so the player can tell the phone is a real thing to interact with.
        this.phoneMesh.position.y += 0.01;
        this.phoneMesh.rotation.z += 0.08;
        setTimeout(() => {
          this.phoneMesh.position.y -= 0.01;
          this.phoneMesh.rotation.z -= 0.08;
        }, 120);
        if (i === 0 && !this.phoneRead && this.phase !== 'picked' && this.phase !== 'exiting') {
          this.updateObjective('YOUR PHONE BUZZED · MOM TEXTED · (E TO CHECK)');
          // Restore the main objective after a beat — the phone is a side thread.
          setTimeout(() => {
            if (this.phase === 'intro') this.updateObjective('WALK TO THE CRT · PRESS E TO READ');
            else if (this.phase === 'active') this.updateObjective('REPLY TO THE THREAD · PRESS 1 / 2 / 3 / 4');
          }, 4000);
        }
      }
    }
  }

  private updateCRTPulse() {
    // Before the player picks a choice, the CRT title flickers gently. After
    // a selection, it goes steady.
    if (this.phase === 'picked' || this.phase === 'exiting') return;
    const t = this.timeInScene;
    const flicker = 0.85 + Math.sin(t * 7.3) * 0.03 + (Math.random() < 0.02 ? -0.2 : 0);
    (this.crtScreen.material as THREE.MeshBasicMaterial).opacity = flicker;
    (this.crtScreen.material as THREE.MeshBasicMaterial).transparent = true;
  }

  private updateWhiteboardGaze(dt: number) {
    // Raycast the camera's forward and see if it lands on the whiteboard for
    // a cumulative 3 seconds. That's the V+1 "visionary" tell.
    if (this.whiteboardLogged) return;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObject(this.whiteboardMesh, false);
    if (hits.length > 0 && hits[0].distance < 14) {
      this.whiteboardDwell += dt;
      if (this.whiteboardDwell >= 3) {
        this.whiteboardLogged = true;
        this.game.archetype.add(0, 'whiteboard-gaze', { V: 1 });
      }
    }
  }

  private updateInteractions(input: Input) {
    // Raycast from camera to find what the player is pointing at. The
    // closest hit within 2.4 m decides which prompt (if any) to show, and
    // which E-action to fire.
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const candidates = [this.crtMesh, this.phoneMesh, this.bookMesh];
    const hits = this.raycaster.intersectObjects(candidates, false);
    const target = hits.length > 0 && hits[0].distance < 2.4 ? hits[0].object : null;

    if (!target) {
      this.setPrompt(null);
    } else if (target === this.crtMesh) {
      if (this.phase === 'intro' || this.phase === 'active') {
        this.setPrompt(this.phase === 'active' ? 'PRESS 1 / 2 / 3 / 4 TO REPLY' : 'PRESS E TO READ');
      } else {
        this.setPrompt(null);
      }
    } else if (target === this.phoneMesh) {
      this.setPrompt(this.phoneRead ? null : 'PRESS E TO CHECK PHONE');
    } else if (target === this.bookMesh) {
      this.setPrompt(this.bookPickedUp ? null : 'PRESS E TO PICK UP BOOK');
    }

    if (target && input.wasPressed('KeyE')) {
      this.onInteract(target);
    }

    // While the CRT is active, 1/2/3/4 select a reply — even if the player
    // isn't staring directly at it. This keeps the choice flow simple.
    if (this.phase === 'active') {
      for (const c of CHOICES) {
        if (input.wasPressed(`Digit${c.key}`)) {
          this.onChoose(c);
          break;
        }
      }
    }
  }

  private onInteract(target: THREE.Object3D) {
    if (target === this.crtMesh && this.phase === 'intro') {
      this.phase = 'active';
      this.renderCRT();
      this.game.audio.playSFX('interact');
      this.updateObjective('REPLY TO THE THREAD · PRESS 1 / 2 / 3 / 4');
    } else if (target === this.phoneMesh && !this.phoneRead) {
      this.phoneRead = true;
      this.game.audio.playSFX('interact');
      this.game.archetype.add(0, 'phone-read', { W: 1 });
      // Repaint phone screen with "(read)".
      const s = (this.phoneMesh as any).__screen;
      if (s) {
        this.drawPhoneScreen(s.ctx, true);
        s.texture.needsUpdate = true;
      }
    } else if (target === this.bookMesh && !this.bookPickedUp) {
      this.bookPickedUp = true;
      this.game.audio.playSFX('interact');
      this.game.archetype.add(0, 'book-picked', { E: 1 });
      // Lift the book briefly then remove — "you put it in your bag".
      this.bookMesh.position.y += 0.15;
      setTimeout(() => this.scene.remove(this.bookMesh), 400);
    }
  }

  private onChoose(c: Choice) {
    if (this.choiceLogged) return;
    this.choiceLogged = true;
    this.phase = 'picked';
    this.game.archetype.add(0, `choice-${c.key}`, c.weights);
    this.game.audio.playSFX('win');
    this.renderCRT(c);
    this.updateObjective('REPLY SENT · CHAPTER COMPLETE');
    // Brief beat, then wrap the chamber.
    setTimeout(() => this.win(), 1800);
  }

  private updateHallwayExit() {
    // Silent-exit path: if the player walks into the hallway past the door
    // (z > 4) without ever engaging the CRT, they get the witness bonus.
    if (this.phase !== 'intro' && this.phase !== 'active') return;
    if (this.fps.position.z > 4 && !this.choiceLogged) {
      this.phase = 'exiting';
      this.game.archetype.add(0, 'silent-exit', { W: 2 });
      this.game.audio.playSFX('portal');
      this.renderCRT(null, 'YOU LEFT WITHOUT REPLYING.');
      this.updateObjective('YOU WALKED AWAY · CHAPTER COMPLETE');
      setTimeout(() => this.win(), 1200);
    }
  }

  // ---- CRT screen rendering ---------------------------------------------

  private renderCRT(picked: Choice | null = null, overrideMsg: string | null = null) {
    const ctx = this.crtCtx;
    const W = this.crtCanvas.width, H = this.crtCanvas.height;
    // Drawing happens in a virtual 512×384 coord space; the canvas is 2.5× that
    // physically so the resulting texture stays crisp when sampled in 3D.
    const SX = W / 512, SY = H / 384;
    ctx.setTransform(SX, 0, 0, SY, 0, 0);
    const VW = 512, VH = 384;

    // CRT background. No scanlines — at texture-sampling distance they just
    // read as visual noise and made the text look fuzzy. Clean flat field
    // is more readable and still feels like a monitor in the dark.
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, VW, VH);

    ctx.fillStyle = '#7ac8ff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('bitcointalk.org', 16, 32);
    ctx.fillStyle = '#3a6080';
    ctx.font = '16px monospace';
    ctx.fillText('— the scripting limit thread —', 16, 54);

    if (overrideMsg) {
      ctx.fillStyle = '#ff9050';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(overrideMsg, 20, VH / 2);
      this.crtTexture.needsUpdate = true;
      return;
    }

    if (this.phase === 'intro') {
      ctx.fillStyle = '#e8ecff';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('Bitcoin is limited to', 20, 102);
      ctx.fillText('payments — or is it?', 20, 134);
      ctx.fillStyle = '#9adfff';
      ctx.font = 'bold 17px monospace';
      const body = [
        '@satoshi_fan   2013-11-14',
        '  Script is purpose-built, not crippled.',
        '  Turing-completeness is a liability.',
        '',
        '@hal_finney_reader   2013-11-14',
        '  Scripts that loop are another chain.',
        '  Write the paper, kid.',
      ];
      body.forEach((ln, i) => ctx.fillText(ln, 20, 176 + i * 24));
      ctx.fillStyle = '#ffb070';
      ctx.font = 'italic bold 16px monospace';
      ctx.fillText('[ press E to open the reply box ]', 20, VH - 20);
    } else if (this.phase === 'active' && !picked) {
      ctx.fillStyle = '#e8ecff';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('Reply to thread:', 20, 100);
      ctx.fillStyle = '#9adfff';
      ctx.font = 'bold 17px monospace';
      CHOICES.forEach((c, i) => {
        ctx.fillText(`[${c.key}] ${c.label}`, 20, 146 + i * 44);
      });
      ctx.fillStyle = '#ffb070';
      ctx.font = 'italic bold 16px monospace';
      ctx.fillText('press 1 / 2 / 3 / 4', 20, VH - 20);
    } else if (picked) {
      ctx.fillStyle = '#ffd070';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('> sent.', 20, 112);
      ctx.fillStyle = '#e0eeff';
      ctx.font = 'bold 18px monospace';
      wrap(ctx, picked.body, 20, 152, VW - 40, 26);
      ctx.fillStyle = '#5a80a0';
      ctx.font = '15px monospace';
      ctx.fillText('(nov 2013. you have an idea.)', 20, VH - 20);
    }

    this.crtTexture.needsUpdate = true;
  }

  private renderWhiteboard() {
    // Already drawn at build time; no updates required.
  }

  // ---- Collision --------------------------------------------------------

  private canMoveTo(p: THREE.Vector3): boolean {
    const inRoom = this.inAABB(p, this.ROOM);
    const inHall = this.inAABB(p, this.HALL);
    if (!inRoom && !inHall) return false;
    // Block desk + bed volumes.
    if (this.inAABB(p, this.DESK)) return false;
    if (this.inAABB(p, this.BED)) return false;
    return true;
  }

  private inAABB(p: THREE.Vector3, b: { xMin: number; xMax: number; zMin: number; zMax: number }) {
    const pad = 0.25;
    return p.x > b.xMin + pad && p.x < b.xMax - pad && p.z > b.zMin + pad && p.z < b.zMax - pad;
  }

  // ---- HUD helpers ------------------------------------------------------

  private setPrompt(text: string | null) {
    if (!text) {
      if (this.prompt) { this.prompt.style.opacity = '0'; }
      return;
    }
    if (!this.prompt) {
      this.prompt = this.game.hud.prompt(text);
    } else {
      this.prompt.textContent = text;
    }
    this.prompt.style.opacity = '1';
  }

  private buildObjectiveHUD() {
    this.objective = this.game.hud.element('', {
      position: 'absolute',
      right: '24px',
      top: '24px',
      padding: '8px 14px',
      border: '1px solid #00f0ff55',
      background: '#0a0e1acc',
      color: '#00f0ff',
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      textShadow: '0 0 6px #00f0ff88',
      pointerEvents: 'none',
      maxWidth: '360px',
    });
  }

  private updateObjective(text: string) {
    if (this.objective) {
      this.objective.innerHTML = `<span style="opacity:0.55;">OBJECTIVE ·</span> ${text}`;
    }
  }

  private buildCrosshair() {
    this.crosshair = this.game.hud.element('+', {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#00f0ff',
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      opacity: '0.55',
      pointerEvents: 'none',
    });
  }

  private buildEscHint() {
    this.escHint = this.game.hud.element('✕ QUIT · ESC / Q', {
      position: 'absolute',
      right: '24px',
      bottom: '24px',
      color: '#00f0ff',
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      letterSpacing: '0.22em',
      opacity: '0.85',
      padding: '8px 14px',
      border: '1px solid #00f0ff88',
      background: '#0a0e1acc',
      pointerEvents: 'auto',
      cursor: 'pointer',
      zIndex: '40',
    });
    this.escHint.addEventListener('click', () => this.game.enterSelect());
  }

  private buildBriefing() {
    const html = `
      <div style="max-width:620px;padding:32px 40px;border:1px solid #00f0ff66;background:#05070ee0;box-shadow:0 0 32px #00f0ff22;">
        <div style="font-size:11px;letter-spacing:0.35em;color:#7ac8ff;opacity:0.7;">CHAPTER 01 · 2013</div>
        <div style="font-size:28px;letter-spacing:0.22em;color:#00f0ff;margin-top:4px;text-shadow:0 0 10px #00f0ff88;">THE LIMIT</div>
        <div style="font-size:14px;letter-spacing:0.18em;color:#9adfff;margin-top:2px;opacity:0.75;">極限 · TORONTO · NOVEMBER</div>
        <div style="height:1px;background:#00f0ff33;margin:20px 0;"></div>
        <div style="font-size:14px;line-height:1.85;color:#d0e8ff;letter-spacing:0.04em;">
          You are nineteen. It's 3 AM. A Bitcointalk thread argues whether
          scripting on Bitcoin could ever loop. Your desk is the only light
          in the room.
        </div>
        <div style="height:12px;"></div>
        <div style="font-size:13px;line-height:1.9;color:#9adfff;letter-spacing:0.04em;">
          <b style="color:#ffd070;">WHAT TO DO —</b> walk to the CRT on the desk,
          press <b>E</b> to read the thread, then press <b>1 / 2 / 3 / 4</b>
          to post a reply. Or just walk out through the hallway door.
        </div>
        <div style="height:16px;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:12px;color:#7ac8ff;letter-spacing:0.15em;">
          <span><b>WASD</b> · MOVE</span>
          <span><b>MOUSE</b> · LOOK</span>
          <span><b>E</b> · INTERACT</span>
          <span><b>SHIFT</b> · RUN</span>
          <span><b>1-4</b> · REPLY</span>
          <span><b>ESC / Q</b> · QUIT TO MENU</span>
        </div>
        <div style="margin-top:26px;text-align:center;font-size:13px;letter-spacing:0.35em;color:#ffd070;animation:limitPulse 1.4s ease-in-out infinite;">
          [ CLICK OR PRESS ANY KEY TO BEGIN ]
        </div>
        <style>@keyframes limitPulse { 0%,100%{opacity:1;} 50%{opacity:0.45;} }</style>
      </div>
    `;
    this.introBriefingEl = this.game.hud.element(html, {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000000b8',
      backdropFilter: 'blur(2px)',
      pointerEvents: 'auto',
      cursor: 'pointer',
      zIndex: '50',
    });
    const dismiss = () => this.dismissLimitBriefing();
    this.introBriefingEl.addEventListener('click', dismiss);
    // Any key also dismisses. Listen once on window; clean up on dispose.
    const keyHandler = () => { if (this.briefing) dismiss(); };
    window.addEventListener('keydown', keyHandler);
    this.disposables.push(() => window.removeEventListener('keydown', keyHandler));
  }

  private dismissLimitBriefing() {
    if (!this.briefing) return;
    this.briefing = false;
    this.briefingActive = false;
    if (this.introBriefingEl) {
      this.introBriefingEl.style.transition = 'opacity 0.35s';
      this.introBriefingEl.style.opacity = '0';
      this.introBriefingEl.style.pointerEvents = 'none';
      setTimeout(() => this.introBriefingEl?.remove(), 400);
    }
    // Request pointer lock now that the player is ready.
    this.game.input.requestPointer();
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lh;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}
