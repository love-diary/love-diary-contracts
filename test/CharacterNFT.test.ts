import { expect } from "chai";
import { ethers } from "hardhat";
import { LoveToken, CharacterNFT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CharacterNFT", function () {
  let loveToken: LoveToken;
  let characterNFT: CharacterNFT;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;

  const MINT_COST = ethers.parseEther("100");
  const TRANSFER_FEE = ethers.parseEther("50");
  const INITIAL_BALANCE = ethers.parseEther("1000");

  // Enum values
  const Gender = { Male: 0, Female: 1, NonBinary: 2 };
  const SexualOrientation = { Straight: 0, SameGender: 1, Bisexual: 2, Pansexual: 3, Asexual: 4 };
  const Language = { EN: 0 };

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy LoveToken
    const LoveTokenFactory = await ethers.getContractFactory("LoveToken");
    loveToken = await LoveTokenFactory.deploy();
    await loveToken.waitForDeployment();

    // Deploy CharacterNFT
    const CharacterNFTFactory = await ethers.getContractFactory("CharacterNFT");
    characterNFT = await CharacterNFTFactory.deploy(await loveToken.getAddress());
    await characterNFT.waitForDeployment();

    // Give addr1 some tokens for testing
    await loveToken.transfer(addr1.address, INITIAL_BALANCE);

    // Approve CharacterNFT to spend tokens
    await loveToken.connect(addr1).approve(await characterNFT.getAddress(), ethers.MaxUint256);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await characterNFT.name()).to.equal("Love Diary Character");
      expect(await characterNFT.symbol()).to.equal("LDC");
    });

    it("Should set the correct LOVE token address", async function () {
      expect(await characterNFT.loveToken()).to.equal(await loveToken.getAddress());
    });

    it("Should set the correct mint cost and transfer fee", async function () {
      expect(await characterNFT.MINT_COST()).to.equal(MINT_COST);
      expect(await characterNFT.TRANSFER_FEE()).to.equal(TRANSFER_FEE);
    });

    it("Should start with zero total supply", async function () {
      expect(await characterNFT.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should mint a character and burn LOVE tokens", async function () {
      const initialBalance = await loveToken.balanceOf(addr1.address);

      const tx = await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Bisexual, Language.EN);
      await tx.wait();

      // Check NFT ownership
      expect(await characterNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await characterNFT.totalSupply()).to.equal(1);

      // Check LOVE tokens were burned
      expect(await loveToken.balanceOf(addr1.address)).to.equal(initialBalance - MINT_COST);
    });

    it("Should emit CharacterMinted event", async function () {
      await expect(characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Bisexual, Language.EN))
        .to.emit(characterNFT, "CharacterMinted");
    });

    it("Should create character with valid attributes", async function () {
      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Bisexual, 0);

      const character = await characterNFT.getCharacter(0);

      expect(character.name).to.equal("Emma");
      expect(character.birthYear).to.be.at.least(1995).and.at.most(2007);
      expect(character.gender).to.equal(Gender.Female);
      expect(character.sexualOrientation).to.equal(SexualOrientation.Bisexual);
      expect(character.occupationId).to.be.at.least(0).and.at.most(9);
      expect(character.personalityId).to.be.at.least(0).and.at.most(9);
      expect(character.language).to.equal(0); // Language.EN
      expect(character.mintedAt).to.be.greaterThan(0);
    });

    it("Should allow minting multiple characters", async function () {
      await characterNFT.connect(addr1).mint("Alex", Gender.Male, SexualOrientation.SameGender, Language.EN);
      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.SameGender, Language.EN);

      const char0 = await characterNFT.getCharacter(0);
      const char1 = await characterNFT.getCharacter(1);

      expect(char0.name).to.equal("Alex");
      expect(char1.name).to.equal("Emma");
    });

    it("Should increment token IDs sequentially", async function () {
      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Straight, Language.EN);
      await characterNFT.connect(addr1).mint("Alex", Gender.Male, SexualOrientation.Bisexual, Language.EN);
      await characterNFT.connect(addr1).mint("Sam", Gender.NonBinary, SexualOrientation.Pansexual, Language.EN);

      expect(await characterNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await characterNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await characterNFT.ownerOf(2)).to.equal(addr1.address);
      expect(await characterNFT.totalSupply()).to.equal(3);
    });

    it("Should fail if insufficient LOVE tokens", async function () {
      await expect(
        characterNFT.connect(addr2).mint("Emma", Gender.Female, SexualOrientation.Straight, Language.EN)
      ).to.be.reverted;
    });

    it("Should fail if LOVE token approval not given", async function () {
      await loveToken.transfer(addr2.address, MINT_COST);

      await expect(
        characterNFT.connect(addr2).mint("Alex", Gender.Male, SexualOrientation.SameGender, Language.EN)
      ).to.be.reverted;
    });

    it("Should allow multiple characters from same address", async function () {
      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Asexual, Language.EN);
      await characterNFT.connect(addr1).mint("Alex", Gender.Male, SexualOrientation.Straight, Language.EN);

      expect(await characterNFT.balanceOf(addr1.address)).to.equal(2);
    });

    it("Should handle all gender and sexual orientation combinations", async function () {
      // Test Male
      await characterNFT.connect(addr1).mint("Alex", Gender.Male, SexualOrientation.Straight, Language.EN);
      let char = await characterNFT.getCharacter(0);
      expect(char.gender).to.equal(Gender.Male);
      expect(char.sexualOrientation).to.equal(SexualOrientation.Straight);

      // Test Female
      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.SameGender, Language.EN);
      char = await characterNFT.getCharacter(1);
      expect(char.gender).to.equal(Gender.Female);
      expect(char.sexualOrientation).to.equal(SexualOrientation.SameGender);

      // Test NonBinary
      await characterNFT.connect(addr1).mint("Sam", Gender.NonBinary, SexualOrientation.Pansexual, Language.EN);
      char = await characterNFT.getCharacter(2);
      expect(char.gender).to.equal(Gender.NonBinary);
      expect(char.sexualOrientation).to.equal(SexualOrientation.Pansexual);
    });
  });

  describe("Character Data", function () {
    beforeEach(async function () {
      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Bisexual, Language.EN);
    });

    it("Should return character data for valid token ID", async function () {
      const character = await characterNFT.getCharacter(0);

      expect(character.name).to.equal("Emma");
      expect(character.birthYear).to.be.at.least(1995);
      expect(character.gender).to.equal(Gender.Female);
      expect(character.sexualOrientation).to.equal(SexualOrientation.Bisexual);
      expect(character.occupationId).to.be.at.least(0).and.at.most(9);
      expect(character.personalityId).to.be.at.least(0).and.at.most(9);
    });

    it("Should fail to get character data for non-existent token", async function () {
      await expect(
        characterNFT.getCharacter(999)
      ).to.be.reverted;
    });

    it("Should return tokenURI for valid token", async function () {
      const uri = await characterNFT.tokenURI(0);
      expect(uri).to.include("https://lovediary.game/api/character/0");
    });

    it("Should fail to get tokenURI for non-existent token", async function () {
      await expect(
        characterNFT.tokenURI(999)
      ).to.be.reverted;
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Bisexual, Language.EN);

      // Give addr1 more tokens for transfer fees
      await loveToken.transfer(addr1.address, TRANSFER_FEE * 5n);
    });

    it("Should transfer character with fee using transferFrom", async function () {
      const ownerBalanceBefore = await loveToken.balanceOf(owner.address);

      await characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0);

      expect(await characterNFT.ownerOf(0)).to.equal(addr2.address);
      expect(await loveToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore + TRANSFER_FEE);
    });

    it("Should transfer character with fee using safeTransferFrom", async function () {
      const ownerBalanceBefore = await loveToken.balanceOf(owner.address);

      await characterNFT.connect(addr1)["safeTransferFrom(address,address,uint256)"](
        addr1.address,
        addr2.address,
        0
      );

      expect(await characterNFT.ownerOf(0)).to.equal(addr2.address);
      expect(await loveToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore + TRANSFER_FEE);
    });

    it("Should emit CharacterTransferred event", async function () {
      await expect(
        characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0)
      ).to.emit(characterNFT, "CharacterTransferred")
        .withArgs(0, addr1.address, addr2.address, TRANSFER_FEE);
    });

    it("Should fail transfer without sufficient LOVE tokens", async function () {
      // Transfer all tokens away
      const balance = await loveToken.balanceOf(addr1.address);
      await loveToken.connect(addr1).transfer(owner.address, balance);

      await expect(
        characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0)
      ).to.be.reverted;
    });

    it("Should fail transfer without LOVE token approval", async function () {
      // Remove approval
      await loveToken.connect(addr1).approve(await characterNFT.getAddress(), 0);

      await expect(
        characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0)
      ).to.be.reverted;
    });

    it("Should preserve character data after transfer", async function () {
      const charBefore = await characterNFT.getCharacter(0);

      await characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0);

      const charAfter = await characterNFT.getCharacter(0);

      expect(charAfter.name).to.equal(charBefore.name);
      expect(charAfter.birthYear).to.equal(charBefore.birthYear);
      expect(charAfter.gender).to.equal(charBefore.gender);
      expect(charAfter.sexualOrientation).to.equal(charBefore.sexualOrientation);
      expect(charAfter.occupationId).to.equal(charBefore.occupationId);
      expect(charAfter.personalityId).to.equal(charBefore.personalityId);
      expect(charAfter.language).to.equal(charBefore.language);
    });

    it("Should allow multiple transfers of same NFT", async function () {
      // Transfer to addr2
      await characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0);

      // Setup addr2 with tokens and approval
      await loveToken.transfer(addr2.address, TRANSFER_FEE);
      await loveToken.connect(addr2).approve(await characterNFT.getAddress(), ethers.MaxUint256);

      // Transfer back to addr1
      await characterNFT.connect(addr2).transferFrom(addr2.address, addr1.address, 0);

      expect(await characterNFT.ownerOf(0)).to.equal(addr1.address);
    });
  });

  describe("ERC-721 Standard Compliance", function () {
    beforeEach(async function () {
      await characterNFT.connect(addr1).mint("Alex", Gender.Male, SexualOrientation.Straight, Language.EN);
    });

    it("Should support ERC-721 interface", async function () {
      const ERC721InterfaceId = "0x80ac58cd";
      expect(await characterNFT.supportsInterface(ERC721InterfaceId)).to.be.true;
    });

    it("Should return correct balance", async function () {
      expect(await characterNFT.balanceOf(addr1.address)).to.equal(1);

      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.SameGender, Language.EN);
      expect(await characterNFT.balanceOf(addr1.address)).to.equal(2);
    });

    it("Should allow approved address to transfer", async function () {
      await characterNFT.connect(addr1).approve(addr2.address, 0);

      // Give addr2 tokens for fee
      await loveToken.transfer(addr2.address, TRANSFER_FEE);
      await loveToken.connect(addr2).approve(await characterNFT.getAddress(), ethers.MaxUint256);

      await characterNFT.connect(addr2).transferFrom(addr1.address, addr2.address, 0);

      expect(await characterNFT.ownerOf(0)).to.equal(addr2.address);
    });

    it("Should allow operator to transfer all tokens", async function () {
      await characterNFT.connect(addr1).mint("Sam", Gender.NonBinary, SexualOrientation.Pansexual, Language.EN); // Mint second NFT

      await characterNFT.connect(addr1).setApprovalForAll(addr2.address, true);

      // Give addr2 tokens for fees
      await loveToken.transfer(addr2.address, TRANSFER_FEE * 2n);
      await loveToken.connect(addr2).approve(await characterNFT.getAddress(), ethers.MaxUint256);

      await characterNFT.connect(addr2).transferFrom(addr1.address, addr2.address, 0);
      await characterNFT.connect(addr2).transferFrom(addr1.address, addr2.address, 1);

      expect(await characterNFT.balanceOf(addr2.address)).to.equal(2);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minting when contract has existing LOVE balance", async function () {
      // Send some LOVE to contract directly
      await loveToken.transfer(await characterNFT.getAddress(), ethers.parseEther("50"));

      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Asexual, Language.EN);

      expect(await characterNFT.ownerOf(0)).to.equal(addr1.address);
    });

    it("Should generate different characters with same parameters", async function () {
      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Bisexual, Language.EN);

      // Mine a block
      await ethers.provider.send("evm_mine", []);

      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Bisexual, Language.EN);

      const char0 = await characterNFT.getCharacter(0);
      const char1 = await characterNFT.getCharacter(1);

      // At least one attribute should be different due to block.timestamp change
      const isDifferent =
        char0.birthYear !== char1.birthYear ||
        char0.occupationId !== char1.occupationId ||
        char0.personalityId !== char1.personalityId;

      expect(isDifferent).to.be.true;
    });
  });

  describe("Bonding", function () {
    beforeEach(async function () {
      await characterNFT.connect(addr1).mint("Emma", Gender.Female, SexualOrientation.Bisexual, Language.EN);
    });

    it("Should start unbonded after minting", async function () {
      expect(await characterNFT.isBonded(0)).to.be.false;
    });

    it("Should allow owner to bond with character", async function () {
      await characterNFT.connect(addr1).bond(0);
      expect(await characterNFT.isBonded(0)).to.be.true;
    });

    it("Should emit CharacterBonded event", async function () {
      await expect(characterNFT.connect(addr1).bond(0))
        .to.emit(characterNFT, "CharacterBonded")
        .withArgs(0, addr1.address);
    });

    it("Should fail if non-owner tries to bond", async function () {
      await expect(
        characterNFT.connect(addr2).bond(0)
      ).to.be.revertedWith("Not the owner");
    });

    it("Should fail if already bonded", async function () {
      await characterNFT.connect(addr1).bond(0);

      await expect(
        characterNFT.connect(addr1).bond(0)
      ).to.be.revertedWith("Already bonded");
    });

    it("Should fail to check bond status for non-existent token", async function () {
      await expect(
        characterNFT.isBonded(999)
      ).to.be.reverted;
    });

    it("Should preserve bonded status after transfer", async function () {
      // Bond first
      await characterNFT.connect(addr1).bond(0);
      expect(await characterNFT.isBonded(0)).to.be.true;

      // Transfer
      await loveToken.transfer(addr1.address, TRANSFER_FEE);
      await characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0);

      // Bond status should persist
      expect(await characterNFT.isBonded(0)).to.be.true;
      expect(await characterNFT.ownerOf(0)).to.equal(addr2.address);
    });

    it("Should not allow new owner to bond already bonded character", async function () {
      // Bond as addr1
      await characterNFT.connect(addr1).bond(0);

      // Transfer to addr2
      await loveToken.transfer(addr1.address, TRANSFER_FEE);
      await characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0);

      // addr2 should not be able to bond
      await expect(
        characterNFT.connect(addr2).bond(0)
      ).to.be.revertedWith("Already bonded");
    });

    it("Should allow new owner to bond unbonded character after transfer", async function () {
      // Transfer without bonding
      await loveToken.transfer(addr1.address, TRANSFER_FEE);
      await characterNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0);

      // New owner should be able to bond
      await characterNFT.connect(addr2).bond(0);
      expect(await characterNFT.isBonded(0)).to.be.true;
    });

    it("Should handle multiple characters with different bond states", async function () {
      // Mint second character
      await characterNFT.connect(addr1).mint("Alex", Gender.Male, SexualOrientation.Straight, Language.EN);

      // Bond only the first one
      await characterNFT.connect(addr1).bond(0);

      expect(await characterNFT.isBonded(0)).to.be.true;
      expect(await characterNFT.isBonded(1)).to.be.false;
    });

    it("Should preserve character data after bonding", async function () {
      const charBefore = await characterNFT.getCharacter(0);

      await characterNFT.connect(addr1).bond(0);

      const charAfter = await characterNFT.getCharacter(0);

      // All character data should remain the same
      expect(charAfter.name).to.equal(charBefore.name);
      expect(charAfter.birthYear).to.equal(charBefore.birthYear);
      expect(charAfter.gender).to.equal(charBefore.gender);
      expect(charAfter.sexualOrientation).to.equal(charBefore.sexualOrientation);
      expect(charAfter.occupationId).to.equal(charBefore.occupationId);
      expect(charAfter.personalityId).to.equal(charBefore.personalityId);
      expect(charAfter.language).to.equal(charBefore.language);
      expect(charAfter.mintedAt).to.equal(charBefore.mintedAt);

      // Only isBonded should change
      expect(charAfter.isBonded).to.be.true;
      expect(charBefore.isBonded).to.be.false;
    });
  });
});
