// SynthKit — all the actual Tone.js synthesis. BGM loops and SFX are
// composed in code, no audio files. Each chamber gets a different mood via
// a different chord progression + bass pattern + drum hit subset.
//
// These are short patterns (8-16 bars) that loop — the goal is "consistent
// vibe per chamber", not "radio single". 48h jam audio budget is narrow.
import * as Tone from 'tone';

type BGMChannel = { seq: Tone.Sequence; synth: Tone.PolySynth; bass?: Tone.MonoSynth; drum?: Tone.MembraneSynth };

export class SynthKit {
  private master: Tone.Gain;
  private reverb: Tone.Reverb;
  private currentBGM: BGMChannel[] = [];

  private constructor() {
    this.reverb = new Tone.Reverb({ decay: 4, wet: 0.35 });
    this.master = new Tone.Gain(0.7);
    this.reverb.connect(this.master);
    this.master.toDestination();
  }

  static async create(): Promise<SynthKit> {
    await Tone.start();
    const kit = new SynthKit();
    await kit.reverb.generate();
    Tone.Transport.bpm.value = 92;
    Tone.Transport.start();
    return kit;
  }

  setMasterVolume(v: number) {
    this.master.gain.rampTo(v, 0.1);
  }

  // --- BGM ---------------------------------------------------------------

  /**
   * One composition per chamber. All share the same key (A minor) so moving
   * between chambers doesn't sound jarring during transitions.
   *
   * Eight builders for the v2 chapter set. Builder names still carry their
   * v1 mood labels (Genesis / DAO / Merge / GasStorm / Rollup / Vitalik)
   * because the underlying chord progressions and patterns map naturally:
   *   ch0 LIMIT       → Genesis  (sparse pad, late-night dorm vibe)
   *   ch1 WHITEPAPER  → Vitalik  (contemplative, cerebral lead)
   *   ch2 SPACESHIP   → DAO      (warmer, found-object texture)
   *   ch3 CROWDSALE   → GasStorm (driving pulse, momentum)
   *   ch4 THE DAO     → DAO      (re-uses the unease, key shift)
   *   ch5 FORK        → Rollup   (decisive arpeggio)
   *   ch6 BLOOM       → Merge    (full pad, neon)
   *   ch7 MERGE       → Vitalik  (resolves the arc)
   * Anything out of range falls back to the Genesis pad — better than a
   * silent crash if a chamber index ever drifts.
   */
  playBGM(index: number) {
    this.stopBGM();
    const builders: Array<() => BGMChannel[]> = [
      () => this.buildGenesisBGM(),   // ch0 LIMIT
      () => this.buildVitalikBGM(),   // ch1 WHITEPAPER
      () => this.buildDAOBGM(),       // ch2 SPACESHIP
      () => this.buildGasStormBGM(),  // ch3 CROWDSALE
      () => this.buildDAOBGM(),       // ch4 THE DAO
      () => this.buildRollupBGM(),    // ch5 FORK
      () => this.buildMergeBGM(),     // ch6 BLOOM
      () => this.buildVitalikBGM(),   // ch7 MERGE
    ];
    const builder = builders[index] ?? builders[0];
    this.currentBGM = builder();
    for (const c of this.currentBGM) c.seq.start(0);
  }

  playFinale() {
    this.stopBGM();
    this.currentBGM = this.buildFinaleBGM();
    for (const c of this.currentBGM) c.seq.start(0);
  }

  stopBGM() {
    for (const c of this.currentBGM) {
      c.seq.stop();
      c.seq.dispose();
      c.synth.dispose();
      c.bass?.dispose();
      c.drum?.dispose();
    }
    this.currentBGM = [];
  }

  private makePad(): Tone.PolySynth {
    const p = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 1.2, decay: 0.3, sustain: 0.6, release: 2.5 },
      volume: -16,
    });
    p.connect(this.reverb);
    return p;
  }

  private makeLead(): Tone.PolySynth {
    const p = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8 },
      volume: -18,
    });
    p.connect(this.reverb);
    return p;
  }

  private makeBass(): Tone.MonoSynth {
    const b = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.2, baseFrequency: 200, octaves: 2.5 },
      volume: -14,
    }).toDestination();
    return b;
  }

  private makeKick(): Tone.MembraneSynth {
    return new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 6, volume: -12 }).toDestination();
  }

  // Genesis — slow, mysterious, sparse. Just a pad and a single bass pulse.
  private buildGenesisBGM(): BGMChannel[] {
    const pad = this.makePad();
    const bass = this.makeBass();
    const padSeq = new Tone.Sequence((t, chord) => {
      if (chord) pad.triggerAttackRelease(chord, '2n', t);
    }, [['A3', 'C4', 'E4'], null, ['F3', 'A3', 'C4'], null], '2n');
    const bassSeq = new Tone.Sequence((t, n) => { if (n) bass.triggerAttackRelease(n, '4n', t); }, ['A1', null, 'F1', null], '2n');
    return [{ seq: padSeq, synth: pad, bass }, { seq: bassSeq, synth: pad, bass }];
  }

  // DAO — dissonant, looping, uneasy. Minor 7th stabs over a sub-bass drone.
  private buildDAOBGM(): BGMChannel[] {
    const lead = this.makeLead();
    const bass = this.makeBass();
    const leadSeq = new Tone.Sequence((t, n) => { if (n) lead.triggerAttackRelease(n, '16n', t); },
      ['A4', 'C5', 'E5', 'B4', 'A4', 'E5', 'G4', 'B4'], '8n');
    const bassSeq = new Tone.Sequence((t, n) => { if (n) bass.triggerAttackRelease(n, '2n', t); }, ['A1', 'A1'], '1n');
    return [{ seq: leadSeq, synth: lead }, { seq: bassSeq, synth: lead, bass }];
  }

  // Merge — hopeful arpeggio, warmer. Kick joins to mark the transition.
  private buildMergeBGM(): BGMChannel[] {
    const lead = this.makeLead();
    const bass = this.makeBass();
    const kick = this.makeKick();
    const arp = ['A3', 'C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4'];
    const leadSeq = new Tone.Sequence((t, n) => { if (n) lead.triggerAttackRelease(n, '8n', t); }, arp, '8n');
    const bassSeq = new Tone.Sequence((t, n) => { if (n) bass.triggerAttackRelease(n, '4n', t); }, ['A1', null, 'F1', null], '4n');
    const kickSeq = new Tone.Sequence((t) => kick.triggerAttackRelease('C1', '8n', t), [1, null, null, null], '4n');
    return [{ seq: leadSeq, synth: lead }, { seq: bassSeq, synth: lead, bass }, { seq: kickSeq, synth: lead, drum: kick }];
  }

  // Gas Storm — driving, urgent, four-on-the-floor.
  private buildGasStormBGM(): BGMChannel[] {
    const lead = this.makeLead();
    const bass = this.makeBass();
    const kick = this.makeKick();
    const leadSeq = new Tone.Sequence((t, n) => { if (n) lead.triggerAttackRelease(n, '16n', t); },
      ['A4', 'A4', 'E5', 'A4', 'G4', 'G4', 'B4', 'G4'], '8n');
    const bassSeq = new Tone.Sequence((t, n) => { if (n) bass.triggerAttackRelease(n, '16n', t); },
      ['A1', 'A1', 'A1', 'E1', 'F1', 'F1', 'F1', 'E1'], '8n');
    const kickSeq = new Tone.Sequence((t) => kick.triggerAttackRelease('C1', '8n', t), [1, 1, 1, 1], '4n');
    return [{ seq: leadSeq, synth: lead }, { seq: bassSeq, synth: lead, bass }, { seq: kickSeq, synth: lead, drum: kick }];
  }

  // Rollup — bright, rising. Higher register lead.
  private buildRollupBGM(): BGMChannel[] {
    const lead = this.makeLead();
    const bass = this.makeBass();
    const leadSeq = new Tone.Sequence((t, n) => { if (n) lead.triggerAttackRelease(n, '16n', t); },
      ['A5', 'C6', 'E6', 'A6', 'G5', 'B5', 'D6', 'G6'], '8n');
    const bassSeq = new Tone.Sequence((t, n) => { if (n) bass.triggerAttackRelease(n, '4n', t); }, ['A2', 'G2', 'F2', 'E2'], '2n');
    return [{ seq: leadSeq, synth: lead }, { seq: bassSeq, synth: lead, bass }];
  }

  // Vitalik's Core — massive, ceremonial. Pad + lead over a slow bass.
  private buildVitalikBGM(): BGMChannel[] {
    const pad = this.makePad();
    const lead = this.makeLead();
    const bass = this.makeBass();
    const padSeq = new Tone.Sequence((t, c) => { if (c) pad.triggerAttackRelease(c, '1n', t); },
      [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['E3', 'G3', 'B3']], '1n');
    const leadSeq = new Tone.Sequence((t, n) => { if (n) lead.triggerAttackRelease(n, '8n', t); },
      ['E5', 'A5', 'C6', 'B5', null, 'A5', 'G5', 'E5'], '8n');
    const bassSeq = new Tone.Sequence((t, n) => { if (n) bass.triggerAttackRelease(n, '2n', t); }, ['A1', 'F1', 'G1', 'E1'], '1n');
    return [{ seq: padSeq, synth: pad }, { seq: leadSeq, synth: lead }, { seq: bassSeq, synth: lead, bass }];
  }

  private buildFinaleBGM(): BGMChannel[] {
    return this.buildVitalikBGM();
  }

  // --- SFX ---------------------------------------------------------------

  playSFX(kind: 'interact' | 'win' | 'hit' | 'jump' | 'merge' | 'mint' | 'damage' | 'portal') {
    const now = Tone.now();
    switch (kind) {
      case 'interact': this.blip(880, 0.08, now); break;
      case 'win':      this.arp([880, 1175, 1760], 0.12, now); break;
      case 'hit':      this.blip(440, 0.05, now, 'square'); break;
      case 'jump':     this.sweep(220, 660, 0.15, now); break;
      case 'merge':    this.arp([440, 660, 880], 0.1, now); break;
      case 'mint':     this.arp([523, 659, 784, 1047, 1319], 0.15, now); break;
      case 'damage':   this.blip(180, 0.12, now, 'sawtooth'); break;
      case 'portal':   this.sweep(110, 880, 0.4, now); break;
    }
  }

  private blip(freq: number, dur: number, time: number, type: OscillatorType = 'sine') {
    const s = new Tone.Synth({ oscillator: { type }, envelope: { attack: 0.001, decay: dur, sustain: 0, release: 0.05 }, volume: -14 });
    s.connect(this.reverb);
    s.triggerAttackRelease(freq, dur, time);
    setTimeout(() => s.dispose(), (dur + 0.2) * 1000);
  }

  private arp(freqs: number[], step: number, time: number) {
    for (let i = 0; i < freqs.length; i++) this.blip(freqs[i], step, time + i * step);
  }

  private sweep(from: number, to: number, dur: number, time: number) {
    const s = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: dur, sustain: 0, release: 0.1 }, volume: -16 });
    s.connect(this.reverb);
    s.frequency.setValueAtTime(from, time);
    s.frequency.exponentialRampToValueAtTime(to, time + dur);
    s.triggerAttackRelease(from, dur, time);
    setTimeout(() => s.dispose(), (dur + 0.3) * 1000);
  }
}
