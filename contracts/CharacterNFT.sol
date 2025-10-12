// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LoveToken.sol";

/**
 * @title CharacterNFT
 * @notice ERC-721 NFT representing AI-powered romance game characters
 * @dev Each character has unique attributes for AI agent personality generation
 */
contract CharacterNFT is ERC721, Ownable {
    enum Gender {
        Male,
        Female,
        NonBinary
    }

    enum SexualOrientation {
        Straight,
        SameGender,
        Bisexual,
        Pansexual,
        Asexual
    }

    enum Language {
        EN
    }

    struct Character {
        string name;
        uint16 birthYear;
        Gender gender;
        SexualOrientation sexualOrientation;
        uint8 occupationId;      // 0-9 for MVP (10 occupations)
        uint8 personalityId;     // 0-9 for MVP (10 personalities)
        Language language;
        uint256 mintedAt;
    }

    LoveToken public immutable loveToken;
    address public treasury; // Treasury address for receiving minting fees

    uint256 public constant MINT_COST = 100 * 10**18; // 100 LOVE
    uint256 public constant TRANSFER_FEE = 50 * 10**18; // 50 LOVE

    uint256 private _nextTokenId;
    mapping(uint256 => Character) private _characters;

    // MVP: 10 occupation types (0-9) and 10 personality types (0-9)
    // Off-chain mapping will convert IDs to localized strings
    uint8 public constant OCCUPATION_COUNT = 10;
    uint8 public constant PERSONALITY_COUNT = 10;

    event CharacterMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string name,
        Gender gender,
        SexualOrientation sexualOrientation
    );

    event CharacterTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 fee
    );

    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );

    constructor(address loveTokenAddress) ERC721("Love Diary Character", "LDC") Ownable(msg.sender) {
        loveToken = LoveToken(loveTokenAddress);
        treasury = msg.sender; // Initialize treasury to deployer (can be changed later)
    }

    /**
     * @notice Mint a new character NFT with player-selected attributes and randomized traits
     * @dev Requires 100 LOVE tokens: 50 LOVE burned (deflationary), 50 LOVE to treasury
     * @param name The character's name (player-provided)
     * @param gender The character's gender (Male, Female, NonBinary)
     * @param sexualOrientation The character's sexual orientation
     * @param language The character's preferred language (currently only EN)
     * @return tokenId The ID of the newly minted character
     */
    function mint(
        string calldata name,
        Gender gender,
        SexualOrientation sexualOrientation,
        Language language
    ) external returns (uint256) {
        // Transfer 100 LOVE tokens from minter to this contract
        require(
            loveToken.transferFrom(msg.sender, address(this), MINT_COST),
            "LOVE transfer failed"
        );

        // Calculate split amounts
        uint256 burnAmount = MINT_COST / 2;      // 50 LOVE (50%)
        uint256 treasuryAmount = MINT_COST / 2;  // 50 LOVE (50%)

        // Burn 50 LOVE (deflationary - reduces total supply)
        loveToken.burn(burnAmount);

        // Transfer 50 LOVE to treasury (for faucet, rewards, marketing)
        require(
            loveToken.transfer(treasury, treasuryAmount),
            "Treasury transfer failed"
        );

        // Generate character
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        // Generate randomized attributes (occupation and personality only)
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            tokenId
        )));

        // Store character data directly without intermediate variables to avoid stack too deep
        _characters[tokenId] = Character({
            name: name,
            birthYear: uint16(1995 + (seed % 13)), // Birth year 1995-2007 (age 18-30 in 2025)
            gender: gender,
            sexualOrientation: sexualOrientation,
            occupationId: uint8(seed % OCCUPATION_COUNT),           // Random 0-9
            personalityId: uint8((seed >> 8) % PERSONALITY_COUNT),  // Random 0-9
            language: language,
            mintedAt: block.timestamp
        });

        emit CharacterMinted(tokenId, msg.sender, name, gender, sexualOrientation);

        return tokenId;
    }

    /**
     * @notice Update the treasury address
     * @dev Only owner can call this. Useful for switching to multi-sig later.
     * @param newTreasury The new treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury cannot be zero address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Override internal update function to charge transfer fee
     * @dev This is called by both transferFrom and safeTransferFrom
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Charge transfer fee (except for minting when from is zero address)
        if (from != address(0)) {
            require(
                loveToken.transferFrom(msg.sender, owner(), TRANSFER_FEE),
                "Transfer fee payment failed"
            );
            emit CharacterTransferred(tokenId, from, to, TRANSFER_FEE);
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Get character data for a token ID
     * @param tokenId The NFT token ID
     * @return Character struct with all attributes
     */
    function getCharacter(uint256 tokenId) external view returns (Character memory) {
        require(ownerOf(tokenId) != address(0), "Character does not exist");
        return _characters[tokenId];
    }

    /**
     * @notice Get the total number of minted characters
     * @return Total supply of character NFTs
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Get token URI for metadata
     * @dev Override to provide character metadata
     * For MVP, returns a placeholder. Production would use IPFS.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Character does not exist");

        // Return placeholder URI for MVP
        // Production: point to IPFS or dynamic metadata server
        return string(abi.encodePacked(
            "https://lovediary.game/api/character/",
            _toString(tokenId)
        ));
    }

    /**
     * @dev Helper function to convert uint to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
