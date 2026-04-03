import { describe, it, expect } from 'vitest';
import { bustCheck, hitPlayer, stayPlayer } from '../player';
import { buildDeck, resetIdCounter } from '../deck';
import type { Card, GameState, PlayerState } from '../types';

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'human',
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

function makeCard(value: number): Card {
  return { id: `n${value}`, type: 'number', value };
}

function makeSecondChance(): Card {
  return { id: 'sc', type: 'action', action: 'second_chance' };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  resetIdCounter();
  const deck = buildDeck();
  const human = makePlayer();
  return {
    phase: 'play',
    drawPile: deck,
    discardPile: [],
    players: [human],
    dealerIndex: 0,
    activePlayerIndex: 0,
    roundNumber: 1,
    pendingAction: null,
    winner: null,
    lastEvent: null,
    ...overrides,
  };
}

describe('bustCheck', () => {
  it('returns true when number card duplicates an existing card', () => {
    const player = makePlayer({ numberCards: [makeCard(5)] });
    const newCard = makeCard(5);
    expect(bustCheck(player, newCard)).toBe(true);
  });

  it('returns false for a unique number card', () => {
    const player = makePlayer({ numberCards: [makeCard(5)] });
    const newCard = makeCard(6);
    expect(bustCheck(player, newCard)).toBe(false);
  });

  it('returns false for non-number cards', () => {
    const player = makePlayer();
    const modCard: Card = { id: 'mod', type: 'modifier', modifier: '+4' };
    expect(bustCheck(player, modCard)).toBe(false);
  });

  it('returns true when 0 is duplicated', () => {
    const player = makePlayer({ numberCards: [makeCard(0)] });
    expect(bustCheck(player, makeCard(0))).toBe(true);
  });
});

describe('hitPlayer — number cards', () => {
  it('adds a unique number card to the player hand', () => {
    // Inject a specific number card as the top of the draw pile
    const targetCard = makeCard(7);
    const state = makeGameState({ drawPile: [targetCard] });
    const newState = hitPlayer(state, 'human');
    expect(newState.players[0].numberCards).toHaveLength(1);
    expect(newState.players[0].numberCards[0].value).toBe(7);
    expect(newState.lastEvent?.kind).toBe('card_drawn');
  });

  it('busts the player on drawing a duplicate', () => {
    const existingCard = makeCard(5);
    const duplicateCard = makeCard(5);
    const human = makePlayer({ numberCards: [existingCard] });
    const state = makeGameState({
      players: [human],
      drawPile: [duplicateCard],
    });

    const newState = hitPlayer(state, 'human');
    expect(newState.players[0].status).toBe('busted');
    expect(newState.players[0].numberCards).toHaveLength(2);
    expect(newState.players[0].numberCards.every((card) => card.value === 5)).toBe(true);
    expect(newState.lastEvent?.kind).toBe('bust');
  });

  it('uses Second Chance to absorb a duplicate', () => {
    const existingCard = makeCard(5);
    const duplicateCard = makeCard(5);
    const secondChance = makeSecondChance();
    const human = makePlayer({
      numberCards: [existingCard],
      actionCards: [secondChance],
    });
    const state = makeGameState({
      players: [human],
      drawPile: [duplicateCard],
    });

    const newState = hitPlayer(state, 'human');
    // Player should NOT bust, Second Chance should be removed
    expect(newState.players[0].status).toBe('active');
    expect(newState.players[0].actionCards).toHaveLength(0);
    expect(newState.lastEvent?.kind).toBe('second_chance_used');
  });

  it('detects Flip 7 when 7 unique cards are collected', () => {
    const existing = [0, 1, 2, 3, 4, 5].map(makeCard);
    const seventhCard = makeCard(6);
    const human = makePlayer({ numberCards: existing });
    const state = makeGameState({ players: [human], drawPile: [seventhCard] });

    const newState = hitPlayer(state, 'human');
    expect(newState.lastEvent?.kind).toBe('flip_seven');
  });
});

describe('hitPlayer — modifier cards', () => {
  it('adds a modifier card to modifierCards', () => {
    const modCard: Card = { id: 'mod', type: 'modifier', modifier: '+4' };
    const state = makeGameState({ drawPile: [modCard] });
    const newState = hitPlayer(state, 'human');
    expect(newState.players[0].modifierCards).toHaveLength(1);
    expect(newState.players[0].modifierCards[0].modifier).toBe('+4');
  });
});

describe('stayPlayer', () => {
  it('sets player status to stayed', () => {
    const state = makeGameState();
    const newState = stayPlayer(state, 'human');
    expect(newState.players[0].status).toBe('stayed');
    expect(newState.lastEvent?.kind).toBe('stay');
  });

  it('throws if player is not active', () => {
    const state = makeGameState({
      players: [makePlayer({ status: 'busted' })],
    });
    expect(() => stayPlayer(state, 'human')).toThrow();
  });
});
