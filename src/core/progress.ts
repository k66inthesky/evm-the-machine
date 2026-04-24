// Progress — local (localStorage) record of chambers completed. Used to gate
// the chamber-select screen, mark UI, and decide whether the finale mint
// button should appear. On-chain state is the source of truth for bragging
// rights, this is the source of truth for UI.
const KEY = 'evm-machine-progress-v1';

export class Progress {
  private done = new Set<number>();

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) JSON.parse(raw).forEach((i: number) => this.done.add(i));
    } catch { /* localStorage blocked — fine, in-memory only */ }
  }

  mark(index: number) {
    this.done.add(index);
    this.persist();
  }

  has(index: number): boolean {
    return this.done.has(index);
  }

  all(): number[] {
    return [...this.done].sort((a, b) => a - b);
  }

  completedCount(): number {
    return this.done.size;
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.done]));
    } catch { /* ignore */ }
  }
}
