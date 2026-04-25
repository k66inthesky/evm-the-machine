// ABI for EVMHistorian.sol. Hand-written (not json-imported) so the judges
// reading src/ see exactly what the frontend can call. Must match the
// Solidity file in contracts/src/EVMHistorian.sol.
//
// EVMHistorian is a soulbound ERC-721 — only mintJourney + the read functions
// are useful from the frontend. Transfer/approve are exposed for ERC-721
// compliance but always revert.
export const HISTORIAN_ABI = [
  {
    type: 'function',
    name: 'markChamber',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'index', type: 'uint8' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'mintJourney',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'completionSeconds', type: 'uint256' }],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'progressOf',
    stateMutability: 'view',
    inputs: [{ name: 'who', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'totalJourneys',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'journeyOf',
    stateMutability: 'view',
    inputs: [{ name: 'who', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'IMAGE_URL',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'event',
    name: 'ChamberCompleted',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'index', type: 'uint8', indexed: false },
      { name: 'at', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JourneyMinted',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: false },
      { name: 'completionSeconds', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
] as const;
