import { describe, it, expect } from 'vitest';
import { resolveFreeze, startFlipThree, continueFlipThree, resolveSecondChance } from '../actions';
import type { Card, GameState, PlayerState } from '../types';

function makePlayer(id: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    name: id,
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

function makeNumCard(value: number): Card {
  return { id: `n${value}-${Math.random()}`, type: 'number', value };
}

function makeState(players: PlayerState[], drawPile: Card[] = []): GameState {
  return {
    phase: 'play',
    drawPile,
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

describe('resolveFreeze', () => {
  it('sets target player status to frozen', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const state = makeState([p1, p2]);

    const newState = resolveFreeze(state, 'p2');
    expect(newState.players[1].status).toBe('frozen');
    expect(newState.lastEvent?.kind).toBe('freeze');
  });

  it('is a no-op if target is already inactive', () => {
    const p1 = makePlayer('p1', { status: 'stayed' });
    const state = makeState([p1]);
    const newState = resolveFreeze(state, 'p1');
    expect(newState.players[0].status).toBe('stayed'); // unchanged
  });

  it('can freeze self if only active player', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2', { status: 'stayed' });
    const state = makeState([p1, p2]);

    const newState = resolveFreeze(state, 'p1');
    expect(newState.players[0].status).toBe('frozen');
  });
});

describe('startFlipThree / continueFlipThree', () => {
  it('sets pending action with 3 cards remaining', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    const state = makeState([p1, p2]);

    const newState = startFlipThree(state, 'p2');
    expect(newState.pendingAction).not.toBeNull();
    expect(newState.pendingAction?.cardsRemaining).toBe(3);
    expect(newState.pendingAction?.targetPlayerId).toBe('p2');
  });

  it('draws 3 cards and adds unique numbers to the target hand', () => {
    const p2 = makePlayer('p2');
    const drawPile = [makeNumCard(1), makeNumCard(2), makeNumCard(3)];
    let state = makeState([makePlayer('p1'), p2], drawPile);
    state = startFlipThree(state, 'p2');

    state = continueFlipThree(state);
    state = continueFlipThree(state);
    state = continueFlipThree(state);

    expect(state.pendingAction).toBeNull(); // all 3 drawn
    expect(state.players[1].numberCards).toHaveLength(3);
  });

  it('stops Flip Three early on bust', () => {
    const existing = makeNumCard(5);
    const p2 = makePlayer('p2', { numberCards: [existing] });
    const drawPile = [makeNumCard(5), makeNumCard(7), makeNumCard(8)]; // first card busts

    let state = makeState([makePlayer('p1'), p2], drawPile);
    state = startFlipThree(state, 'p2');
    state = continueFlipThree(state);

    expect(state.lastEvent?.kind).toBe('bust');
    expect(state.pendingAction).toBeNull();
    expect(state.players[1].status).toBe('busted');
    // Remaining 2 cards stay in draw pile
    expect(state.drawPile).toHaveLength(2);
  });

  it('defers action cards drawn during Flip Three', () => {
    const actionCard: Card = { id: 'freeze1', type: 'action', action: 'freeze' };
    const p2 = makePlayer('p2');
    const drawPile = [actionCard, makeNumCard(1), makeNumCard(2)];

    let state = makeState([makePlayer('p1'), p2], drawPile);
    state = startFlipThree(state, 'p2');

    state = continueFlipThree(state); // Draws action card — should defer
    expect(state.pendingAction?.deferredActions).toHaveLength(1);
    expect(state.pendingAction?.deferredActions[0].action).toBe('freeze');
    expect(state.pendingAction?.cardsRemaining).toBe(2); // still 2 more to draw
  });

  it('stops Flip Three early when target achieves Flip 7', () => {
    const existing = [0, 1, 2, 3, 4, 5].map(makeNumCard);
    const p2 = makePlayer('p2', { numberCards: existing });
    const drawPile = [makeNumCard(6), makeNumCard(8), makeNumCard(9)]; // first = Flip 7

    let state = makeState([makePlayer('p1'), p2], drawPile);
    state = startFlipThree(state, 'p2');
    state = continueFlipThree(state);

    expect(state.lastEvent?.kind).toBe('flip_seven');
    expect(state.pendingAction).toBeNull();
    // Remaining 2 cards stay in draw pile
    expect(state.drawPile).toHaveLength(2);
  });
});

describe('resolveSecondChance', () => {
  it('gives Second Chance card to the target player', () => {
    const sc: Card = { id: 'sc1', type: 'action', action: 'second_chance' };
    const p1 = makePlayer('p1');
    const state = makeState([p1]);

    const newState = resolveSecondChance(state, sc, 'p1');
    expect(newState.players[0].actionCards).toHaveLength(1);
  });

  it('passes Second Chance to next active player if holder already has one', () => {
    const sc1: Card = { id: 'sc1', type: 'action', action: 'second_chance' };
    const sc2: Card = { id: 'sc2', type: 'action', action: 'second_chance' };
    const p1 = makePlayer('p1', { actionCards: [sc1] }); // already has one
    const p2 = makePlayer('p2');
    const state = makeState([p1, p2]);

    const newState = resolveSecondChance(state, sc2, 'p1');
    expect(newState.players[0].actionCards).toHaveLength(1); // still has only the original
    expect(newState.players[1].actionCards).toHaveLength(1); // p2 got it
    expect(newState.lastEvent?.kind).toBe('second_chance_passed');
  });

  it('discards extra Second Chance if no valid recipient exists', () => {
    const sc1: Card = { id: 'sc1', type: 'action', action: 'second_chance' };
    const sc2: Card = { id: 'sc2', type: 'action', action: 'second_chance' };
    const p1 = makePlayer('p1', { actionCards: [sc1] });
    const p2 = makePlayer('p2', { status: 'stayed' }); // not active
    const state = makeState([p1, p2]);

    const newState = resolveSecondChance(state, sc2, 'p1');
    expect(newState.discardPile).toContain(sc2);
  });
});
