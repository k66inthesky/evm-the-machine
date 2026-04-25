# Deploy checklist — EVM: The Machine

Everything that needed source-access is done. This file is the 60-second manual
for the three upload steps that require your browser login.

## 1. GitHub (Open Source track) — ✅ DONE

- Repo: https://github.com/k66inthesky/evm-the-machine
- Public, MIT, 12 jam topics.
- Nothing more to do unless you want to add a release tag: `gh release create jam2026 submission/build.zip --title "Gamedev.js Jam 2026 submission"`.

## 2. itch.io (main jam submission)

1. Log in at https://itch.io/ (your account).
2. Go to https://itch.io/game/new.
3. Fill in:
   - **Title**: `EVM: The Machine`
   - **Project URL**: `evm-the-machine`
   - **Classification**: Game
   - **Kind of project**: HTML
   - **Upload**: `submission/build.zip` → tick "This file will be played in the browser".
   - **Embed options**: 1280×720, enable fullscreen button.
   - **Cover image**: `submission/cover.png` (630×500).
   - **Screenshots**: drag all eight `submission/screenshot-NN-*.png` (LIMIT · WHITEPAPER · SPACESHIP · CROWDSALE · THE DAO · FORK · BLOOM · MERGE).
   - **Description**: paste `submission/description.md` (itch converts markdown).
   - **Genre**: Action · **Tags**: `3d`, `ethereum`, `first-person`, `procedural-generation`, `synthwave`, `threejs`, `web3`, `webgl`.
   - **Pricing**: No payments.
   - **Visibility**: Public.
4. Save → "View the submission page you created" → click "Submit to jam" → pick **Gamedev.js Jam 2026** → tick **Open Source Challenge** and **Ethereum Challenge** on the submission form.

(Paid plan is not required — free itch accounts can host HTML5 games and enter jams.)

## 3. Wavedash (Wavedash Challenge, $1000)

```bash
cd ~/evm-the-machine
wavedash auth login                 # opens browser for device-code flow
wavedash project create             # creates the game on wavedash.com
                                    # copy the returned game_id
$EDITOR wavedash.toml               # paste game_id (replace REPLACE_ME_AFTER_...)
npm run build                       # regenerate dist/ (already clean — no-op if unchanged)
wavedash build push                 # uploads dist/ to wavedash.com
```

Then on https://wavedash.com/, open the game → "Submit to jam" → pick
**Gamedev.js Jam 2026** → the Wavedash Challenge is auto-selected for
Wavedash-deployed submissions.

## 4. Sepolia contract — ⚠️ RE-DEPLOY REQUIRED FOR v2

The v1 deployment (`0xDc60…521B`) is the old 6-chamber scoreboard — keep it
as a historical record, but the v2 frontend talks to a new contract. The
v2 `EVMHistorian.sol` is now a **soulbound ERC-721** with `tokenURI` that
points at the Crowdsale chapter screenshot, so wallets / OpenSea render the
NFT inline.

```bash
cd contracts
cp ../.env.example ../.env  # if you haven't already
$EDITOR ../.env             # set DEPLOYER_PRIVATE_KEY + SEPOLIA_RPC_URL
forge create src/EVMHistorian.sol:EVMHistorian \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
# Copy the deployed address into the project root .env:
#   VITE_HISTORIAN_ADDRESS=0x...
```

After deploy, regenerate `submission/build.zip` so the on-itch upload picks
up the new address: `npm run build && cd dist && zip -r ../submission/build.zip .`.

## 5. thirdweb (for the "Login with Google" mint path)

The v2 finale offers two mint paths: MetaMask (existing) and `CLAIM WITH GOOGLE`
(thirdweb `inAppWallet` — a smart wallet spawned at sign-in time, no extension
or seed phrase). The MetaMask path works without any setup; the Google path
needs a thirdweb client ID.

1. Sign up free at https://thirdweb.com/dashboard/.
2. Create a project → copy the **Client ID** (NOT the secret).
3. Add to `.env`:
   ```
   VITE_THIRDWEB_CLIENT_ID=<your-client-id>
   ```
4. `npm run build` again so the build picks it up.

If you skip this step the finale just hides the Google button and falls
back to MetaMask-only.

## 6. Final 2-minute checklist before the deadline

- [ ] All three platforms show the game playable from a cold browser.
- [ ] itch.io page opens from an incognito window (i.e. it's actually public).
- [ ] Wavedash page opens from an incognito window.
- [ ] Jam submission form has all three challenge tracks ticked (Open Source, Ethereum, Wavedash).
- [ ] GitHub repo shows README cover + MIT license on the sidebar.
