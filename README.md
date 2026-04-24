# EVM: The Machine

![cover](submission/cover.png)

> **Step inside the World Computer.**
> Six chambers. Six moments of Ethereum history. Your journey is etched onto the chain.

A first-person 3D exploration game built in 48 hours for **Gamedev.js Jam 2026** (theme: *Machines*). You walk through a synthwave/Tron reimagining of Ethereum's most iconic moments — Genesis, The DAO, The Merge, gas storms, rollups, and Vitalik's core — and each chamber you complete is recorded on Sepolia testnet. Clear all six and mint a one-of-a-kind Journey NFT as a souvenir.

---

## 🎮 Play

- **itch.io**: _(coming — submission goes live before the deadline)_
- **Wavedash**: _(coming — same build, deployed there)_
- **Source on GitHub**: [github.com/k66inthesky/evm-the-machine](https://github.com/k66inthesky/evm-the-machine)

Local development:

```bash
npm install
npm run dev        # localhost:5173
npm run build      # static output in dist/
npm run preview
```

No plugins, no installers — runs in any modern browser.

---

## ⛓ On-chain (Sepolia, optional)

- **Contract**: [`EVMHistorian`](contracts/src/EVMHistorian.sol) — _deployed address goes here after Sepolia funding_
- **Etherscan**: _(coming)_
- The chain is the player's **souvenir**, not a login gate. The game is 100% playable offline. Connecting a wallet records each chamber you complete and lets you mint a "Journey" once you finish all six.

See [`contracts/README.md`](contracts/README.md) for the deploy + verify steps.

---

## 🕹 Controls

| Action          | Key                 |
| --------------- | ------------------- |
| Move            | `W` `A` `S` `D`     |
| Look            | Mouse (pointer-lock on click) |
| Interact        | `E`                 |
| Sprint          | `Shift` (hold)      |
| Jump            | `Space`             |
| Fire / convert  | Left mouse button   |
| Quit to menu    | `Esc`               |

Volume and fullscreen toggles live in the top-left of every screen.

---

## 🧱 Tech stack

| Layer              | Choice                                   | Why                                                                       |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------- |
| Engine             | [Three.js](https://threejs.org)          | Synthwave/wireframe/bloom is its native look                              |
| Post-processing    | `UnrealBloomPass`                         | Bundled with Three.js, does 90% of the visual identity                    |
| Bundler            | [Vite](https://vitejs.dev)                | Static `dist/` drops straight into itch.io / Wavedash                     |
| Language           | TypeScript (non-strict)                   | Judges can navigate the 6-chamber architecture with type hints            |
| Wallet / RPC       | [viem](https://viem.sh)                   | 10× smaller than ethers+wagmi, clean vanilla integration                  |
| Contracts          | [Foundry](https://getfoundry.sh)          | Single Solidity file, single `forge create` to ship                       |
| Audio              | [Tone.js](https://tonejs.github.io)       | Code-synthesized synthwave loops — no audio assets to manage              |

**Everything in-game is procedurally generated.** There are no imported 3D models, no texture files, and no pre-recorded audio. Every cube, line, and snare hit is made from code at runtime.

---

## 🗺 The six chambers

1. **Genesis** — walk to the glowing cube, press `E`, watch it detonate into the first block lattice.
2. **The DAO** — trapped in a reentrant hall of mirrors. Follow the denser falling-code glyphs to the exit portal.
3. **The Merge** — click five black industrial miner-cubes to convert them into green validator crystals. PoW → PoS.
4. **Gas Storm** — survive 30 seconds in a corridor while orange gas projectiles fly at you. HP regenerates on respawn.
5. **Rollup** — stand on L1, find the purple portal, jump through to L2, then L3. Reach the gold core at the top.
6. **Vitalik's Core** — the finale. Approach the orbiting atom-reactor, press `E`, and your completion ignites the bloom.

Each chamber can be re-entered from the select screen. Progress is kept in `localStorage` and, if you're connected, on Sepolia.

---

## 🏆 How each jam criterion is addressed

### Overall scoring
- **Innovation** — "step *inside* the EVM" is a first-person take on blockchain-as-place that no jam entry has done before. Opcodes, gas, and consensus become physical space.
- **Theme (Machines)** — Ethereum is the World Computer. The player literally walks through its memory. The theme isn't decoration — it's the premise.
- **Gameplay** — six chambers, each with a distinct verb (interact / escape / convert / dodge / jump / finale), each with a clear win state, each 60–120 seconds. A progression arc without filler.
- **Graphics** — procedural wireframe primitives + emissive materials + `UnrealBloomPass` + fog. Visually cohesive, technically cheap, 60fps on a mid-range laptop.
- **Audio** — six mood-specific BGM loops composed live in Tone.js (all in A minor so transitions don't clash) plus SFX on every meaningful interaction. Volume + mute in settings.

### Challenges
- **Open Source (GitHub)** — every file begins with a header comment explaining its purpose. The folder structure reads top-down: `src/main.ts` → `src/core/game.ts` → `src/chambers/NN-*.ts`. A stranger can understand the architecture in ten minutes.
- **Ethereum (OP Guild)** — the on-chain integration is *meaningful*, not a login wall. Every chamber emits a `ChamberCompleted(player, index, at)` event. Completing all six unlocks a `mintJourney(completionSeconds)` souvenir. Players who never connect a wallet still play the full game; players who do get an on-chain record of their run. See [`EVMHistorian.sol`](contracts/src/EVMHistorian.sol).
- **Wavedash** — the production build deploys unchanged; no platform-specific code.

---

## 🎓 Reading the code

Architecture, top-down:

```
src/
  main.ts                # boots Game
  core/
    game.ts              # state machine: title → select → chamber → finale
    renderer.ts          # WebGL renderer + bloom composer
    fps-controller.ts    # WASD + mouse-look + gravity + collision
    input.ts             # key/mouse tracking with per-frame edges
    hud.ts               # DOM overlay for titles & prompts
    palette.ts           # locked color constants
    progress.ts          # localStorage: chambers completed
    settings.ts          # floating volume + fullscreen
  screens/               # non-gameplay screens (title, select, finale, credits)
  chambers/
    chamber.ts           # base class — mount / build / update / win / dispose
    01-genesis.ts ... 06-vitalik-core.ts
  audio/
    audio.ts             # facade used by the rest of the game
    synth.ts             # Tone.js composition per chamber
  chain/
    chain.ts             # viem wrapper: connect, markChamber, mintJourney
    abi.ts               # hand-written ABI, matches EVMHistorian.sol
contracts/
  src/EVMHistorian.sol   # on-chain scoreboard + Journey mint
  foundry.toml           # forge config
  README.md              # deploy steps
```

Each chamber is self-contained. Reading `src/chambers/03-merge.ts` alone tells you the entire Merge experience.

---

## 📝 Credits

- **Design · code · audio**: k66
- **Built with**: Three.js, Vite, viem, Tone.js, Foundry
- **For**: Gamedev.js Jam 2026 · Theme: *Machines*
- **Challenges entered**: Open Source · Ethereum · Wavedash

## 📄 License

MIT. Fork it, remix it, put it in a chamber of your own.
