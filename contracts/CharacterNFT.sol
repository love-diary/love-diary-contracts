// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./LoveToken.sol";

/**
 * @title CharacterNFT
 * @notice Upgradeable ERC-721 NFT representing AI-powered romance game characters
 * @dev Each character has unique attributes for AI agent personality generation
 * @dev Uses UUPS upgradeable pattern for future feature additions
 */
contract CharacterNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
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
        uint32 birthTimestamp;   // Unix timestamp for astrology (exact birth date/time)
        Gender gender;
        SexualOrientation sexualOrientation;
        uint8 occupationId;      // 0-9 for MVP (10 occupations)
        uint8 personalityId;     // 0-9 for MVP (10 personalities)
        Language language;
        uint256 mintedAt;
        bool isBonded;           // False when minted, true after bonding (irreversible)
        bytes32 secret;          // Hidden personality trait - thousands of possibilities, not revealed to players
    }

    LoveToken public loveToken;
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

    event CharacterBonded(
        uint256 indexed tokenId,
        address indexed owner
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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract (replaces constructor for upgradeable contracts)
     * @param loveTokenAddress Address of the LOVE token contract
     */
    function initialize(address loveTokenAddress) public initializer {
        __ERC721_init("Love Diary Character", "LDC");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

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

        // Generate randomized attributes (occupation, personality, and secret)
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            tokenId
        )));

        // Generate secret: a unique hidden trait (not revealed to players)
        // Provides thousands of possibilities for AI personality depth
        bytes32 characterSecret = keccak256(abi.encodePacked(
            seed,
            block.number,
            msg.sender,
            name,
            "secret"
        ));

        // Store character data directly without intermediate variables to avoid stack too deep
        _characters[tokenId] = Character({
            name: name,
            birthTimestamp: _generateBirthTimestamp(seed), // Random birth date/time for astrology
            gender: gender,
            sexualOrientation: sexualOrientation,
            occupationId: _generateOccupation(seed),
            personalityId: _generatePersonality(seed),
            language: language,
            mintedAt: block.timestamp,
            isBonded: false,         // Character starts unbonded
            secret: characterSecret  // Hidden trait for AI agent personality depth
        });

        emit CharacterMinted(tokenId, msg.sender, name, gender, sexualOrientation);

        return tokenId;
    }

    /**
     * @notice Bond with a character to initialize it with the current owner
     * @dev Can only be called once by the current owner. This action is irreversible.
     *      Player information (name, gender) is stored off-chain in the agent's memory.
     * @param tokenId The ID of the character NFT to bond with
     */
    function bond(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(!_characters[tokenId].isBonded, "Already bonded");

        // Bond with the character (irreversible)
        _characters[tokenId].isBonded = true;

        emit CharacterBonded(tokenId, msg.sender);
    }

    /**
     * @notice Check if a character is bonded
     * @param tokenId The ID of the character NFT
     * @return bool True if bonded, false if unbonded
     */
    function isBonded(uint256 tokenId) external view returns (bool) {
        require(ownerOf(tokenId) != address(0), "Character does not exist");
        return _characters[tokenId].isBonded;
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
     * @notice Generate birth timestamp for astrology calculations
     * @dev Generates random birth time so character is 21-25 years old at minting time
     * @param seed Random seed for generation
     * @return uint32 Unix timestamp of birth (for zodiac, moon sign, rising sign calculations)
     */
    function _generateBirthTimestamp(uint256 seed) internal view virtual returns (uint32) {
        // Calculate age range in seconds
        uint256 age21 = 21 * 365.25 days; // 21 years in seconds
        uint256 age25 = 25 * 365.25 days; // 25 years in seconds
        uint256 ageRange = age25 - age21; // 4 years range

        // Birth timestamp = current time - random age (21-25 years)
        uint256 birthTime = block.timestamp - age21 - (seed % ageRange);
        return uint32(birthTime);
    }

    /**
     * @notice Generate occupation ID for a character
     * @dev Virtual function - can be overridden in upgrades to implement rarity tiers
     * @param seed Random seed for generation
     * @return uint8 Occupation ID (0 to OCCUPATION_COUNT-1)
     */
    function _generateOccupation(uint256 seed) internal view virtual returns (uint8) {
        return uint8(seed % OCCUPATION_COUNT);
    }

    /**
     * @notice Generate personality ID for a character
     * @dev Virtual function - can be overridden in upgrades to implement rarity tiers
     * @param seed Random seed for generation
     * @return uint8 Personality ID (0 to PERSONALITY_COUNT-1)
     */
    function _generatePersonality(uint256 seed) internal view virtual returns (uint8) {
        // Use different bits from seed to ensure independence from occupation
        return uint8((seed >> 8) % PERSONALITY_COUNT);
    }

    /**
     * @notice Authorize upgrade to new implementation
     * @dev Only owner can authorize upgrades (UUPS pattern)
     * @param newImplementation Address of new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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

    /**
     * @dev Storage gap for future upgrades
     * Reserves 50 storage slots for future state variables
     * IMPORTANT: When adding new state variables in upgrades:
     * 1. Add them AFTER existing variables (never reorder)
     * 2. Reduce __gap array size accordingly
     * 3. Document changes in STORAGE_LAYOUT.md
     */
    uint256[50] private __gap;
}
