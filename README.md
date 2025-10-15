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
UUPS upgradeable ERC-721 NFT contract for character ownership with:
- Player-selected attributes (name, gender, sexual orientation, language)
- Randomized traits (birth timestamp, occupation ID, personality ID, secret personality)
- Bonding mechanism (one-time initialization with player)
- Numeric trait IDs (0-9) mapped to strings off-chain for localization
- 100 LOVE minting fee (50% burned, 50% to treasury)
- 50 LOVE transfer fee (to contract owner)

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

## Character Traits

CharacterNFT stores occupation and personality as uint8 IDs (0-9) for gas efficiency. Frontend applications map these IDs to localized strings.

### Occupation IDs (0-9)
Artist • Engineer • Teacher • Doctor • Chef • Writer • Musician • Designer • Dancer • Photographer

### Personality IDs (0-9)
Cheerful • Shy • Confident • Caring • Adventurous • Thoughtful • Playful • Mysterious • Witty • Gentle

### Rarity Distribution
- Each trait: 10% chance (equal probability for MVP)
- Total unique combinations: 10 × 10 = 100 possible trait pairs
- Benefits: Gas efficient (1 byte vs 20+ bytes), verifiable on-chain, localizable off-chain

## Deployed Contracts

### Base Sepolia Testnet

- **LoveToken**: `0x2e19274a399F5510e185b61f78D8eDFFccc05d88`
- **LoveTokenFaucet**: `0x14C5Aa3F8b0fE5D7792E57D6ace8bA2e0c852b31`
- **CharacterNFT (Proxy)**: `0x93Fa2e1aB3D639F8005e94b65350FE34Cd894f08`

View on Basescan:
- [LoveToken](https://sepolia.basescan.org/address/0x2e19274a399F5510e185b61f78D8eDFFccc05d88)
- [LoveTokenFaucet](https://sepolia.basescan.org/address/0x14C5Aa3F8b0fE5D7792E57D6ace8bA2e0c852b31)
- [CharacterNFT](https://sepolia.basescan.org/address/0x93Fa2e1aB3D639F8005e94b65350FE34Cd894f08)

**Note:** CharacterNFT uses UUPS proxy pattern. Always use the proxy address (above) in your frontend, not the implementation address.

### Base Mainnet (Production)

Not yet deployed.

## Technology Stack

- **Solidity 0.8.x**
- **Hardhat** - Development environment
- **OpenZeppelin** - ERC-20 and ERC-721 implementations
- **OpenZeppelin Upgrades** - UUPS proxy pattern for CharacterNFT
- **Base Sepolia** - Testnet deployment (MVP)
- **Base Mainnet** - Production deployment

## Upgradeability

CharacterNFT uses **UUPS (Universal Upgradeable Proxy Standard)** for upgradeability:

- **Proxy address never changes** - Users' NFTs remain at the same address
- **Only owner can upgrade** - Requires contract owner authorization
- **All character data preserved** - No data loss during upgrades
- **Storage layout safety** - See `STORAGE_LAYOUT.md` for detailed upgrade rules

### Critical Upgrade Rules
1. Never reorder existing state variables
2. Never change types of existing variables
3. Always add new variables after existing ones
4. Always reduce storage gap when adding new variables

For detailed storage layout documentation and upgrade checklist, see [`STORAGE_LAYOUT.md`](./STORAGE_LAYOUT.md).

## Deployment

### Setup
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

### Environment Variables
Create a `.env` file:
```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here

# Only required for NFT-only deployment
LOVE_TOKEN_ADDRESS=0x...
```

### Deploy All Contracts
Deploy LoveToken, Faucet, and CharacterNFT together:
```bash
npm run deploy:all
```

This deploys:
1. LoveToken (ERC-20)
2. LoveTokenFaucet
3. CharacterNFT (UUPS Proxy)
4. Funds faucet with 100M LOVE tokens

### Deploy CharacterNFT Only
If LoveToken already exists, deploy only CharacterNFT:
```bash
# Set LOVE_TOKEN_ADDRESS in .env first
npm run deploy:nft
```

**Important:** Use the **proxy address** (not implementation address) in your frontend.

### Verify Contracts
After deployment, verify on BaseScan:
```bash
# Verify LoveToken
npx hardhat verify --network baseSepolia <LOVE_TOKEN_ADDRESS>

# Verify Faucet
npx hardhat verify --network baseSepolia <FAUCET_ADDRESS> <LOVE_TOKEN_ADDRESS>

# Verify CharacterNFT Implementation
npx hardhat verify --network baseSepolia <IMPLEMENTATION_ADDRESS>
```

Note: Proxy contracts are auto-verified by OpenZeppelin Hardhat Upgrades plugin.

### Local Testing
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy locally
npm run deploy:all:local
```

## License

All Rights Reserved

Copyright (c) 2025 Love Diary Team

This software and associated documentation files (the "Software") are proprietary and confidential. Unauthorized copying, modification, distribution, or use of this Software, via any medium, is strictly prohibited without explicit written permission from the copyright holder.

## Contributing

This project is being developed for ETHOnline Hackathon. Contributions are currently limited to the Love Diary Team.

## Contact

For questions or collaboration inquiries, please reach out to the development team.
