import { ethers } from "hardhat";

async function main() {
  console.log("Starting CharacterNFT deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get LoveToken address from environment or use hardcoded value
  const loveTokenAddress = process.env.LOVE_TOKEN_ADDRESS || "0xf614a36b715a1f00bc9450d113d4eefeb0dd6396";

  console.log("Using LoveToken at:", loveTokenAddress);
  console.log("⚠️  Make sure this is the correct address!\n");

  // Verify LoveToken contract exists
  const loveTokenCode = await ethers.provider.getCode(loveTokenAddress);
  if (loveTokenCode === "0x") {
    throw new Error("No contract found at LoveToken address! Please check the address.");
  }
  console.log("✓ LoveToken contract verified\n");

  // Deploy CharacterNFT
  console.log("Deploying CharacterNFT...");
  const CharacterNFT = await ethers.getContractFactory("CharacterNFT");
  const characterNFT = await CharacterNFT.deploy(loveTokenAddress);
  await characterNFT.waitForDeployment();

  // Wait for confirmations
  const deployTx = characterNFT.deploymentTransaction();
  if (deployTx) {
    console.log("Waiting for confirmations...");
    await deployTx.wait(2); // Wait for 2 block confirmations
  }

  const characterNFTAddress = await characterNFT.getAddress();
  console.log("✓ CharacterNFT deployed to:", characterNFTAddress);

  // Get contract info
  const name = await characterNFT.name();
  const symbol = await characterNFT.symbol();
  const mintCost = await characterNFT.MINT_COST();
  const transferFee = await characterNFT.TRANSFER_FEE();
  const occupationCount = await characterNFT.OCCUPATION_COUNT();
  const personalityCount = await characterNFT.PERSONALITY_COUNT();

  console.log(`  Name: ${name}`);
  console.log(`  Symbol: ${symbol}`);
  console.log(`  Mint Cost: ${ethers.formatEther(mintCost)} LOVE`);
  console.log(`  Transfer Fee: ${ethers.formatEther(transferFee)} LOVE`);
  console.log(`  Occupation Types: ${occupationCount}`);
  console.log(`  Personality Types: ${personalityCount}\n`);

  // Display deployment summary
  console.log("═══════════════════════════════════════════════════════");
  console.log("DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("");
  console.log("Contract Addresses:");
  console.log("  LoveToken:", loveTokenAddress);
  console.log("  CharacterNFT:", characterNFTAddress);
  console.log("");
  console.log("CharacterNFT Stats:");
  console.log("  - Mint Cost:", ethers.formatEther(mintCost), "LOVE");
  console.log("  - Transfer Fee:", ethers.formatEther(transferFee), "LOVE");
  console.log("  - Trait Types: 10 occupations × 10 personalities = 100 combos");
  console.log("═══════════════════════════════════════════════════════");
  console.log("");
  console.log("To verify contract on Basescan, run:");
  console.log(`npx hardhat verify --network baseSepolia ${characterNFTAddress} ${loveTokenAddress}`);
  console.log("");
  console.log("Update your frontend .env with:");
  console.log(`NEXT_PUBLIC_CHARACTER_NFT_ADDRESS=${characterNFTAddress}`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Verify the contract on Basescan (command above)");
  console.log("2. Export ABI: copy artifacts/contracts/CharacterNFT.sol/CharacterNFT.json to frontend");
  console.log("3. Update frontend contract addresses");
  console.log("4. Test minting on testnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
