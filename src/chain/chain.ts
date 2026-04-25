// Chain — wallet + contract bridge for EVMHistorian.
//
// Two parallel wallet paths so the player can pick whichever fits them:
//
//   1. MetaMask / injected EOA (existing flow, no SDK overhead).
//   2. thirdweb inAppWallet — "Login with Google" gives the player a smart
//      wallet (ERC-4337-flavoured account abstraction) without making them
//      install anything. This is the lower-barrier path for web2 players.
//
// Both paths land on the same EVMHistorian contract on Sepolia. The chain
// is the player's *souvenir*, not a gate — every call here must fail
// silently and return offline-ok results so the game stays fully playable
// without ANY wallet.
//
// Setup TODOs (see submission/DEPLOY.md):
//   - VITE_THIRDWEB_CLIENT_ID  — sign up at thirdweb.com (free), grab a clientId.
//   - VITE_HISTORIAN_ADDRESS    — re-deploy the v2 ERC-721 contract; address goes here.
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { sepolia } from 'viem/chains';
import { HISTORIAN_ABI } from './abi';

const RPC = (import.meta as any).env?.VITE_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com';
const CONTRACT = ((import.meta as any).env?.VITE_HISTORIAN_ADDRESS || '0x0000000000000000000000000000000000000000') as Address;
const TW_CLIENT_ID = (import.meta as any).env?.VITE_THIRDWEB_CLIENT_ID || '';

export type ChainStatus =
  | { kind: 'offline' }
  | { kind: 'no-wallet' }
  | { kind: 'wrong-chain'; chainId: number }
  | { kind: 'connected'; address: Address; via: 'metamask' | 'google' };

export class Chain {
  private pub: PublicClient;
  private wallet: WalletClient | null = null;
  private address: Address | null = null;
  private connectedVia: 'metamask' | 'google' | null = null;
  // Lazy thirdweb handles. Loaded on first Google-login click so the SDK
  // doesn't bloat the initial bundle for offline players.
  private thirdwebClient: any = null;
  private inAppWallet: any = null;

  readonly contract: Address;
  readonly deployed: boolean;
  readonly googleEnabled: boolean;

  constructor() {
    this.contract = CONTRACT;
    this.deployed = CONTRACT !== '0x0000000000000000000000000000000000000000';
    this.googleEnabled = TW_CLIENT_ID.length > 0;
    this.pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
  }

  get hasInjectedWallet(): boolean {
    return typeof (window as any).ethereum !== 'undefined';
  }

  /** Legacy alias kept so finale.ts compiles unchanged. */
  get hasWallet(): boolean {
    return this.hasInjectedWallet || this.googleEnabled;
  }

  get connectedAddress(): Address | null {
    return this.address;
  }

  get connectedVia_(): 'metamask' | 'google' | null {
    return this.connectedVia;
  }

  // ── MetaMask / injected ────────────────────────────────────────────────

  async connect(): Promise<ChainStatus> {
    if (!this.hasInjectedWallet) return { kind: 'no-wallet' };
    const eth = (window as any).ethereum;
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[];
      this.address = accounts[0] as Address;
      this.wallet = createWalletClient({ chain: sepolia, transport: custom(eth) });
      this.connectedVia = 'metamask';
      const chainIdHex = await eth.request({ method: 'eth_chainId' }) as string;
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== sepolia.id) {
        try {
          await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${sepolia.id.toString(16)}` }] });
        } catch {
          return { kind: 'wrong-chain', chainId };
        }
      }
      return { kind: 'connected', address: this.address, via: 'metamask' };
    } catch {
      return { kind: 'no-wallet' };
    }
  }

  // ── thirdweb inAppWallet (Google OAuth → smart wallet) ────────────────

  async connectWithGoogle(): Promise<ChainStatus> {
    if (!this.googleEnabled) return { kind: 'no-wallet' };
    try {
      const tw = await import('thirdweb');
      const wallets = await import('thirdweb/wallets');
      this.thirdwebClient = tw.createThirdwebClient({ clientId: TW_CLIENT_ID });
      this.inAppWallet = wallets.inAppWallet();
      const account = await this.inAppWallet.connect({
        client: this.thirdwebClient,
        strategy: 'google',
      });
      this.address = account.address as Address;
      this.connectedVia = 'google';
      // We don't build a viem WalletClient for the Google path — thirdweb
      // owns the signing. mintJourney/markChamber detect this via connectedVia.
      this.wallet = null;
      return { kind: 'connected', address: this.address, via: 'google' };
    } catch (e) {
      console.warn('[chain] google login failed:', e);
      return { kind: 'no-wallet' };
    }
  }

  // ── Writes ────────────────────────────────────────────────────────────

  async markChamber(index: number): Promise<string | null> {
    if (!this.deployed || !this.address) return null;
    try {
      if (this.connectedVia === 'google' && this.thirdwebClient) {
        const tw = await import('thirdweb');
        const sepoliaChain = (await import('thirdweb/chains')).sepolia;
        const contract = tw.getContract({
          client: this.thirdwebClient,
          chain: sepoliaChain,
          address: this.contract,
          abi: HISTORIAN_ABI as any,
        });
        const tx = tw.prepareContractCall({ contract, method: 'markChamber', params: [index] });
        const result = await tw.sendTransaction({ transaction: tx, account: await this.inAppWallet.getAccount() });
        return result.transactionHash;
      }
      if (!this.wallet) return null;
      return await this.wallet.writeContract({
        chain: sepolia,
        account: this.address,
        address: this.contract,
        abi: HISTORIAN_ABI,
        functionName: 'markChamber',
        args: [index],
      });
    } catch (e) {
      console.warn('[chain] markChamber failed (offline-ok):', e);
      return null;
    }
  }

  async mintJourney(completionTimeSeconds: number): Promise<string | null> {
    if (!this.deployed || !this.address) return null;
    try {
      if (this.connectedVia === 'google' && this.thirdwebClient) {
        const tw = await import('thirdweb');
        const sepoliaChain = (await import('thirdweb/chains')).sepolia;
        const contract = tw.getContract({
          client: this.thirdwebClient,
          chain: sepoliaChain,
          address: this.contract,
          abi: HISTORIAN_ABI as any,
        });
        const tx = tw.prepareContractCall({
          contract,
          method: 'mintJourney',
          params: [BigInt(completionTimeSeconds)],
        });
        const result = await tw.sendTransaction({ transaction: tx, account: await this.inAppWallet.getAccount() });
        return result.transactionHash;
      }
      if (!this.wallet) return null;
      return await this.wallet.writeContract({
        chain: sepolia,
        account: this.address,
        address: this.contract,
        abi: HISTORIAN_ABI,
        functionName: 'mintJourney',
        args: [BigInt(completionTimeSeconds)],
      });
    } catch (e) {
      console.warn('[chain] mintJourney failed (offline-ok):', e);
      return null;
    }
  }

  // ── Reads ─────────────────────────────────────────────────────────────

  async readProgress(addr: Address): Promise<number> {
    if (!this.deployed) return 0;
    try {
      const raw = await this.pub.readContract({
        address: this.contract,
        abi: HISTORIAN_ABI,
        functionName: 'progressOf',
        args: [addr],
      });
      return Number(raw);
    } catch {
      return 0;
    }
  }

  async readJourneyImageUrl(): Promise<string> {
    if (!this.deployed) {
      return 'https://raw.githubusercontent.com/k66inthesky/evm-the-machine/main/submission/screenshot-04-crowdsale.png';
    }
    try {
      const raw = await this.pub.readContract({
        address: this.contract,
        abi: HISTORIAN_ABI,
        functionName: 'IMAGE_URL',
      });
      return raw as string;
    } catch {
      return 'https://raw.githubusercontent.com/k66inthesky/evm-the-machine/main/submission/screenshot-04-crowdsale.png';
    }
  }

  // ── Etherscan helpers ─────────────────────────────────────────────────

  etherscanTx(hash: string): string {
    return `https://sepolia.etherscan.io/tx/${hash}`;
  }

  etherscanAddress(addr: string): string {
    return `https://sepolia.etherscan.io/address/${addr}`;
  }
}
