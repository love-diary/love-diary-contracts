import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { LoveToken, LoveTokenFaucet } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LoveTokenFaucet", function () {
  let loveToken: LoveToken;
  let faucet: LoveTokenFaucet;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let addr3: HardhatEthersSigner;

  const CLAIM_AMOUNT = ethers.parseEther("10000"); // 10000 LOVE
  const CLAIM_COOLDOWN = 3600; // 1 hour in seconds
  const FAUCET_FUNDING = ethers.parseEther("1000000"); // 1M LOVE for testing

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy LoveToken
    const LoveTokenFactory = await ethers.getContractFactory("LoveToken");
    loveToken = await LoveTokenFactory.deploy();
    await loveToken.waitForDeployment();

    // Deploy Faucet
    const FaucetFactory = await ethers.getContractFactory("LoveTokenFaucet");
    faucet = await FaucetFactory.deploy(await loveToken.getAddress());
    await faucet.waitForDeployment();

    // Fund the faucet
    await loveToken.approve(await faucet.getAddress(), FAUCET_FUNDING);
    await faucet.fundFaucet(FAUCET_FUNDING);
  });

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      expect(await faucet.loveToken()).to.equal(await loveToken.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await faucet.owner()).to.equal(owner.address);
    });

    it("Should have correct claim amount", async function () {
      expect(await faucet.CLAIM_AMOUNT()).to.equal(CLAIM_AMOUNT);
    });

    it("Should have correct cooldown period", async function () {
      expect(await faucet.CLAIM_COOLDOWN()).to.equal(CLAIM_COOLDOWN);
    });

    it("Should fail deployment with zero address", async function () {
      const FaucetFactory = await ethers.getContractFactory("LoveTokenFaucet");
      await expect(
        FaucetFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should have correct initial balance", async function () {
      expect(await faucet.getFaucetBalance()).to.equal(FAUCET_FUNDING);
    });
  });

  describe("Claiming Tokens", function () {
    it("Should allow a user to claim 10000 LOVE tokens", async function () {
      await faucet.connect(addr1).claim();

      expect(await loveToken.balanceOf(addr1.address)).to.equal(CLAIM_AMOUNT);
      expect(await faucet.lastClaimTime(addr1.address)).to.be.greaterThan(0);
    });

    it("Should emit TokensClaimed event", async function () {
      await expect(faucet.connect(addr1).claim())
        .to.emit(faucet, "TokensClaimed")
        .withArgs(addr1.address, CLAIM_AMOUNT);
    });

    it("Should update faucet balance after claim", async function () {
      const balanceBefore = await faucet.getFaucetBalance();

      await faucet.connect(addr1).claim();

      const balanceAfter = await faucet.getFaucetBalance();
      expect(balanceAfter).to.equal(balanceBefore - CLAIM_AMOUNT);
    });

    it("Should prevent claiming during cooldown period", async function () {
      await faucet.connect(addr1).claim();

      await expect(faucet.connect(addr1).claim()).to.be.revertedWith(
        "Claim cooldown not elapsed"
      );
    });

    it("Should allow claiming again after cooldown period", async function () {
      // First claim
      await faucet.connect(addr1).claim();
      expect(await loveToken.balanceOf(addr1.address)).to.equal(CLAIM_AMOUNT);

      // Try to claim immediately - should fail
      await expect(faucet.connect(addr1).claim()).to.be.revertedWith(
        "Claim cooldown not elapsed"
      );

      // Advance time by 1 hour
      await time.increase(CLAIM_COOLDOWN);

      // Second claim should succeed
      await faucet.connect(addr1).claim();
      expect(await loveToken.balanceOf(addr1.address)).to.equal(
        CLAIM_AMOUNT * 2n
      );
    });

    it("Should allow multiple different addresses to claim", async function () {
      await faucet.connect(addr1).claim();
      await faucet.connect(addr2).claim();
      await faucet.connect(addr3).claim();

      expect(await loveToken.balanceOf(addr1.address)).to.equal(CLAIM_AMOUNT);
      expect(await loveToken.balanceOf(addr2.address)).to.equal(CLAIM_AMOUNT);
      expect(await loveToken.balanceOf(addr3.address)).to.equal(CLAIM_AMOUNT);
    });

    it("Should fail if faucet has insufficient balance", async function () {
      // Deploy a new faucet with no funds
      const FaucetFactory = await ethers.getContractFactory("LoveTokenFaucet");
      const emptyFaucet = await FaucetFactory.deploy(
        await loveToken.getAddress()
      );

      await expect(emptyFaucet.connect(addr1).claim()).to.be.revertedWith(
        "Faucet empty"
      );
    });

    it("Should track claim status correctly", async function () {
      expect(await faucet.canClaim(addr1.address)).to.be.true;
      expect(await faucet.getNextClaimTime(addr1.address)).to.equal(0);

      await faucet.connect(addr1).claim();

      expect(await faucet.canClaim(addr1.address)).to.be.false;
      expect(await faucet.getNextClaimTime(addr1.address)).to.be.greaterThan(0);
    });

    it("Should handle partial cooldown period correctly", async function () {
      await faucet.connect(addr1).claim();

      // Advance time by 30 minutes (half cooldown)
      await time.increase(1800);

      // Should still be in cooldown
      expect(await faucet.canClaim(addr1.address)).to.be.false;
      await expect(faucet.connect(addr1).claim()).to.be.revertedWith(
        "Claim cooldown not elapsed"
      );

      // Advance another 30 minutes
      await time.increase(1800);

      // Should now be claimable
      expect(await faucet.canClaim(addr1.address)).to.be.true;
      await faucet.connect(addr1).claim();
    });
  });

  describe("View Functions", function () {
    it("Should return correct canClaim status", async function () {
      // Initially can claim
      expect(await faucet.canClaim(addr1.address)).to.be.true;

      // After claiming, cannot claim
      await faucet.connect(addr1).claim();
      expect(await faucet.canClaim(addr1.address)).to.be.false;

      // After cooldown, can claim again
      await time.increase(CLAIM_COOLDOWN);
      expect(await faucet.canClaim(addr1.address)).to.be.true;
    });

    it("Should return correct next claim time", async function () {
      // Initially should return 0 (can claim now)
      expect(await faucet.getNextClaimTime(addr1.address)).to.equal(0);

      // After claiming, should return future timestamp
      await faucet.connect(addr1).claim();
      const nextClaimTime = await faucet.getNextClaimTime(addr1.address);
      expect(nextClaimTime).to.be.greaterThan(0);

      // After cooldown, should return 0 again
      await time.increase(CLAIM_COOLDOWN);
      expect(await faucet.getNextClaimTime(addr1.address)).to.equal(0);
    });
  });

  describe("Funding Faucet", function () {
    it("Should allow owner to fund the faucet", async function () {
      const fundAmount = ethers.parseEther("100000");
      const balanceBefore = await faucet.getFaucetBalance();

      await loveToken.approve(await faucet.getAddress(), fundAmount);
      await faucet.fundFaucet(fundAmount);

      expect(await faucet.getFaucetBalance()).to.equal(
        balanceBefore + fundAmount
      );
    });

    it("Should emit FaucetFunded event", async function () {
      const fundAmount = ethers.parseEther("100000");

      await loveToken.approve(await faucet.getAddress(), fundAmount);

      await expect(faucet.fundFaucet(fundAmount))
        .to.emit(faucet, "FaucetFunded")
        .withArgs(owner.address, fundAmount);
    });

    it("Should fail if non-owner tries to fund", async function () {
      const fundAmount = ethers.parseEther("100000");

      await loveToken.transfer(addr1.address, fundAmount);
      await loveToken
        .connect(addr1)
        .approve(await faucet.getAddress(), fundAmount);

      await expect(
        faucet.connect(addr1).fundFaucet(fundAmount)
      ).to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount");
    });

    it("Should fail if funding amount is zero", async function () {
      await expect(faucet.fundFaucet(0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });

    it("Should fail if owner hasn't approved tokens", async function () {
      const fundAmount = ethers.parseEther("100000");

      await expect(faucet.fundFaucet(fundAmount)).to.be.reverted;
    });
  });

  describe("Draining Faucet", function () {
    it("Should allow owner to drain faucet", async function () {
      const faucetBalance = await faucet.getFaucetBalance();

      await faucet.drain(addr1.address);

      expect(await loveToken.balanceOf(addr1.address)).to.equal(faucetBalance);
      expect(await faucet.getFaucetBalance()).to.equal(0);
    });

    it("Should emit FaucetDrained event", async function () {
      const faucetBalance = await faucet.getFaucetBalance();

      await expect(faucet.drain(addr1.address))
        .to.emit(faucet, "FaucetDrained")
        .withArgs(addr1.address, faucetBalance);
    });

    it("Should fail if non-owner tries to drain", async function () {
      await expect(
        faucet.connect(addr1).drain(addr1.address)
      ).to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount");
    });

    it("Should fail with zero address recipient", async function () {
      await expect(faucet.drain(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid recipient"
      );
    });

    it("Should fail if faucet is already empty", async function () {
      await faucet.drain(addr1.address);

      await expect(faucet.drain(addr2.address)).to.be.revertedWith(
        "Faucet already empty"
      );
    });
  });

  describe("Token Address Update", function () {
    it("Should allow owner to update token address", async function () {
      const LoveTokenFactory = await ethers.getContractFactory("LoveToken");
      const newToken = await LoveTokenFactory.deploy();
      await newToken.waitForDeployment();

      await faucet.updateTokenAddress(await newToken.getAddress());

      expect(await faucet.loveToken()).to.equal(await newToken.getAddress());
    });

    it("Should fail if non-owner tries to update token address", async function () {
      const LoveTokenFactory = await ethers.getContractFactory("LoveToken");
      const newToken = await LoveTokenFactory.deploy();
      await newToken.waitForDeployment();

      await expect(
        faucet.connect(addr1).updateTokenAddress(await newToken.getAddress())
      ).to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount");
    });

    it("Should fail with zero address", async function () {
      await expect(
        faucet.updateTokenAddress(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle complete faucet lifecycle", async function () {
      // Initial state
      expect(await faucet.getFaucetBalance()).to.equal(FAUCET_FUNDING);

      // User 1 claims
      await faucet.connect(addr1).claim();
      expect(await loveToken.balanceOf(addr1.address)).to.equal(CLAIM_AMOUNT);

      // User 2 claims
      await faucet.connect(addr2).claim();
      expect(await loveToken.balanceOf(addr2.address)).to.equal(CLAIM_AMOUNT);

      // Owner adds more funds
      const additionalFunds = ethers.parseEther("500000");
      await loveToken.approve(await faucet.getAddress(), additionalFunds);
      await faucet.fundFaucet(additionalFunds);

      // User 3 claims
      await faucet.connect(addr3).claim();
      expect(await loveToken.balanceOf(addr3.address)).to.equal(CLAIM_AMOUNT);

      // Advance time for User 1 to claim again
      await time.increase(CLAIM_COOLDOWN);
      await faucet.connect(addr1).claim();
      expect(await loveToken.balanceOf(addr1.address)).to.equal(
        CLAIM_AMOUNT * 2n
      );

      // Owner drains remaining
      await faucet.drain(owner.address);
      expect(await faucet.getFaucetBalance()).to.equal(0);
    });

    it("Should support repeated claiming over multiple hours", async function () {
      // Claim 5 times over 5 hours
      for (let i = 0; i < 5; i++) {
        await faucet.connect(addr1).claim();

        const expectedBalance = CLAIM_AMOUNT * BigInt(i + 1);
        expect(await loveToken.balanceOf(addr1.address)).to.equal(
          expectedBalance
        );

        // Advance time if not the last iteration
        if (i < 4) {
          await time.increase(CLAIM_COOLDOWN);
        }
      }

      // Total claimed: 50,000 LOVE
      expect(await loveToken.balanceOf(addr1.address)).to.equal(
        CLAIM_AMOUNT * 5n
      );
    });

    it("Should handle multiple users with different claim times", async function () {
      // addr1 claims at T=0
      await faucet.connect(addr1).claim();

      // Advance 30 minutes
      await time.increase(1800);

      // addr2 claims at T=30min
      await faucet.connect(addr2).claim();

      // Advance 30 minutes (T=60min)
      await time.increase(1800);

      // addr1 can claim again (1 hour passed)
      await faucet.connect(addr1).claim();

      // addr2 cannot claim yet (only 30 min passed)
      await expect(faucet.connect(addr2).claim()).to.be.revertedWith(
        "Claim cooldown not elapsed"
      );

      // Advance 30 minutes (T=90min)
      await time.increase(1800);

      // Now addr2 can claim
      await faucet.connect(addr2).claim();

      expect(await loveToken.balanceOf(addr1.address)).to.equal(
        CLAIM_AMOUNT * 2n
      );
      expect(await loveToken.balanceOf(addr2.address)).to.equal(
        CLAIM_AMOUNT * 2n
      );
    });
  });

  describe("Edge Cases", function () {
    it("Should handle exact balance for one claim", async function () {
      // Deploy faucet with exactly 10000 LOVE
      const FaucetFactory = await ethers.getContractFactory("LoveTokenFaucet");
      const smallFaucet = await FaucetFactory.deploy(
        await loveToken.getAddress()
      );

      await loveToken.approve(await smallFaucet.getAddress(), CLAIM_AMOUNT);
      await smallFaucet.fundFaucet(CLAIM_AMOUNT);

      // First user should succeed
      await smallFaucet.connect(addr1).claim();
      expect(await loveToken.balanceOf(addr1.address)).to.equal(CLAIM_AMOUNT);

      // Second user should fail (empty faucet)
      await expect(smallFaucet.connect(addr2).claim()).to.be.revertedWith(
        "Faucet empty"
      );
    });

    it("Should handle multiple funding rounds", async function () {
      const fundAmount = ethers.parseEther("50000");

      for (let i = 0; i < 3; i++) {
        await loveToken.approve(await faucet.getAddress(), fundAmount);
        await faucet.fundFaucet(fundAmount);
      }

      const expectedBalance = FAUCET_FUNDING + fundAmount * 3n;
      expect(await faucet.getFaucetBalance()).to.equal(expectedBalance);
    });

    it("Should handle exact cooldown boundary", async function () {
      await faucet.connect(addr1).claim();

      // Advance exactly 1 hour
      await time.increase(CLAIM_COOLDOWN);

      // Should be able to claim
      await faucet.connect(addr1).claim();
      expect(await loveToken.balanceOf(addr1.address)).to.equal(
        CLAIM_AMOUNT * 2n
      );
    });
  });
});
