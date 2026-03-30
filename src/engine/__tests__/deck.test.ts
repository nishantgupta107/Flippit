import { describe, it, expect, beforeEach } from 'vitest';
import { buildDeck, shuffle, drawCard, resetIdCounter } from '../deck';
import type { GameState } from '../types';

function emptyGameState(): GameState {
  return {
    phase: 'play',
    drawPile: [],
    discardPile: [],
    players: [],
    dealerIndex: 0,
    activePlayerIndex: 0,
    roundNumber: 1,
    pendingAction: null,
    winner: null,
    lastEvent: null,
  };
}

describe('buildDeck', () => {
  beforeEach(() => resetIdCounter());

  it('builds a deck with the correct total card count', () => {
    const deck = buildDeck();
    // 1 + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 11 + 12 = 79 numbers
    // 7 modifiers (+2, +4, +6, +8, +8, +10, x2)
    // 9 actions (freeze×3, flip_three×3, second_chance×3)
    // Total: 95
    expect(deck).toHaveLength(95);
  });

  it('contains exactly one card with value 0', () => {
    const deck = buildDeck();
    expect(deck.filter((c) => c.type === 'number' && c.value === 0)).toHaveLength(1);
  });

  it('contains exactly one card with value 1', () => {
    const deck = buildDeck();
    expect(deck.filter((c) => c.type === 'number' && c.value === 1)).toHaveLength(1);
  });

  it('contains exactly 12 cards with value 12', () => {
    const deck = buildDeck();
    expect(deck.filter((c) => c.type === 'number' && c.value === 12)).toHaveLength(12);
  });

  it('contains exactly 3 freeze cards', () => {
    const deck = buildDeck();
    expect(deck.filter((c) => c.action === 'freeze')).toHaveLength(3);
  });

  it('contains exactly 3 flip_three cards', () => {
    const deck = buildDeck();
    expect(deck.filter((c) => c.action === 'flip_three')).toHaveLength(3);
  });

  it('contains exactly 3 second_chance cards', () => {
    const deck = buildDeck();
    expect(deck.filter((c) => c.action === 'second_chance')).toHaveLength(3);
  });

  it('contains exactly 2 +8 modifier cards', () => {
    const deck = buildDeck();
    expect(deck.filter((c) => c.modifier === '+8')).toHaveLength(2);
  });

  it('contains exactly 1 x2 modifier card', () => {
    const deck = buildDeck();
    expect(deck.filter((c) => c.modifier === 'x2')).toHaveLength(1);
  });

  it('gives each card a unique id', () => {
    const deck = buildDeck();
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(deck.length);
  });
});

describe('shuffle', () => {
  it('preserves card count', () => {
    resetIdCounter();
    const deck = buildDeck();
    const shuffled = shuffle([...deck]);
    expect(shuffled).toHaveLength(deck.length);
  });

  it('is deterministic with a seeded random function', () => {
    // Simple seeded PRNG (mulberry32)
    function seeded(seed: number) {
      return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    // Use the same source array for both shuffles to get identical results
    resetIdCounter();
    const deck = buildDeck();
    const copy1 = [...deck];
    const copy2 = [...deck];
    const shuffled1 = shuffle(copy1, seeded(42));
    const shuffled2 = shuffle(copy2, seeded(42));
    // Both shuffles of the same deck with the same seed must produce the same order
    expect(shuffled1.map((c) => c.id)).toEqual(shuffled2.map((c) => c.id));
  });
});

describe('drawCard', () => {
  beforeEach(() => resetIdCounter());

  it('draws the top card from the draw pile', () => {
    const deck = buildDeck();
    const top = deck[0];
    const state = { ...emptyGameState(), drawPile: deck };
    const [newState, drawn] = drawCard(state);
    expect(drawn.id).toBe(top.id);
    expect(newState.drawPile).toHaveLength(deck.length - 1);
  });

  it('reshuffles discard pile when draw pile is empty', () => {
    const card = buildDeck()[0];
    const state = {
      ...emptyGameState(),
      drawPile: [],
      discardPile: [card],
    };
    const [newState, drawn] = drawCard(state);
    expect(drawn.id).toBe(card.id);
    expect(newState.discardPile).toHaveLength(0);
  });

  it('throws when both piles are empty', () => {
    const state = emptyGameState();
    expect(() => drawCard(state)).toThrow();
  });
});
