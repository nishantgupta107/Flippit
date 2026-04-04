/**
 * Card type definitions and full deck composition
 * @see DEV_PLAN.md §3.1, §3.2
 */

export type CardType =
  | 'NUMBER'
  | 'MODIFIER_MULT'
  | 'MODIFIER_BONUS'
  | 'ACTION_SECOND_CHANCE'
  | 'ACTION_FREEZE'
  | 'ACTION_FLIP_THREE';

export interface Card {
  id: string;
  type: CardType;
  value: number; // 0-12 for NUMBER, 2/4/6/8/10 for BONUS, 2 for MULT, 0 for ACTION
  displayValue?: string; // For display purposes (e.g., "x2", "+4")
}

/**
 * Deck composition per DEV_PLAN.md §3.1
 * Total: 94 cards
 */
export const DECK_COMPOSITION = {
  // Number cards
  numbers: {
    0: 1,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    11: 11,
    12: 12,
  },
  // Modifier cards - Multipliers
  modifiersMult: {
    x2: 2, // Two x2 multiplier cards
  },
  // Modifier cards - Bonus
  modifiersBonus: {
    2: 2,  // Two +2 cards
    4: 2,  // Two +4 cards
    6: 2,  // Two +6 cards
    8: 1,  // One +8 card
    10: 1, // One +10 card
  },
  // Action cards
  actions: {
    SECOND_CHANCE: 2,
    FREEZE: 3,
    FLIP_THREE: 3,
  },
} as const;

/**
 * Generate the full 94-card deck
 * Cards are generated in a deterministic order but should be shuffled before use
 */
export function generateDeck(): Card[] {
  const deck: Card[] = [];
  let cardId = 0;

  // Generate number cards
  for (let value = 0; value <= 12; value++) {
    const count = DECK_COMPOSITION.numbers[value as keyof typeof DECK_COMPOSITION.numbers];
    for (let i = 0; i < count; i++) {
      deck.push({
        id: `num-${cardId++}`,
        type: 'NUMBER',
        value,
        displayValue: value.toString(),
      });
    }
  }

  // Generate multiplier modifier cards (x2)
  for (let i = 0; i < DECK_COMPOSITION.modifiersMult.x2; i++) {
    deck.push({
      id: `mult-${cardId++}`,
      type: 'MODIFIER_MULT',
      value: 2,
      displayValue: 'x2',
    });
  }

  // Generate bonus modifier cards (+2, +4, +6, +8, +10)
  const bonusValues = [2, 4, 6, 8, 10] as const;
  for (const value of bonusValues) {
    const count = DECK_COMPOSITION.modifiersBonus[value as keyof typeof DECK_COMPOSITION.modifiersBonus];
    for (let i = 0; i < count; i++) {
      deck.push({
        id: `bonus-${cardId++}`,
        type: 'MODIFIER_BONUS',
        value,
        displayValue: `+${value}`,
      });
    }
  }

  // Generate action cards - Second Chance
  for (let i = 0; i < DECK_COMPOSITION.actions.SECOND_CHANCE; i++) {
    deck.push({
      id: `action-sc-${cardId++}`,
      type: 'ACTION_SECOND_CHANCE',
      value: 0,
      displayValue: '2nd Chance',
    });
  }

  // Generate action cards - Freeze
  for (let i = 0; i < DECK_COMPOSITION.actions.FREEZE; i++) {
    deck.push({
      id: `action-fr-${cardId++}`,
      type: 'ACTION_FREEZE',
      value: 0,
      displayValue: 'Freeze',
    });
  }

  // Generate action cards - Flip Three
  for (let i = 0; i < DECK_COMPOSITION.actions.FLIP_THREE; i++) {
    deck.push({
      id: `action-ft-${cardId++}`,
      type: 'ACTION_FLIP_THREE',
      value: 0,
      displayValue: 'Flip Three',
    });
  }

  return deck;
}

/**
 * Total number of cards in a complete deck
 */
export const TOTAL_DECK_SIZE = 94;

/**
 * Check if a card is an action card
 */
export function isActionCard(card: Card): boolean {
  return (
    card.type === 'ACTION_SECOND_CHANCE' ||
    card.type === 'ACTION_FREEZE' ||
    card.type === 'ACTION_FLIP_THREE'
  );
}

/**
 * Check if a card is a number card
 */
export function isNumberCard(card: Card): boolean {
  return card.type === 'NUMBER';
}

/**
 * Check if a card is a modifier card (multiplier or bonus)
 */
export function isModifierCard(card: Card): boolean {
  return card.type === 'MODIFIER_MULT' || card.type === 'MODIFIER_BONUS';
}

/**
 * Get the display label for a card type
 */
export function getCardTypeLabel(type: CardType): string {
  const labels: Record<CardType, string> = {
    NUMBER: 'Number',
    MODIFIER_MULT: 'Multiplier',
    MODIFIER_BONUS: 'Bonus',
    ACTION_SECOND_CHANCE: 'Second Chance',
    ACTION_FREEZE: 'Freeze',
    ACTION_FLIP_THREE: 'Flip Three',
  };
  return labels[type];
}
