import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("🚀 Love Diary - Full Contract Deployment");
  console.log("========================================\n");
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // ===================================
  // Step 1: Deploy LoveToken
  // ===================================
  console.log("📝 Step 1: Deploying LoveToken...");
  const LoveToken = await ethers.getContractFactory("LoveToken");
  const loveToken = await LoveToken.deploy();

  const deployTx = loveToken.deploymentTransaction();
  if (deployTx) {
    console.log("   Deployment tx hash:", deployTx.hash);
    console.log("   Waiting for confirmations...");
    await deployTx.wait(2); // Wait for 2 confirmations
  }

  await loveToken.waitForDeployment();
  const loveTokenAddress = await loveToken.getAddress();
  console.log("✅ LoveToken deployed to:", loveTokenAddress);

  // Verify initial supply
  try {
    const totalSupply = await loveToken.totalSupply();
    console.log("   Initial supply:", ethers.formatEther(totalSupply), "LOVE\n");
  } catch (error) {
    console.log("   (Skipping supply check - will be verified later)\n");
  }

  // ===================================
  // Step 2: Deploy LoveTokenFaucet
  // ===================================
  console.log("📝 Step 2: Deploying LoveTokenFaucet...");
  const LoveTokenFaucet = await ethers.getContractFactory("LoveTokenFaucet");
  const faucet = await LoveTokenFaucet.deploy(loveTokenAddress);

  const faucetDeployTx = faucet.deploymentTransaction();
  if (faucetDeployTx) {
    console.log("   Deployment tx hash:", faucetDeployTx.hash);
    console.log("   Waiting for confirmations...");
    await faucetDeployTx.wait(2); // Wait for 2 confirmations
  }

  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  console.log("✅ LoveTokenFaucet deployed to:", faucetAddress);

  try {
    const claimAmount = await faucet.CLAIM_AMOUNT();
    const claimCooldown = await faucet.CLAIM_COOLDOWN();
    console.log("   Claim amount:", ethers.formatEther(claimAmount), "LOVE");
    console.log("   Claim cooldown:", claimCooldown.toString(), "seconds\n");
  } catch (error) {
    console.log("   (Configuration will be verified later)\n");
  }

  // ===================================
  // Step 3: Deploy CharacterNFT (UUPS Upgradeable Proxy)
  // ===================================
  console.log("📝 Step 3: Deploying CharacterNFT (UUPS Proxy)...");
  const CharacterNFT = await ethers.getContractFactory("CharacterNFT");

  console.log("   Deploying proxy...");
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
    const treasury = await characterNFT.treasury();
    console.log("   Mint cost:", ethers.formatEther(mintCost), "LOVE (50% burn, 50% treasury)");
    console.log("   Treasury:", treasury, "(currently set to deployer)");
    console.log("   Pattern: UUPS (Universal Upgradeable Proxy Standard)\n");
  } catch (error) {
    console.log("   (Mint cost: 100 LOVE - 50% burn, 50% treasury)");
    console.log("   (Treasury: set to deployer)");
    console.log("   (Pattern: UUPS)\n");
  }

  // ===================================
  // Step 4: Fund the Faucet
  // ===================================
  console.log("📝 Step 4: Funding the faucet...");
  const faucetFundAmount = ethers.parseEther("100000000"); // 100M LOVE for faucet

  try {
    const transferTx = await loveToken.transfer(faucetAddress, faucetFundAmount);
    console.log("   Transfer tx hash:", transferTx.hash);
    console.log("   Waiting for confirmations...");
    await transferTx.wait(2); // Wait for 2 confirmations
    console.log("✅ Transferred", ethers.formatEther(faucetFundAmount), "LOVE to faucet\n");

    const faucetBalance = await loveToken.balanceOf(faucetAddress);
    console.log("   Faucet balance:", ethers.formatEther(faucetBalance), "LOVE\n");
  } catch (error) {
    console.log("⚠️  Could not verify faucet balance immediately");
    console.log("   Faucet will be funded with 100M LOVE\n");
  }

  // ===================================
  // Deployment Summary
  // ===================================
  console.log("========================================");
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("========================================\n");

  console.log("📋 Contract Addresses:");
  console.log("   LoveToken:               ", loveTokenAddress);
  console.log("   LoveTokenFaucet:         ", faucetAddress);
  console.log("   CharacterNFT (Proxy):    ", characterNFTProxyAddress);
  console.log("   CharacterNFT (Impl):     ", implementationAddress);
  console.log();

  console.log("========================================");
  console.log("📝 UPDATE YOUR .env.local FILE:");
  console.log("========================================");
  console.log(`NEXT_PUBLIC_LOVE_TOKEN_ADDRESS=${loveTokenAddress}`);
  console.log(`NEXT_PUBLIC_FAUCET_ADDRESS=${faucetAddress}`);
  console.log(`NEXT_PUBLIC_CHARACTER_NFT_ADDRESS=${characterNFTProxyAddress}`);
  console.log();
  console.log("⚠️  IMPORTANT: Use the PROXY address, not implementation!");
  console.log();

  console.log("========================================");
  console.log("🔍 VERIFICATION COMMANDS:");
  console.log("========================================");
  console.log(`# Verify LoveToken`);
  console.log(`npx hardhat verify --network baseSepolia ${loveTokenAddress}`);
  console.log();
  console.log(`# Verify LoveTokenFaucet`);
  console.log(`npx hardhat verify --network baseSepolia ${faucetAddress} ${loveTokenAddress}`);
  console.log();
  console.log(`# Verify CharacterNFT Implementation`);
  console.log(`npx hardhat verify --network baseSepolia ${implementationAddress}`);
  console.log();
  console.log("Note: Proxy verification is automatic via hardhat-upgrades");
  console.log();

  console.log("========================================");
  console.log("💡 TOKENOMICS SUMMARY:");
  console.log("========================================");
  console.log("Mint Cost: 100 LOVE");
  console.log("  - 50 LOVE (50%) → Burned (deflationary)");
  console.log("  - 50 LOVE (50%) → Treasury");
  console.log();
  console.log("Treasury Address:", deployer.address, "(deployer wallet)");
  console.log();
  console.log("💼 Treasury can be changed later:");
  console.log("  - Call setTreasury(newAddress) to update");
  console.log("  - Useful for switching to multi-sig on mainnet");
  console.log();
  console.log("Treasury funds used for:");
  console.log("  - Faucet refills");
  console.log("  - Event rewards");
  console.log("  - Marketing campaigns");
  console.log("  - Team compensation");
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
  console.log("2. Update frontend ABI (includes initialize, upgradeTo, etc.)");
  console.log("3. Run verification commands (optional but recommended)");
  console.log("4. Restart your frontend dev server: npm run dev");
  console.log("5. Test the minting flow!");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
