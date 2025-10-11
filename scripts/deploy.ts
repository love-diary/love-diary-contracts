import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy LoveToken
  console.log("Deploying LoveToken...");
  const LoveToken = await ethers.getContractFactory("LoveToken");
  const loveToken = await LoveToken.deploy();
  await loveToken.waitForDeployment();

  // Wait for a few confirmations to ensure contract code is available
  const deployTx = loveToken.deploymentTransaction();
  if (deployTx) {
    console.log("Waiting for confirmations...");
    await deployTx.wait(2); // Wait for 2 block confirmations
  }

  const loveTokenAddress = await loveToken.getAddress();
  console.log("✓ LoveToken deployed to:", loveTokenAddress);

  // Get token info
  const name = await loveToken.name();
  const symbol = await loveToken.symbol();
  const totalSupply = await loveToken.totalSupply();
  console.log(`  Name: ${name}`);
  console.log(`  Symbol: ${symbol}`);
  console.log(`  Total Supply: ${ethers.formatEther(totalSupply)} LOVE\n`);

  // Deploy LoveTokenFaucet
  console.log("Deploying LoveTokenFaucet...");
  const LoveTokenFaucet = await ethers.getContractFactory("LoveTokenFaucet");
  const faucet = await LoveTokenFaucet.deploy(loveTokenAddress);
  await faucet.waitForDeployment();

  // Wait for confirmations
  const faucetDeployTx = faucet.deploymentTransaction();
  if (faucetDeployTx) {
    console.log("Waiting for confirmations...");
    await faucetDeployTx.wait(2);
  }

  const faucetAddress = await faucet.getAddress();
  console.log("✓ LoveTokenFaucet deployed to:", faucetAddress);

  const claimAmount = await faucet.CLAIM_AMOUNT();
  const cooldown = await faucet.CLAIM_COOLDOWN();
  console.log(`  Claim Amount: ${ethers.formatEther(claimAmount)} LOVE`);
  console.log(`  Cooldown: ${cooldown.toString()} seconds (1 hour)\n`);

  // Fund the faucet with 10 million LOVE tokens
  const fundAmount = ethers.parseEther("10000000"); // 10M LOVE
  console.log("Funding faucet with", ethers.formatEther(fundAmount), "LOVE...");

  const approveTx = await loveToken.approve(faucetAddress, fundAmount);
  await approveTx.wait();
  console.log("✓ Approved faucet to spend tokens");

  const fundTx = await faucet.fundFaucet(fundAmount);
  await fundTx.wait();
  console.log("✓ Faucet funded successfully");

  const faucetBalance = await loveToken.balanceOf(faucetAddress);
  console.log(`  Faucet balance: ${ethers.formatEther(faucetBalance)} LOVE\n`);

  // Display deployment summary
  console.log("═══════════════════════════════════════════════════════");
  console.log("DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("");
  console.log("LoveToken:", loveTokenAddress);
  console.log("LoveTokenFaucet:", faucetAddress);
  console.log("");
  console.log("Faucet Stats:");
  console.log("  - Funded with:", ethers.formatEther(faucetBalance), "LOVE");
  console.log("  - Can support:", Number(faucetBalance / claimAmount), "claims");
  console.log("  - Claim amount:", ethers.formatEther(claimAmount), "LOVE");
  console.log("  - Cooldown: 1 hour");
  console.log("═══════════════════════════════════════════════════════");
  console.log("");
  console.log("To verify contracts on Basescan, run:");
  console.log(`npx hardhat verify --network baseSepolia ${loveTokenAddress}`);
  console.log(`npx hardhat verify --network baseSepolia ${faucetAddress} ${loveTokenAddress}`);
  console.log("");
  console.log("Save these addresses for your frontend:");
  console.log(`LOVE_TOKEN_ADDRESS=${loveTokenAddress}`);
  console.log(`FAUCET_ADDRESS=${faucetAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
