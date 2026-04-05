import type { Card } from './types';

export const DEFAULT_SEED = 20260405;

const NUMBER_CARD_COUNTS: Record<number, number> = {
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
};

const BONUS_CARD_COUNTS: Record<number, number> = {
  2: 1,
  4: 1,
  6: 1,
  8: 1,
  10: 1,
};

function normalizeSeed(seed?: number): number {
  if (typeof seed !== 'number' || !Number.isFinite(seed)) {
    return DEFAULT_SEED;
  }

  return Math.abs(Math.trunc(seed)) || DEFAULT_SEED;
}

export function createSeededRandom(seed?: number): () => number {
  let state = normalizeSeed(seed) >>> 0;

  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createBaseDeck(): Card[] {
  const deck: Card[] = [];

  for (let value = 0; value <= 12; value += 1) {
    const count = NUMBER_CARD_COUNTS[value];
    for (let copy = 1; copy <= count; copy += 1) {
      deck.push({
        id: `NUMBER_${value}_${copy}`,
        type: 'NUMBER',
        value,
      });
    }
  }

  for (let copy = 1; copy <= 2; copy += 1) {
    deck.push({
      id: `MODIFIER_MULT_2_${copy}`,
      type: 'MODIFIER_MULT',
      value: 2,
    });
  }

  const bonusValues = [2, 4, 6, 8, 10];
  for (const value of bonusValues) {
    const count = BONUS_CARD_COUNTS[value];
    for (let copy = 1; copy <= count; copy += 1) {
      deck.push({
        id: `MODIFIER_BONUS_${value}_${copy}`,
        type: 'MODIFIER_BONUS',
        value,
      });
    }
  }

  for (let copy = 1; copy <= 2; copy += 1) {
    deck.push({
      id: `ACTION_SECOND_CHANCE_${copy}`,
      type: 'ACTION_SECOND_CHANCE',
      value: 0,
    });
  }

  for (let copy = 1; copy <= 3; copy += 1) {
    deck.push({
      id: `ACTION_FREEZE_${copy}`,
      type: 'ACTION_FREEZE',
      value: 0,
    });
  }

  for (let copy = 1; copy <= 3; copy += 1) {
    deck.push({
      id: `ACTION_FLIP_THREE_${copy}`,
      type: 'ACTION_FLIP_THREE',
      value: 0,
    });
  }

  return deck;
}

export function shuffleDeck(deck: Card[], seed?: number): Card[] {
  const shuffled = [...deck];
  const random = createSeededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

export function buildDeck(seed?: number): Card[] {
  const shuffled = shuffleDeck(createBaseDeck(), seed);

  // DEBUG: TEST 1 - Second Chance Infinite Loop Prevention
  // Stack the deck so the first few draws are all Second Chance cards.
  // This allows you to easily draw shields for all players in the game demo, 
  // and then draw an extra one to test the pass/discard sequence limitation.
  shuffled.unshift(
    { id: 'DEBUG_ACTION_SC_1', type: 'ACTION_SECOND_CHANCE', value: 0 },
    { id: 'DEBUG_ACTION_SC_2', type: 'ACTION_SECOND_CHANCE', value: 0 },
    { id: 'DEBUG_ACTION_SC_3', type: 'ACTION_SECOND_CHANCE', value: 0 }
  );

  return shuffled;
}

export function drawCard(deck: Card[]): { card: Card; remainingDeck: Card[] } {
  const [card, ...remainingDeck] = deck;

  if (!card) {
    throw new Error('Cannot draw from an empty deck.');
  }

  return { card, remainingDeck };
}
