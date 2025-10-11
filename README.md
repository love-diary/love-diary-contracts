# Love Diary - Smart Contracts

An AI-powered romance game where players develop relationships with unique NFT characters. Characters have persistent memories stored on blockchain, can be transferred between players, and evolve through interactions powered by fully autonomous AI agents.

## Overview

Love Diary is a blockchain-based game built for ETH Global Hackathon that combines NFT ownership with autonomous AI agents. This repository contains the smart contracts that power the game's token economy and character NFT system.

## Core Features

- **LOVE Token (ERC-20)**: Utility token for in-game transactions
- **Character NFTs (ERC-721)**: Unique characters with persistent on-chain memories
- **Agent Wallets**: Each character has its own wallet to hold LOVE tokens
- **Token Faucet**: Testnet distribution for demo (1000 LOVE per address)
- **Gift System**: Send gifts to characters using LOVE tokens
- **Multi-Player Access**: Support for exclusive (MONO), shared (POLY), and free (FREE) characters

## Smart Contracts

### LoveToken.sol
Standard ERC-20 token with fixed supply. Used for:
- Character minting (100 LOVE)
- Character transfers (50 LOVE fee)
- Sending gifts (10-100 LOVE)
- Daily login rewards (+5 LOVE)

### LoveTokenFaucet.sol
Testnet faucet allowing each address to claim 10000 LOVE tokens once per hour.

### CharacterNFT.sol
ERC-721 NFT contract for character ownership with:
- Randomized character attributes (name, age, occupation, personality)
- Agent wallet address generation on mint
- 100 LOVE minting fee (burned)
- 50 LOVE transfer fee (to treasury)

### CharacterAccess.sol
Access control extension for multi-player support:
- Character types: MONO (1:1), POLY (1:many), FREE (community-shared)
- Access management functions
- Per-player relationship tracking

### GiftShop.sol
Gift purchase system that transfers LOVE tokens directly to character agent wallets:
- Multiple gift tiers (10-100 LOVE)
- Tokens go to agent wallet, not burned
- Enables agent economic autonomy

## Deployed Contracts

### Base Sepolia Testnet

- **LoveToken**: `0xf614a36b715a1f00bc9450d113d4eefeb0dd6396`
- **LoveTokenFaucet**: `0xF09177Bb77d64084457cE2D7D51A4A28Bce00B84`

View on Basescan:
- [LoveToken](https://sepolia.basescan.org/address/0xf614a36b715a1f00bc9450d113d4eefeb0dd6396)
- [LoveTokenFaucet](https://sepolia.basescan.org/address/0xF09177Bb77d64084457cE2D7D51A4A28Bce00B84)

### Base Mainnet (Production)

Not yet deployed.

## Technology Stack

- **Solidity 0.8.x**
- **Hardhat** - Development environment
- **OpenZeppelin** - ERC-20 and ERC-721 implementations
- **Base Sepolia** - Testnet deployment (MVP)
- **Base Mainnet** - Production deployment

## Development Setup

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Base Sepolia testnet
npx hardhat run scripts/deploy.ts --network baseSepolia

# Verify deployed contracts on Basescan
npx hardhat verify --network baseSepolia 0xf614a36b715a1f00bc9450d113d4eefeb0dd6396
npx hardhat verify --network baseSepolia 0xF09177Bb77d64084457cE2D7D51A4A28Bce00B84 0xf614a36b715a1f00bc9450d113d4eefeb0dd6396
```

## License

All Rights Reserved

Copyright (c) 2025 Love Diary Team

This software and associated documentation files (the "Software") are proprietary and confidential. Unauthorized copying, modification, distribution, or use of this Software, via any medium, is strictly prohibited without explicit written permission from the copyright holder.

## Contributing

This project is being developed for ETHOnline Hackathon. Contributions are currently limited to the Love Diary Team.

## Contact

For questions or collaboration inquiries, please reach out to the development team.
