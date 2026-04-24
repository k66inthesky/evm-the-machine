// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EVMHistorian
 * @notice On-chain scoreboard + souvenir for "EVM: The Machine".
 *
 * Design goals (Ethereum Challenge scoring):
 *   - Meaningful: the chain records the player's actual journey, not a login.
 *   - Optional: the game is fully playable offline. This contract is a bonus.
 *   - Cheap: a bitmap for completion state, one event per chamber.
 *
 * State model:
 *   - progress[player] is a uint8 where bit i = chamber i completed.
 *   - A player who finished all six chambers (progress == 0x3F) can mint one
 *     Journey token. Journey is a soulbound (non-transferable) counter — we
 *     don't implement full ERC-721 in 48 hours, but the token id, owner, and
 *     completion time are on-chain and linkable from Etherscan.
 */
contract EVMHistorian {
    uint8 public constant TOTAL_CHAMBERS = 6;
    uint8 private constant ALL_DONE = (uint8(1) << TOTAL_CHAMBERS) - 1; // 0x3F

    mapping(address => uint8) public progress;
    mapping(uint256 => address) public journeyOwner;
    mapping(uint256 => uint256) public journeyCompletionSeconds;
    mapping(address => uint256) public journeyOf;
    uint256 public totalJourneys;

    event ChamberCompleted(address indexed player, uint8 index, uint256 at);
    event JourneyMinted(address indexed player, uint256 tokenId, uint256 completionSeconds);

    /// Mark one chamber complete. Idempotent — re-marking is a no-op.
    function markChamber(uint8 index) external {
        require(index < TOTAL_CHAMBERS, "bad chamber");
        uint8 bit = uint8(1) << index;
        uint8 cur = progress[msg.sender];
        if ((cur & bit) != 0) return; // already done — silently succeed
        progress[msg.sender] = cur | bit;
        emit ChamberCompleted(msg.sender, index, block.timestamp);
    }

    /// Mint a Journey once all six chambers are complete. Caller can mint
    /// only once; subsequent calls revert.
    function mintJourney(uint256 completionSeconds) external returns (uint256 tokenId) {
        require(progress[msg.sender] == ALL_DONE, "journey incomplete");
        require(journeyOf[msg.sender] == 0, "already minted");
        tokenId = ++totalJourneys;
        journeyOwner[tokenId] = msg.sender;
        journeyCompletionSeconds[tokenId] = completionSeconds;
        journeyOf[msg.sender] = tokenId;
        emit JourneyMinted(msg.sender, tokenId, completionSeconds);
    }

    /// Convenience read for the frontend.
    function progressOf(address who) external view returns (uint8) {
        return progress[who];
    }
}
