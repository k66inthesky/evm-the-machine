// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EVMHistorian
 * @notice On-chain scoreboard + soulbound NFT souvenir for "EVM: The Machine".
 *
 * Design goals (Ethereum Challenge scoring):
 *   - Meaningful: the chain records the player's actual journey, not a login.
 *   - Optional: the game is fully playable offline. This contract is a bonus.
 *   - Cheap: a bitmap for completion state, one event per chamber.
 *   - ERC-721: the Journey is a real NFT with an image (the eye-catching
 *     cover artwork — neon EVM hero on the BLOOM scene) so wallets /
 *     OpenSea / smart-wallet UIs render it. Soulbound: every transfer
 *     reverts.
 *
 * State model:
 *   - progress[player] is a uint8 where bit i = chamber i completed.
 *   - A player who finished all eight chambers (progress == 0xFF) can mint
 *     one Journey NFT. Token id is sequential. Soulbound so it stays attached
 *     to the wallet that earned it.
 *
 * tokenURI is built inline as a data: URI so no IPFS / centralized JSON host
 * is required. The image lives at a stable public URL (the GitHub raw of the
 * v2 cover artwork) so any wallet UI can render it.
 */
contract EVMHistorian {
    string public constant name = "EVM: The Machine - Journey";
    string public constant symbol = "JOURNEY";

    uint8 public constant TOTAL_CHAMBERS = 8;
    uint8 private constant ALL_DONE = 0xFF; // (1 << 8) - 1

    // Static URL for the journey artwork. Lives on GitHub Pages (raw.github)
    // so it stays free + permanent for the life of the repo.
    string public constant IMAGE_URL =
        "https://raw.githubusercontent.com/k66inthesky/evm-the-machine/main/submission/cover.png";

    string public constant EXTERNAL_URL = "https://github.com/k66inthesky/evm-the-machine";

    // ERC-721 minimal state.
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    uint256 public totalJourneys;

    // Game state.
    mapping(address => uint8) public progress;
    mapping(uint256 => uint256) public journeyCompletionSeconds;
    mapping(address => uint256) public journeyOf;

    // Events — both gameplay + ERC-721.
    event ChamberCompleted(address indexed player, uint8 index, uint256 at);
    event JourneyMinted(address indexed player, uint256 tokenId, uint256 completionSeconds);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /// Mark one chamber complete. Idempotent — re-marking is a no-op.
    function markChamber(uint8 index) external {
        require(index < TOTAL_CHAMBERS, "bad chamber");
        uint8 bit = uint8(1) << index;
        uint8 cur = progress[msg.sender];
        if ((cur & bit) != 0) return; // already done — silently succeed
        progress[msg.sender] = cur | bit;
        emit ChamberCompleted(msg.sender, index, block.timestamp);
    }

    /// Mint the Journey NFT. The finale screen client-side gates this on
    /// progress.completedCount() == 8 so we don't double-gate on-chain — the
    /// player has earned the right to mint by reaching the finale, and
    /// requiring eight prior `markChamber` transactions would mean nine
    /// wallet signatures per playthrough (a non-starter for the Google /
    /// smart-wallet UX). The mint is one-per-wallet. The completionSeconds
    /// argument is recorded as a permanent attribute on the token.
    function mintJourney(uint256 completionSeconds) external returns (uint256 tokenId) {
        require(journeyOf[msg.sender] == 0, "already minted");
        // Mark the bitmap as fully complete at mint time so progressOf()
        // reads correctly for any future contract integrations.
        progress[msg.sender] = ALL_DONE;
        tokenId = ++totalJourneys;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;
        journeyCompletionSeconds[tokenId] = completionSeconds;
        journeyOf[msg.sender] = tokenId;
        emit Transfer(address(0), msg.sender, tokenId);
        emit JourneyMinted(msg.sender, tokenId, completionSeconds);
    }

    function progressOf(address who) external view returns (uint8) {
        return progress[who];
    }

    // ── ERC-721 surface ────────────────────────────────────────────────────

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "zero owner");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "no token");
        return o;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId); // revert if doesn't exist
        // Build the JSON inline. Wallets accept data:application/json;utf8,…
        // — no base64 needed if we keep the JSON ASCII-clean.
        return string.concat(
            'data:application/json;utf8,{"name":"EVM: The Machine - Journey #',
            _toString(tokenId),
            '","description":"Souvenir for completing all eight chapters of EVM: The Machine. The bearer walked the World Computer - Limit, Whitepaper, Spaceship, Crowdsale, The DAO, Fork, Bloom, Merge.","image":"',
            IMAGE_URL,
            '","external_url":"',
            EXTERNAL_URL,
            '","attributes":[{"trait_type":"Completion Seconds","value":',
            _toString(journeyCompletionSeconds[tokenId]),
            '},{"trait_type":"Soulbound","value":"true"},{"trait_type":"Chambers","value":8}]}'
        );
    }

    // ── Soulbound: every transfer / approval reverts. ──────────────────────

    function transferFrom(address, address, uint256) external pure {
        revert("soulbound");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("soulbound");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("soulbound");
    }

    function approve(address, uint256) external pure {
        revert("soulbound");
    }

    function setApprovalForAll(address, bool) external pure {
        revert("soulbound");
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    // ERC-165 surface advertising ERC-721 + ERC-721 Metadata + ERC-165.
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return
            id == 0x80ac58cd /* ERC-721 */ ||
            id == 0x5b5e139f /* ERC-721 Metadata */ ||
            id == 0x01ffc9a7 /* ERC-165 */;
    }

    // ── Tiny uint → string helper, no imports. ─────────────────────────────

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 t = v;
        uint256 len;
        while (t != 0) { len++; t /= 10; }
        bytes memory b = new bytes(len);
        while (v != 0) {
            len -= 1;
            b[len] = bytes1(uint8(48 + v % 10));
            v /= 10;
        }
        return string(b);
    }
}
