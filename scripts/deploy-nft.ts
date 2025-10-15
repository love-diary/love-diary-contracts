import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("🎭 CharacterNFT Deployment (UUPS Proxy)");
  console.log("========================================\n");
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get LOVE token address from environment variable
  const loveTokenAddress = process.env.LOVE_TOKEN_ADDRESS;

  if (!loveTokenAddress) {
    console.error("❌ Error: LOVE_TOKEN_ADDRESS not found in environment variables");
    console.log("\nPlease set LOVE_TOKEN_ADDRESS in your .env file:");
    console.log("LOVE_TOKEN_ADDRESS=0x...\n");
    process.exit(1);
  }

  console.log("📝 Using LoveToken address:", loveTokenAddress);
  console.log();

  // ===================================
  // Deploy CharacterNFT (UUPS Upgradeable Proxy)
  // ===================================
  console.log("📝 Deploying CharacterNFT (UUPS Proxy)...");
  const CharacterNFT = await ethers.getContractFactory("CharacterNFT");

  console.log("   Deploying proxy and implementation...");
  const characterNFT = await upgrades.deployProxy(
    CharacterNFT,
    [loveTokenAddress],
    { kind: 'uups' }
  );

  await characterNFT.waitForDeployment();
  const characterNFTProxyAddress = await characterNFT.getAddress();

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(characterNFTProxyAddress);

  console.log("✅ CharacterNFT Proxy deployed to:", characterNFTProxyAddress);
  console.log("   Implementation deployed to:    ", implementationAddress);

  try {
    const mintCost = await characterNFT.MINT_COST();
    const transferFee = await characterNFT.TRANSFER_FEE();
    const treasury = await characterNFT.treasury();
    const name = await characterNFT.name();
    const symbol = await characterNFT.symbol();

    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Mint cost:", ethers.formatEther(mintCost), "LOVE (50% burn, 50% treasury)");
    console.log("   Transfer fee:", ethers.formatEther(transferFee), "LOVE");
    console.log("   Treasury:", treasury, "(currently set to deployer)");
    console.log("   Pattern: UUPS (Universal Upgradeable Proxy Standard)");
  } catch (error) {
    console.log("   (Configuration will be verified later)");
  }

  console.log();

  // ===================================
  // Deployment Summary
  // ===================================
  console.log("========================================");
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("========================================\n");

  console.log("📋 Contract Addresses:");
  console.log("   LoveToken (existing):    ", loveTokenAddress);
  console.log("   CharacterNFT (Proxy):    ", characterNFTProxyAddress);
  console.log("   CharacterNFT (Impl):     ", implementationAddress);
  console.log();

  console.log("========================================");
  console.log("📝 UPDATE YOUR .env.local FILE:");
  console.log("========================================");
  console.log(`NEXT_PUBLIC_CHARACTER_NFT_ADDRESS=${characterNFTProxyAddress}`);
  console.log();
  console.log("⚠️  IMPORTANT: Use the PROXY address, not implementation!");
  console.log();

  console.log("========================================");
  console.log("🔍 VERIFICATION COMMANDS:");
  console.log("========================================");
  console.log(`# Verify CharacterNFT Implementation`);
  console.log(`npx hardhat verify --network baseSepolia ${implementationAddress}`);
  console.log();
  console.log("Note: Proxy verification is automatic via hardhat-upgrades");
  console.log();

  console.log("========================================");
  console.log("💡 CONTRACT DETAILS:");
  console.log("========================================");
  console.log("Mint Cost: 100 LOVE");
  console.log("  - 50 LOVE (50%) → Burned (deflationary)");
  console.log("  - 50 LOVE (50%) → Treasury");
  console.log();
  console.log("Transfer Fee: 50 LOVE");
  console.log("  - Charged on each NFT transfer");
  console.log("  - Sent to contract owner");
  console.log();
  console.log("Treasury Address:", deployer.address, "(deployer wallet)");
  console.log();
  console.log("💼 Treasury can be changed later:");
  console.log("  - Call setTreasury(newAddress) to update");
  console.log("  - Useful for switching to multi-sig on mainnet");
  console.log();

  console.log("========================================");
  console.log("🔄 UPGRADEABILITY INFO:");
  console.log("========================================");
  console.log("CharacterNFT uses UUPS (Universal Upgradeable Proxy Standard)");
  console.log();
  console.log("To upgrade in the future:");
  console.log("1. Deploy new implementation contract");
  console.log("2. Call upgradeTo(newImplementation) on proxy");
  console.log("3. Only contract owner can upgrade");
  console.log();
  console.log("Benefits:");
  console.log("- Add new features without changing NFT addresses");
  console.log("- Preserve all character data and ownership");
  console.log("- Lower gas costs vs Transparent Proxy");
  console.log();

  console.log("========================================");
  console.log("🎮 NEXT STEPS:");
  console.log("========================================");
  console.log("1. Update frontend .env.local with PROXY address above");
  console.log("2. Run verification command (optional but recommended)");
  console.log("3. Test minting a character!");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
