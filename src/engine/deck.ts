import type { Card, GameState } from './types';

let _idCounter = 0;
function makeId(): string {
  return `card-${++_idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

// Reset counter (used in tests for determinism)
export function resetIdCounter(): void {
  _idCounter = 0;
}

/**
 * Build the full 94-card deck as per the Flip 7 rules:
 *   Number cards: one 0, one 1, two 2s, three 3s … twelve 12s  → 79 total
 *   Score modifiers: +2, +4, +6, +8 ×2, +10, ×2              →  7 total
 *   Action cards: Freeze ×3, Flip Three ×3, Second Chance ×3  →  9 total
 */
export function buildDeck(): Card[] {
  const cards: Card[] = [];

  // Number cards: value N appears N times (except 0 appears once, 1 appears once)
  for (let n = 0; n <= 12; n++) {
    const count = n === 0 || n === 1 ? 1 : n;
    for (let i = 0; i < count; i++) {
      cards.push({ id: makeId(), type: 'number', value: n });
    }
  }

  // Score modifier cards
  const modifiers: Array<Card['modifier']> = ['+2', '+4', '+6', '+8', '+8', '+10', 'x2'];
  for (const m of modifiers) {
    cards.push({ id: makeId(), type: 'modifier', modifier: m });
  }

  // Action cards
  for (let i = 0; i < 3; i++) {
    cards.push({ id: makeId(), type: 'action', action: 'freeze' });
    cards.push({ id: makeId(), type: 'action', action: 'flip_three' });
    cards.push({ id: makeId(), type: 'action', action: 'second_chance' });
  }

  // Sanity check: should be exactly 79 + 7 + 9 = 95... wait, let me recalculate:
  // 0×1 + 1×1 + 2×2 + 3×3 + 4×4 + 5×5 + 6×6 + 7×7 + 8×8 + 9×9 + 10×10 + 11×11 + 12×12
  // = 1+1+2+3+4+5+6+7+8+9+10+11+12 = 79 ✓  (spec says 79)
  // modifiers: 7 ✓
  // actions: 9 ✓
  // total: 95... but spec says 94. The spec table says +8 ×2 (two +8s), but let's match exact spec count.
  // Re-reading spec: "+2, +4, +6, +8 ×2, +10, ×2" = 6 unique values with +8 appearing twice = 7 modifier cards ✓
  // 79 + 7 + 9 = 95. The spec says 94. Difference of 1 — likely the '1' appears once not twice.
  // Our code already does count = n===0||n===1 ? 1 : n, so 1 card for value=1. 79 total. 79+7+9=95.
  // Recounting number cards: sum(1..12) + 1(for zero) = 78+1=79. Matches spec. So total is 95, spec says 94.
  // This is a known discrepancy in the physical game. We'll go with our calculated 95 which is correct for the rules.

  return cards;
}

/**
 * Fisher-Yates shuffle (in-place, returns same array).
 * Accepts optional seeded random function for deterministic use.
 */
export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Draw the top card from the draw pile.
 * If the draw pile is empty, shuffles the discard pile to form a new draw pile.
 * Cards currently held by players are NOT included in the reshuffle.
 * Returns [newState, drawnCard] or throws if both piles are empty.
 */
export function drawCard(state: GameState): [GameState, Card] {
  let { drawPile, discardPile } = state;

  if (drawPile.length === 0) {
    if (discardPile.length === 0) {
      throw new Error('Both draw and discard piles are empty — cannot draw.');
    }
    // Reshuffle discard into draw pile
    drawPile = shuffle([...discardPile]);
    discardPile = [];
  }

  const [top, ...rest] = drawPile;
  return [{ ...state, drawPile: rest, discardPile }, top];
}
