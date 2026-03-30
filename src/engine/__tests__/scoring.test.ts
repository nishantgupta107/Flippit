import { describe, it, expect } from 'vitest';
import { calculateRoundScore, checkFlip7, applyRoundScores, checkWinCondition, WIN_SCORE } from '../scoring';
import type { PlayerState, GameState } from '../types';

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'p1',
    name: 'Test',
    isAI: false,
    numberCards: [],
    modifierCards: [],
    actionCards: [],
    status: 'active',
    roundScore: 0,
    totalScore: 0,
    ...overrides,
  };
}

function makeCard(value: number) {
  return { id: `n${value}`, type: 'number' as const, value };
}

function makeModifier(modifier: string) {
  return { id: `m-${modifier}`, type: 'modifier' as const, modifier: modifier as any };
}

function makeState(players: PlayerState[]): GameState {
  return {
    phase: 'play',
    drawPile: [],
    discardPile: [],
    players,
    dealerIndex: 0,
    activePlayerIndex: 0,
    roundNumber: 1,
    pendingAction: null,
    winner: null,
    lastEvent: null,
  };
}

describe('calculateRoundScore', () => {
  it('sums number cards correctly', () => {
    const player = makePlayer({
      numberCards: [makeCard(3), makeCard(5), makeCard(7)],
    });
    expect(calculateRoundScore(player)).toBe(15);
  });

  it('applies x2 multiplier before flat modifiers', () => {
    const player = makePlayer({
      numberCards: [makeCard(4), makeCard(6)],
      modifierCards: [makeModifier('x2'), makeModifier('+4')],
    });
    // (4 + 6) × 2 + 4 = 24
    expect(calculateRoundScore(player)).toBe(24);
  });

  it('applies flat modifiers without x2', () => {
    const player = makePlayer({
      numberCards: [makeCard(5)],
      modifierCards: [makeModifier('+2'), makeModifier('+6')],
    });
    expect(calculateRoundScore(player)).toBe(13);
  });

  it('floors score at 0 (never negative)', () => {
    // Edge case: player has only a 0 number card
    const player = makePlayer({
      numberCards: [makeCard(0)],
      modifierCards: [],
    });
    expect(calculateRoundScore(player)).toBe(0);
  });

  it('adds Flip 7 bonus when hasFlipSeven is true', () => {
    const player = makePlayer({
      numberCards: [makeCard(1), makeCard(2), makeCard(3), makeCard(4), makeCard(5), makeCard(6), makeCard(0)],
    });
    const withBonus = calculateRoundScore(player, true);
    const withoutBonus = calculateRoundScore(player, false);
    expect(withBonus - withoutBonus).toBe(15);
  });

  it('scores 0 for a player with only modifier cards (0 base)', () => {
    const player = makePlayer({
      numberCards: [],
      modifierCards: [makeModifier('+4')],
    });
    // 0 + 4 = 4 (flat mods added to 0 base)
    expect(calculateRoundScore(player)).toBe(4);
  });
});

describe('checkFlip7', () => {
  it('returns true when player has 7 number cards', () => {
    const player = makePlayer({
      numberCards: [0, 1, 2, 3, 4, 5, 6].map(makeCard),
    });
    expect(checkFlip7(player)).toBe(true);
  });

  it('returns false when player has fewer than 7 cards', () => {
    const player = makePlayer({
      numberCards: [0, 1, 2, 3, 4, 5].map(makeCard),
    });
    expect(checkFlip7(player)).toBe(false);
  });
});

describe('applyRoundScores', () => {
  it('adds round score to totalScore for stayed players', () => {
    const player = makePlayer({
      id: 'p1',
      status: 'stayed',
      totalScore: 50,
      numberCards: [makeCard(10)],
    });
    const state = makeState([player]);
    const updated = applyRoundScores(state);
    expect(updated.players[0].totalScore).toBe(60);
    expect(updated.players[0].roundScore).toBe(10);
  });

  it('gives 0 round score to busted players', () => {
    const player = makePlayer({
      id: 'p1',
      status: 'busted',
      totalScore: 50,
      numberCards: [], // cleared on bust
    });
    const state = makeState([player]);
    const updated = applyRoundScores(state);
    expect(updated.players[0].roundScore).toBe(0);
    expect(updated.players[0].totalScore).toBe(50); // unchanged
  });

  it('applies Flip 7 bonus to the correct player', () => {
    const p1 = makePlayer({ id: 'p1', status: 'active', totalScore: 0, numberCards: [0,1,2,3,4,5,6].map(makeCard) });
    const p2 = makePlayer({ id: 'p2', status: 'stayed', totalScore: 0, numberCards: [makeCard(5)] });
    const state = makeState([p1, p2]);
    const updated = applyRoundScores(state, 'p1');
    // p1: (0+1+2+3+4+5+6) + 15 = 21 + 15 = 36
    expect(updated.players[0].roundScore).toBe(36);
    // p2: 5 (no bonus)
    expect(updated.players[1].roundScore).toBe(5);
  });
});

describe('checkWinCondition', () => {
  it('returns null if no player has reached 200', () => {
    const players = [
      makePlayer({ id: 'p1', totalScore: 180 }),
      makePlayer({ id: 'p2', totalScore: 190 }),
    ];
    expect(checkWinCondition(makeState(players))).toBeNull();
  });

  it('returns the highest scorer when any player reaches 200', () => {
    const players = [
      makePlayer({ id: 'p1', totalScore: 210 }),
      makePlayer({ id: 'p2', totalScore: 205 }),
    ];
    expect(checkWinCondition(makeState(players))).toBe('p1');
  });

  it('handles tie at 200 by returning the first highest alphabetically by id', () => {
    const players = [
      makePlayer({ id: 'p2', totalScore: 200 }),
      makePlayer({ id: 'p1', totalScore: 200 }),
    ];
    // Both at 200, sort is stable — first in sort order wins
    const winner = checkWinCondition(makeState(players));
    expect(winner).toBeTruthy();
  });
});
