// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoveTokenFaucet
 * @dev Testnet faucet for Love Token distribution
 *
 * Allows each address to claim 10000 LOVE tokens once per hour.
 * This contract is intended for Base Sepolia testnet only.
 *
 * For production: Replace with DEX-based token acquisition (Uniswap)
 */
contract LoveTokenFaucet is Ownable {
    IERC20 public loveToken;

    // Amount each address can claim: 10000 LOVE
    uint256 public constant CLAIM_AMOUNT = 10000 * 10**18;

    // Cooldown period: 1 hour
    uint256 public constant CLAIM_COOLDOWN = 1 hours;

    // Track last claim time for each address
    mapping(address => uint256) public lastClaimTime;

    // Events
    event TokensClaimed(address indexed claimer, uint256 amount);
    event FaucetFunded(address indexed funder, uint256 amount);
    event FaucetDrained(address indexed recipient, uint256 amount);

    /**
     * @dev Constructor sets the LOVE token address
     * @param _loveToken Address of the deployed LoveToken contract
     */
    constructor(address _loveToken) Ownable(msg.sender) {
        require(_loveToken != address(0), "Invalid token address");
        loveToken = IERC20(_loveToken);
    }

    /**
     * @dev Allows a user to claim 10000 LOVE tokens (once per hour)
     * Reverts if cooldown period hasn't passed or faucet has insufficient balance
     */
    function claim() external {
        require(
            block.timestamp >= lastClaimTime[msg.sender] + CLAIM_COOLDOWN,
            "Claim cooldown not elapsed"
        );
        require(
            loveToken.balanceOf(address(this)) >= CLAIM_AMOUNT,
            "Faucet empty"
        );

        lastClaimTime[msg.sender] = block.timestamp;

        bool success = loveToken.transfer(msg.sender, CLAIM_AMOUNT);
        require(success, "Transfer failed");

        emit TokensClaimed(msg.sender, CLAIM_AMOUNT);
    }

    /**
     * @dev Get the time when an address can claim next
     * @param account Address to check
     * @return uint256 Timestamp when the address can claim again (0 if can claim now)
     */
    function getNextClaimTime(address account) external view returns (uint256) {
        uint256 nextClaimTime = lastClaimTime[account] + CLAIM_COOLDOWN;
        if (block.timestamp >= nextClaimTime) {
            return 0; // Can claim now
        }
        return nextClaimTime;
    }

    /**
     * @dev Check if an address can claim right now
     * @param account Address to check
     * @return bool True if address can claim, false if still in cooldown
     */
    function canClaim(address account) external view returns (bool) {
        return block.timestamp >= lastClaimTime[account] + CLAIM_COOLDOWN;
    }

    /**
     * @dev Get current faucet balance
     * @return uint256 Current LOVE token balance in the faucet
     */
    function getFaucetBalance() external view returns (uint256) {
        return loveToken.balanceOf(address(this));
    }

    /**
     * @dev Owner can fund the faucet with additional tokens
     * Owner must first approve this contract to spend their tokens
     * @param amount Amount of tokens to add to the faucet
     */
    function fundFaucet(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");

        bool success = loveToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        emit FaucetFunded(msg.sender, amount);
    }

    /**
     * @dev Owner can drain remaining tokens from the faucet
     * Useful for testnet cleanup or migrating to new faucet
     * @param recipient Address to receive the tokens
     */
    function drain(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");

        uint256 balance = loveToken.balanceOf(address(this));
        require(balance > 0, "Faucet already empty");

        bool success = loveToken.transfer(recipient, balance);
        require(success, "Transfer failed");

        emit FaucetDrained(recipient, balance);
    }

    /**
     * @dev Emergency function to update token address if needed
     * Should only be used if token contract is redeployed on testnet
     * @param _newToken Address of the new LoveToken contract
     */
    function updateTokenAddress(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Invalid token address");
        loveToken = IERC20(_newToken);
    }
}
