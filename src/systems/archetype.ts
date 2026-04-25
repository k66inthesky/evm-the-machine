// Archetype — the hidden 8-dimensional player-profile vector the game tracks
// silently across chambers. The mirror scene at the end asks the player to
// guess their top archetype; the tracker is what it compares against.
//
// Axes (codes + labels are shown to the player only in the final reveal):
//   V = Visionary   — why/meaning > how
//   E = Engineer    — dives into terminals, code, specs
//   C = Capitalist  — looks at price, fundraise, flows
//   G = Governor    — chooses rules, voting, consensus
//   R = Rebel       — "code is law", refuses compromise
//   S = Speculator  — short-term upside, in/out fast
//   B = Builder     — shipping, fixing, PR-ing
//   W = Witness     — observes, records, abstains
//
// Choices add explicit weights; ambient behaviour (dwell time, what you look
// at first, whether you ever open a terminal) quietly adds too. Everything
// funnels through `add()` and lands in localStorage.

export type Archetype = 'V' | 'E' | 'C' | 'G' | 'R' | 'S' | 'B' | 'W';

export type ArchetypeVector = Record<Archetype, number>;

export interface BehaviorEvent {
  chamber: number;
  kind: string;
  weights: Partial<ArchetypeVector>;
  t: number;
}

const SCORE_KEY = 'evm-archetype-v1';
const LOG_KEY = 'evm-archetype-log-v1';

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  V: 'Visionary',
  E: 'Engineer',
  C: 'Capitalist',
  G: 'Governor',
  R: 'Rebel',
  S: 'Speculator',
  B: 'Builder',
  W: 'Witness',
};

export class ArchetypeTracker {
  scores: ArchetypeVector;
  log: BehaviorEvent[];

  constructor() {
    this.scores = this.load();
    this.log = this.loadLog();
  }

  add(chamber: number, kind: string, weights: Partial<ArchetypeVector>) {
    for (const [k, v] of Object.entries(weights)) {
      if (v == null) continue;
      this.scores[k as Archetype] = (this.scores[k as Archetype] ?? 0) + v;
    }
    this.log.push({ chamber, kind, weights, t: Date.now() });
    this.persist();
    // Surface a hint that the machine just recorded something. The HUD
    // listens for this and flashes a small "MACHINE · +V +E" label so the
    // player knows the silent tracker exists without us giving away the
    // dimension labels — keeps the finale reveal earned. See main.ts.
    window.dispatchEvent(new CustomEvent('archetype:gain', { detail: { weights } }));
  }

  /** Top N archetypes by score, ties broken by insertion order. */
  top(n = 2): Archetype[] {
    return (Object.entries(this.scores) as [Archetype, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
  }

  reset() {
    this.scores = this.empty();
    this.log = [];
    this.persist();
  }

  private empty(): ArchetypeVector {
    return { V: 0, E: 0, C: 0, G: 0, R: 0, S: 0, B: 0, W: 0 };
  }

  private load(): ArchetypeVector {
    try {
      const parsed = JSON.parse(localStorage.getItem(SCORE_KEY) || '{}');
      return { ...this.empty(), ...parsed };
    } catch {
      return this.empty();
    }
  }

  private loadLog(): BehaviorEvent[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist() {
    localStorage.setItem(SCORE_KEY, JSON.stringify(this.scores));
    // Cap log so localStorage doesn't bloat across replays.
    localStorage.setItem(LOG_KEY, JSON.stringify(this.log.slice(-500)));
  }
}
