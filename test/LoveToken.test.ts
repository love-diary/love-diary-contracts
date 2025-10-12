import { expect } from "chai";
import { ethers } from "hardhat";
import { LoveToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LoveToken", function () {
  let loveToken: LoveToken;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;

  const INITIAL_SUPPLY = ethers.parseEther("1000000000"); // 1 billion tokens

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy LoveToken contract
    const LoveTokenFactory = await ethers.getContractFactory("LoveToken");
    loveToken = await LoveTokenFactory.deploy();
    await loveToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await loveToken.name()).to.equal("Love Token");
      expect(await loveToken.symbol()).to.equal("LOVE");
    });

    it("Should mint initial supply to owner", async function () {
      const ownerBalance = await loveToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(INITIAL_SUPPLY);
    });

    it("Should have correct total supply", async function () {
      const totalSupply = await loveToken.totalSupply();
      expect(totalSupply).to.equal(INITIAL_SUPPLY);
    });

    it("Should set the correct owner", async function () {
      expect(await loveToken.owner()).to.equal(owner.address);
    });

    it("Should have 18 decimals", async function () {
      expect(await loveToken.decimals()).to.equal(18);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("100");

      await loveToken.transfer(addr1.address, transferAmount);
      expect(await loveToken.balanceOf(addr1.address)).to.equal(transferAmount);

      await loveToken.connect(addr1).transfer(addr2.address, transferAmount);
      expect(await loveToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await loveToken.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await loveToken.balanceOf(owner.address);
      const transferAmount = ethers.parseEther("1");

      await expect(
        loveToken.connect(addr1).transfer(owner.address, transferAmount)
      ).to.be.reverted;

      expect(await loveToken.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });

    it("Should update balances after transfers", async function () {
      const transferAmount = ethers.parseEther("100");
      const initialOwnerBalance = await loveToken.balanceOf(owner.address);

      await loveToken.transfer(addr1.address, transferAmount);
      await loveToken.transfer(addr2.address, transferAmount);

      const finalOwnerBalance = await loveToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(
        initialOwnerBalance - transferAmount * 2n
      );

      expect(await loveToken.balanceOf(addr1.address)).to.equal(transferAmount);
      expect(await loveToken.balanceOf(addr2.address)).to.equal(transferAmount);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint new tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      const initialSupply = await loveToken.totalSupply();

      await loveToken.mint(addr1.address, mintAmount);

      expect(await loveToken.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await loveToken.totalSupply()).to.equal(initialSupply + mintAmount);
    });

    it("Should fail if non-owner tries to mint", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(
        loveToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(loveToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to mint to multiple addresses", async function () {
      const mintAmount = ethers.parseEther("500");

      await loveToken.mint(addr1.address, mintAmount);
      await loveToken.mint(addr2.address, mintAmount);

      expect(await loveToken.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await loveToken.balanceOf(addr2.address)).to.equal(mintAmount);
    });
  });

  describe("Burning", function () {
    it("Should allow owner to burn their tokens", async function () {
      const burnAmount = ethers.parseEther("1000");
      const initialSupply = await loveToken.totalSupply();
      const initialBalance = await loveToken.balanceOf(owner.address);

      await loveToken.burn(burnAmount);

      expect(await loveToken.balanceOf(owner.address)).to.equal(
        initialBalance - burnAmount
      );
      expect(await loveToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should allow anyone to burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialSupply = await loveToken.totalSupply();

      // Transfer tokens to addr1
      await loveToken.transfer(addr1.address, burnAmount);

      // addr1 should be able to burn their own tokens
      await loveToken.connect(addr1).burn(burnAmount);

      expect(await loveToken.balanceOf(addr1.address)).to.equal(0);
      expect(await loveToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should fail if trying to burn more tokens than balance", async function () {
      const ownerBalance = await loveToken.balanceOf(owner.address);
      const burnAmount = ownerBalance + ethers.parseEther("1");

      await expect(loveToken.burn(burnAmount)).to.be.reverted;
    });

    it("Should fail if trying to burn with zero balance", async function () {
      const burnAmount = ethers.parseEther("1");

      await expect(
        loveToken.connect(addr1).burn(burnAmount)
      ).to.be.reverted;
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership", async function () {
      await loveToken.transferOwnership(addr1.address);
      expect(await loveToken.owner()).to.equal(addr1.address);
    });

    it("Should fail if non-owner tries to transfer ownership", async function () {
      await expect(
        loveToken.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWithCustomError(loveToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow new owner to mint after ownership transfer", async function () {
      const mintAmount = ethers.parseEther("1000");

      await loveToken.transferOwnership(addr1.address);
      await loveToken.connect(addr1).mint(addr2.address, mintAmount);

      expect(await loveToken.balanceOf(addr2.address)).to.equal(mintAmount);
    });
  });

  describe("Game Economics", function () {
    it("Should handle character minting cost (100 LOVE)", async function () {
      const mintingCost = ethers.parseEther("100");

      await loveToken.transfer(addr1.address, mintingCost);
      expect(await loveToken.balanceOf(addr1.address)).to.equal(mintingCost);

      // Simulate character minting by burning tokens
      const initialSupply = await loveToken.totalSupply();
      await loveToken.burn(mintingCost);
      expect(await loveToken.totalSupply()).to.equal(initialSupply - mintingCost);
    });

    it("Should handle character transfer fee (50 LOVE)", async function () {
      const transferFee = ethers.parseEther("50");

      await loveToken.transfer(addr1.address, transferFee);
      expect(await loveToken.balanceOf(addr1.address)).to.equal(transferFee);
    });

    it("Should handle gift purchases (10-100 LOVE)", async function () {
      const smallGift = ethers.parseEther("10");
      const mediumGift = ethers.parseEther("50");
      const largeGift = ethers.parseEther("100");

      const totalGifts = smallGift + mediumGift + largeGift;

      await loveToken.transfer(addr1.address, totalGifts);
      expect(await loveToken.balanceOf(addr1.address)).to.equal(totalGifts);

      // Simulate gift purchases
      await loveToken.connect(addr1).transfer(addr2.address, smallGift);
      await loveToken.connect(addr1).transfer(addr2.address, mediumGift);
      await loveToken.connect(addr1).transfer(addr2.address, largeGift);

      expect(await loveToken.balanceOf(addr2.address)).to.equal(totalGifts);
      expect(await loveToken.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should handle daily login reward (5 LOVE)", async function () {
      const dailyReward = ethers.parseEther("5");

      // Simulate 7 days of daily rewards
      for (let i = 0; i < 7; i++) {
        await loveToken.mint(addr1.address, dailyReward);
      }

      expect(await loveToken.balanceOf(addr1.address)).to.equal(
        dailyReward * 7n
      );
    });

    it("Should handle faucet claim (1000 LOVE)", async function () {
      const faucetAmount = ethers.parseEther("1000");

      await loveToken.transfer(addr1.address, faucetAmount);
      expect(await loveToken.balanceOf(addr1.address)).to.equal(faucetAmount);
    });
  });
});
