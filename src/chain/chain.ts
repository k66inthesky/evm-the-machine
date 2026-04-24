// Chain — viem wrapper for reading + writing EVMHistorian state.
//
// Design philosophy for the Ethereum Challenge: the chain is the player's
// *souvenir*, not a gate. Every call here must fail silently and return an
// offline-ok result. The game is always fully playable without a wallet.
//
// Reads use a public RPC with no wallet. Writes require window.ethereum and
// a user signature — we never prompt until the player asks.
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
  | { kind: 'wrong-chain'; chainId: number }
  | { kind: 'connected'; address: Address };

export class Chain {
  private pub: PublicClient;
  private wallet: WalletClient | null = null;
  private address: Address | null = null;
  readonly contract: Address;
  readonly deployed: boolean;

  constructor() {
    this.contract = CONTRACT;
    this.deployed = CONTRACT !== '0x0000000000000000000000000000000000000000';
    this.pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
  }

  get hasWallet(): boolean {
    return typeof (window as any).ethereum !== 'undefined';
  }

  get connectedAddress(): Address | null {
    return this.address;
  }

  async connect(): Promise<ChainStatus> {
    if (!this.hasWallet) return { kind: 'no-wallet' };
    const eth = (window as any).ethereum;
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[];
      this.address = accounts[0] as Address;
      this.wallet = createWalletClient({ chain: sepolia, transport: custom(eth) });
      // Nudge them to Sepolia if they're on the wrong chain.
      const chainIdHex = await eth.request({ method: 'eth_chainId' }) as string;
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== sepolia.id) {
        try {
          await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${sepolia.id.toString(16)}` }] });
        } catch {
          return { kind: 'wrong-chain', chainId };
        }
      }
      return { kind: 'connected', address: this.address };
    } catch {
      return { kind: 'no-wallet' };
    }
  }

  /** Fire-and-forget on-chain chamber completion. Errors are swallowed. */
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

  /** Read chamber completion bitmap for a wallet. Returns 0 on any failure. */
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

  etherscanTx(hash: string): string {
    return `https://sepolia.etherscan.io/tx/${hash}`;
  }

  etherscanAddress(addr: string): string {
    return `https://sepolia.etherscan.io/address/${addr}`;
  }
}
