# Deploy checklist — EVM: The Machine

Everything that needed source-access is done. This file is the 60-second manual
for the three upload steps that require your browser login.

## 1. GitHub (Open Source track) — ✅ DONE

- Repo: https://github.com/k66inthesky/evm-the-machine
- Public, MIT, 4 commits, 12 jam topics.
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
   - **Screenshots**: drag all six `submission/screenshot-*.png`.
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

## 4. Sepolia contract — ⏸ BLOCKED on Sepolia funds

Deployer wallet `0x264D10e6f8D5e53e950DAb7bCF32B3B59003f824` is empty.
After ≥ 0.05 SepoliaETH lands (use any of these faucets):

- https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- https://sepolia-faucet.pk910.de/
- https://www.alchemy.com/faucets/ethereum-sepolia

Run:

```bash
cd ~/evm-the-machine
source .env
cd contracts
forge create src/EVMHistorian.sol:EVMHistorian \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast

# copy "Deployed to: 0x..." into .env:
#   VITE_HISTORIAN_ADDRESS=0x...
cd ..
npm run build                     # rebuild with contract wired in
python3 -c "import zipfile, os; z = zipfile.ZipFile('submission/build.zip','w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(r,f), os.path.relpath(os.path.join(r,f),'dist')) for r,_,fs in os.walk('dist') for f in fs]; z.close()"
wavedash build push               # push the wired build to Wavedash
# re-upload build.zip on itch.io page.
```

Game works 100% offline without the contract — this step only unlocks the
Ethereum track's on-chain journey record + NFT mint. The Ethereum challenge
judges look for *meaningful integration*, so this step is worth the 10 min.

## 5. Final 2-minute checklist before the deadline

- [ ] All three platforms show the game playable from a cold browser.
- [ ] itch.io page opens from an incognito window (i.e. it's actually public).
- [ ] Wavedash page opens from an incognito window.
- [ ] Jam submission form has all three challenge tracks ticked (Open Source, Ethereum, Wavedash).
- [ ] GitHub repo shows README cover + MIT license on the sidebar.
