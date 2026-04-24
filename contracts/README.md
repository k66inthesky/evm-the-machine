# EVMHistorian — on-chain journey record

Solidity contract for "EVM: The Machine". Records per-player chamber completion and mints a Journey souvenir once all six chambers are done.

## Deploy to Sepolia

Requires [Foundry](https://getfoundry.sh/). From this `contracts/` directory, with `../.env` filled in (see `../.env.example`):

```bash
source ../.env
forge create \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast \
  src/EVMHistorian.sol:EVMHistorian
```

Copy the printed `Deployed to: 0x...` address into `../.env`'s `VITE_HISTORIAN_ADDRESS` and the root `README.md`.

## Verify on Etherscan (optional)

```bash
forge verify-contract \
  --chain sepolia \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  <deployed-address> \
  src/EVMHistorian.sol:EVMHistorian
```

## Offline testing with anvil

```bash
anvil &              # in another terminal
forge test           # (no tests yet — contract is trivial enough to visually review)
```
