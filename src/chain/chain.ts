// Chain — wallet + contract bridge for EVMHistorian.
//
// Two parallel wallet paths so the player can pick whichever fits them:
//
//   1. MetaMask / injected EOA (existing flow, no SDK overhead).
//   2. Coinbase Smart Wallet — passkey / Google / email login spawns an
//      ERC-4337 smart wallet without making the player install anything,
//      no developer signup, no clientId, no credit card. This is the
//      lower-barrier path for web2 players.
//
// Both paths land on the same EVMHistorian contract on Sepolia. The chain
// is the player's *souvenir*, not a gate — every call here must fail
// silently and return offline-ok results so the game stays fully playable
// without ANY wallet.
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

export type ChainStatus =
  | { kind: 'offline' }
  | { kind: 'no-wallet' }
  | { kind: 'rejected' }
  | { kind: 'wrong-chain'; chainId: number }
  | { kind: 'no-google-config' }
  | { kind: 'google-cancelled' }
  | { kind: 'connected'; address: Address; via: 'metamask' | 'google' };

export class Chain {
  private pub: PublicClient;
  private wallet: WalletClient | null = null;
  private address: Address | null = null;
  private connectedVia: 'metamask' | 'google' | null = null;
  // Lazy Coinbase Smart Wallet provider. Loaded on first click so the
  // ~150 KB SDK doesn't bloat the initial bundle for offline players.
  private cbProvider: any = null;

  readonly contract: Address;
  readonly deployed: boolean;
  // Coinbase Smart Wallet needs no clientId / signup, so the Google-style
  // path is always available wherever JS runs. Kept as a field for parity
  // with the old thirdweb-gated UI.
  readonly googleEnabled = true;

  constructor() {
    this.contract = CONTRACT;
    this.deployed = CONTRACT !== '0x0000000000000000000000000000000000000000';
    this.pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
  }

  get hasInjectedWallet(): boolean {
    return typeof (window as any).ethereum !== 'undefined';
  }

  /** Legacy alias kept so finale.ts compiles unchanged. */
  get hasWallet(): boolean {
    return true; // both paths are always available
  }

  get connectedAddress(): Address | null {
    return this.address;
  }

  get connectedVia_(): 'metamask' | 'google' | null {
    return this.connectedVia;
  }

  // ── MetaMask / injected ────────────────────────────────────────────────

  /**
   * Find the actual MetaMask provider. Modern browsers commonly have multiple
   * wallet extensions installed (Binance Wallet, OKX Wallet, Coinbase Wallet,
   * Rabby, Phantom, etc.) and the legacy `window.ethereum` global gets
   * clobbered by whichever loaded last. EIP-6963 fixes this with announce/
   * request events; we listen briefly, then fall back to providers.find or
   * window.ethereum.
   */
  private async findMetaMaskProvider(): Promise<any> {
    const collected: any[] = [];
    const onAnnounce = (e: any) => collected.push(e.detail);
    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await new Promise((r) => setTimeout(r, 80));
    window.removeEventListener('eip6963:announceProvider', onAnnounce);

    const isMM = (info: any) => /metamask/i.test(info?.info?.name || '') || info?.info?.rdns === 'io.metamask';
    const found = collected.find(isMM);
    if (found) return found.provider;
    if (collected.length > 0) return collected[0].provider; // any wallet beats none
    const eth: any = (window as any).ethereum;
    if (!eth) return null;
    if (eth.providers && Array.isArray(eth.providers)) {
      const mm = eth.providers.find((p: any) => p?.isMetaMask);
      if (mm) return mm;
      return eth.providers[0];
    }
    return eth;
  }

  async connect(): Promise<ChainStatus> {
    const provider = await this.findMetaMaskProvider();
    if (!provider) return { kind: 'no-wallet' };
    let accounts: string[];
    try {
      accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
    } catch (e: any) {
      // EIP-1193: code 4001 = user rejected. Anything else we treat as no-wallet.
      if (e?.code === 4001) return { kind: 'rejected' };
      return { kind: 'no-wallet' };
    }
    if (!accounts || accounts.length === 0) return { kind: 'rejected' };
    this.address = accounts[0] as Address;
    this.wallet = createWalletClient({ chain: sepolia, transport: custom(provider) });
    this.connectedVia = 'metamask';
    let chainId = sepolia.id;
    try {
      const chainIdHex = await provider.request({ method: 'eth_chainId' }) as string;
      chainId = parseInt(chainIdHex, 16);
    } catch { /* assume sepolia */ }
    if (chainId !== sepolia.id) {
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${sepolia.id.toString(16)}` }] });
      } catch {
        // User declined the switch (or the chain isn't added). Either way, leave
        // them connected on the wrong chain so we can surface a clear message.
        return { kind: 'wrong-chain', chainId };
      }
    }
    return { kind: 'connected', address: this.address, via: 'metamask' };
  }

  // ── Coinbase Smart Wallet (passkey / Google / email → smart account) ──

  async connectWithGoogle(): Promise<ChainStatus> {
    try {
      // Lazy-load — keeps offline players from paying the SDK's bundle cost.
      const sdkModule = await import('@coinbase/wallet-sdk');
      // Default export is the constructor; some bundlers expose under .default.
      const SDKCtor: any = (sdkModule as any).CoinbaseWalletSDK || (sdkModule as any).default;
      const sdk = new SDKCtor({
        appName: 'EVM: The Machine',
        appChainIds: [sepolia.id],
      });
      this.cbProvider = sdk.makeWeb3Provider({ options: 'smartWalletOnly' });
      let accounts: string[];
      try {
        accounts = await this.cbProvider.request({ method: 'eth_requestAccounts' }) as string[];
      } catch (e: any) {
        const msg = (e?.message || '').toLowerCase();
        if (e?.code === 4001 || msg.includes('cancel') || msg.includes('closed') || msg.includes('rejected')) {
          return { kind: 'google-cancelled' };
        }
        throw e;
      }
      if (!accounts || accounts.length === 0) return { kind: 'google-cancelled' };
      this.address = accounts[0] as Address;
      this.wallet = createWalletClient({ chain: sepolia, transport: custom(this.cbProvider) });
      this.connectedVia = 'google';
      // Make sure we're on Sepolia. The smart-wallet popup usually obeys
      // appChainIds, but the user could have switched manually.
      try {
        const chainIdHex = await this.cbProvider.request({ method: 'eth_chainId' }) as string;
        const chainId = parseInt(chainIdHex, 16);
        if (chainId !== sepolia.id) {
          try {
            await this.cbProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${sepolia.id.toString(16)}` }],
            });
          } catch {
            return { kind: 'wrong-chain', chainId };
          }
        }
      } catch { /* assume sepolia */ }
      return { kind: 'connected', address: this.address, via: 'google' };
    } catch (e) {
      console.warn('[chain] coinbase smart wallet login failed:', e);
      return { kind: 'no-google-config' };
    }
  }

  // ── Writes ────────────────────────────────────────────────────────────

  async markChamber(index: number): Promise<string | null> {
    if (!this.deployed || !this.wallet || !this.address) return null;
    try {
      const hash = await this.wallet.writeContract({
        chain: sepolia,
        account: this.address,
        address: this.contract,
        abi: HISTORIAN_ABI,
        functionName: 'markChamber',
        args: [index],
      });
      return hash;
    } catch (e) {
      console.warn('[chain] markChamber failed (offline-ok):', e);
      return null;
    }
  }

  async mintJourney(completionTimeSeconds: number): Promise<string | null> {
    if (!this.deployed || !this.wallet || !this.address) return null;
    try {
      const hash = await this.wallet.writeContract({
        chain: sepolia,
        account: this.address,
        address: this.contract,
        abi: HISTORIAN_ABI,
        functionName: 'mintJourney',
        args: [BigInt(completionTimeSeconds)],
      });
      return hash;
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
      return 'https://raw.githubusercontent.com/k66inthesky/evm-the-machine/main/submission/cover.png';
    }
    try {
      const raw = await this.pub.readContract({
        address: this.contract,
        abi: HISTORIAN_ABI,
        functionName: 'IMAGE_URL',
      });
      return raw as string;
    } catch {
      return 'https://raw.githubusercontent.com/k66inthesky/evm-the-machine/main/submission/cover.png';
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
