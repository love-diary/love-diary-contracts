# Character Trait Mappings

This document defines the off-chain string mappings for on-chain numeric trait IDs.

## Overview

The `CharacterNFT` contract stores occupation and personality as uint8 IDs (0-9 for MVP). Frontend applications should map these IDs to localized strings.

## Occupation IDs (0-9)

| ID | English | Chinese (ZH_CN) | Notes |
|----|---------|-----------------|-------|
| 0  | Artist | 艺术家 | Creative, visual arts |
| 1  | Engineer | 工程师 | Technical, problem solver |
| 2  | Teacher | 教师 | Educational, patient |
| 3  | Doctor | 医生 | Medical, caring |
| 4  | Chef | 厨师 | Culinary, creative |
| 5  | Writer | 作家 | Literary, thoughtful |
| 6  | Musician | 音乐家 | Musical, expressive |
| 7  | Designer | 设计师 | Visual, innovative |
| 8  | Dancer | 舞者 | Physical, graceful |
| 9  | Photographer | 摄影师 | Visual, observant |

## Personality IDs (0-9)

| ID | English | Chinese (ZH_CN) | Notes |
|----|---------|-----------------|-------|
| 0  | Cheerful | 开朗 | Positive, energetic |
| 1  | Shy | 害羞 | Reserved, gentle |
| 2  | Confident | 自信 | Assertive, bold |
| 3  | Caring | 体贴 | Compassionate, nurturing |
| 4  | Adventurous | 冒险 | Risk-taking, bold |
| 5  | Thoughtful | 深思熟虑 | Analytical, considerate |
| 6  | Playful | 顽皮 | Fun-loving, humorous |
| 7  | Mysterious | 神秘 | Enigmatic, intriguing |
| 8  | Witty | 机智 | Clever, quick-thinking |
| 9  | Gentle | 温柔 | Soft-spoken, kind |

## Rarity Distribution (MVP)

For MVP, all traits have equal probability (10% each):
- Each occupationId (0-9): 10% chance
- Each personalityId (0-9): 10% chance

### Rarity Combinations
- Common combinations: 10% × 10% = 1% per specific combo
- Total possible combinations: 10 × 10 = 100 unique trait pairs

## Future Expansion

The contract can be upgraded to support more traits:
- Add new contract version with `OCCUPATION_COUNT = 100`
- Use rarity tiers (0-9: Common, 10-89: Uncommon, 90-99: Rare)
- Add more languages in metadata

## Frontend Implementation Example

```typescript
const occupationTraits = {
  en: ["Artist", "Engineer", "Teacher", "Doctor", "Chef", "Writer", "Musician", "Designer", "Dancer", "Photographer"],
  zh_CN: ["艺术家", "工程师", "教师", "医生", "厨师", "作家", "音乐家", "设计师", "舞者", "摄影师"]
};

const personalityTraits = {
  en: ["Cheerful", "Shy", "Confident", "Caring", "Adventurous", "Thoughtful", "Playful", "Mysterious", "Witty", "Gentle"],
  zh_CN: ["开朗", "害羞", "自信", "体贴", "冒险", "深思熟虑", "顽皮", "神秘", "机智", "温柔"]
};

function getOccupation(occupationId: number, language: string = 'en'): string {
  return occupationTraits[language][occupationId];
}

function getPersonality(personalityId: number, language: string = 'en'): string {
  return personalityTraits[language][personalityId];
}

// Usage:
const character = await characterNFT.getCharacter(tokenId);
const occupation = getOccupation(character.occupationId, 'en'); // "Artist"
const personality = getPersonality(character.personalityId, 'zh_CN'); // "开朗"
```

## Verifiable Rarity

Because trait IDs are stored on-chain, users can verify the rarity of their character:

```typescript
// Check on-chain data (fully transparent)
const character = await characterNFT.getCharacter(tokenId);
console.log(`Occupation ID: ${character.occupationId}`); // e.g., 0
console.log(`Personality ID: ${character.personalityId}`); // e.g., 5

// This combination can be proven to be authentic and not manipulated
```

## Benefits

1. **Gas Efficient**: uint8 (1 byte) vs string (>20 bytes)
2. **Verifiable**: On-chain IDs prove rarity
3. **Flexible**: Add new languages without contract changes
4. **Expandable**: Future contracts can add more trait options
5. **Standard**: Same pattern used by CryptoPunks, BAYC, etc.
