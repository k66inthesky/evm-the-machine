// Audio — thin facade over Tone.js that the rest of the game talks to. The
// actual synthesis lives in ./synth.ts. We defer constructing any Tone nodes
// until the first user gesture enables them, because browsers suspend the
// AudioContext until then.
import { SynthKit } from './synth';

export class Audio {
  private kit: SynthKit | null = null;
  private primed = false;
  private volume = 0.7;
  private muted = false;

  /** Called from a user-gesture handler (first click) to wake the AudioContext. */
  async prime() {
    if (this.primed) return;
    this.primed = true;
    this.kit = await SynthKit.create();
    this.kit.setMasterVolume(this.muted ? 0 : this.volume);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.kit?.setMasterVolume(this.muted ? 0 : this.volume);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.kit?.setMasterVolume(this.muted ? 0 : this.volume);
    return this.muted;
  }

  playChamberBGM(index: number) {
    this.kit?.playBGM(index);
    // One ambient layer per chamber. Reused moods by chapter group.
    const ambients: Array<'typewriter' | 'attichum' | 'serverhum' | 'marketchatter' | 'machinedrone' | null> = [
      'typewriter',     // ch0 LIMIT
      'attichum',       // ch1 WHITEPAPER
      'attichum',       // ch2 SPACESHIP
      'serverhum',      // ch3 CROWDSALE
      'machinedrone',   // ch4 THE DAO
      'machinedrone',   // ch5 FORK
      'marketchatter',  // ch6 BLOOM
      'serverhum',      // ch7 MERGE
    ];
    this.kit?.playAmbient(ambients[index] ?? null);
  }

  playFinale() {
    this.kit?.playFinale();
    this.kit?.playAmbient(null);
  }

  stopBGM() {
    this.kit?.stopBGM();
    this.kit?.stopAmbient();
  }

  playSFX(kind: 'interact' | 'win' | 'hit' | 'jump' | 'merge' | 'mint' | 'damage' | 'portal' | 'step') {
    this.kit?.playSFX(kind);
  }
}
