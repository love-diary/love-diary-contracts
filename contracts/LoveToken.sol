// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoveToken
 * @dev ERC-20 utility token for Love Diary game
 *
 * Token is used for:
 * - Character minting (100 LOVE)
 * - Character transfers (50 LOVE fee)
 * - Sending gifts (10-100 LOVE)
 * - Daily login rewards (+5 LOVE)
 *
 * For MVP: Tokens distributed via faucet on testnet
 * For Production: Tokens available via DEX (Uniswap)
 */
contract LoveToken is ERC20, Ownable {
    // Total supply: 1 billion LOVE tokens
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18;

    /**
     * @dev Constructor mints initial supply to deployer
     * Deployer will then distribute tokens to faucet and reward pools
     */
    constructor() ERC20("Love Token", "LOVE") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev Allows owner to mint additional tokens if needed
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Allows anyone to burn tokens from their own balance
     * Used by CharacterNFT to burn minting fees
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
