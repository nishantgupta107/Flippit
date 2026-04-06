import { buildDeck } from '../deck';
import {
  advanceToNextPlayer,
  applyRoundScoreToTotal,
  drawForPlayer,
  endRound,
  initGame,
  playerStay,
  resolveCard,
  resolvePendingAction,
  startNewRound,
  calculateRoundScore,
} from '../gameEngine';
import type { GameState, PlayerInput, PlayerState, Card } from '../types';

const players: PlayerInput[] = [
  { id: 'p1', name: 'Alice', avatar: 'A', isBot: false },
  { id: 'p2', name: 'Bob', avatar: 'B', isBot: false },
  { id: 'p3', name: 'Charlie', avatar: 'C', isBot: false },
];

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initGame(players, 7),
    phase: 'PLAYER_TURN',
    ...overrides,
  };
}

function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error(`Missing player ${playerId}`);
  }

  return player;
}

describe('Game Engine Edge Cases', () => {
  // Edge Case 1: Multiple multipliers stack correctly (e.g. x2, x2 results in x4)
  it('Edge Case 1: Multiple multipliers stack correctly', () => {
    const state = createState();
    const plainPlayer = getPlayer(state, 'p1');
    const score = calculateRoundScore({
      ...plainPlayer,
      hand: [
        { id: 'NUMBER_4_1', type: 'NUMBER', value: 4 },
        { id: 'MODIFIER_MULT_2_1', type: 'MODIFIER_MULT', value: 2 },
        { id: 'MODIFIER_MULT_2_2', type: 'MODIFIER_MULT', value: 2 },
      ],
    });
    expect(score).toBe(16); // 4 * 2 * 2 = 16
  });

  // Edge Case 2: Shield prevents bust on duplicate, duplicate goes to discard, player continues
  it('Edge Case 2: Shield prevents bust on duplicate, duplicate goes to discard', () => {
    let state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_5_1', type: 'NUMBER', value: 5 }],
              hasShield: true,
            }
          : player
      ),
    });

    const duplicateCard: Card = { id: 'NUMBER_5_2', type: 'NUMBER', value: 5 };
    state = resolveCard(state, 'p1', duplicateCard);

    const p1 = getPlayer(state, 'p1');
    expect(p1.active).toBe(true);
    expect(p1.hasShield).toBe(false);
    expect(p1.hand.length).toBe(1); // Original 5 is still there
    expect(state.discardPile).toContainEqual(duplicateCard);
  });

  // Edge Case 3: FLIP_THREE stops drawing immediately if the target busts on the first card
  it('Edge Case 3: FLIP_THREE stops drawing immediately if target busts', () => {
    const state = createState({
      deck: [
        { id: 'NUMBER_5_2', type: 'NUMBER', value: 5 }, // Busts p2 immediately
        { id: 'NUMBER_6_1', type: 'NUMBER', value: 6 },
        { id: 'NUMBER_7_1', type: 'NUMBER', value: 7 },
      ],
      pendingAction: {
        type: 'FLIP_THREE_TARGET',
        actingPlayerId: 'p1',
      },
      players: createState().players.map((player) =>
        player.id === 'p2'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_5_1', type: 'NUMBER', value: 5 }],
            }
          : player
      ),
    });

    const nextState = resolvePendingAction(state, 'p2');
    const p2 = getPlayer(nextState, 'p2');
    expect(p2.active).toBe(false);
    expect(nextState.deck.length).toBe(2); // Only 1 card drawn
  });

  // Edge Case 4: FLIP_THREE drawing an ACTION card queues the pending action correctly for the target player
  it('Edge Case 4: FLIP_THREE drawing an ACTION card queues pending action for target', () => {
    const state = createState({
      deck: [
        { id: 'NUMBER_6_1', type: 'NUMBER', value: 6 },
        { id: 'ACTION_FREEZE_1', type: 'ACTION_FREEZE', value: 0 },
        { id: 'NUMBER_7_1', type: 'NUMBER', value: 7 },
      ],
      pendingAction: {
        type: 'FLIP_THREE_TARGET',
        actingPlayerId: 'p1',
      },
      players: createState().players.map((player) =>
        player.id === 'p2'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_5_1', type: 'NUMBER', value: 5 }],
            }
          : player
      ),
    });

    const nextState = resolvePendingAction(state, 'p2');
    const p2 = getPlayer(nextState, 'p2');
    expect(p2.active).toBe(true);
    expect(p2.hand.length).toBe(3); // 5 + 6 + 7
    // Pending action should be FREEZE from p2
    expect(nextState.pendingAction).toEqual({
      type: 'FREEZE_TARGET',
      actingPlayerId: 'p2',
    });
  });

  // Edge Case 5: SECOND_CHANCE pending action expires if passed around by all active players
  it('Edge Case 5: SECOND_CHANCE pending action expires if passed around', () => {
    const state = createState({
      players: createState().players.map((player) => ({
        ...player,
        hasShield: true,
      })),
    });

    let pendingState = resolveCard(state, 'p1', {
      id: 'ACTION_SECOND_CHANCE_1',
      type: 'ACTION_SECOND_CHANCE',
      value: 0,
    });

    // Pass to p2
    pendingState = resolvePendingAction(pendingState, 'p2');
    // Pass to p3
    pendingState = resolvePendingAction(pendingState, 'p3');
    // Pass to p1
    pendingState = resolvePendingAction(pendingState, 'p1');

    expect(pendingState.pendingAction).toBeUndefined();
  });

  // Edge Case 6: SECOND_CHANCE is discarded immediately if all active players already have shields
  it('Edge Case 6: SECOND_CHANCE is discarded immediately if all active players have shields', () => {
    const state = createState({
      players: createState().players.map((player) => ({
        ...player,
        hasShield: true,
      })),
    });

    const nextState = resolveCard(state, 'p1', {
      id: 'ACTION_SECOND_CHANCE_1',
      type: 'ACTION_SECOND_CHANCE',
      value: 0,
    });

    expect(nextState.pendingAction).toBeUndefined();
    expect(nextState.discardPile.length).toBe(1);
  });

  // Edge Case 7: Drawing 7 cards where some are modifiers does not trigger the 7-number win condition
  it('Edge Case 7: Drawing 7 cards with modifiers does not trigger 7-number win condition', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1'
          ? {
              ...player,
              hand: [
                { id: 'NUMBER_1_1', type: 'NUMBER', value: 1 },
                { id: 'NUMBER_2_1', type: 'NUMBER', value: 2 },
                { id: 'NUMBER_3_1', type: 'NUMBER', value: 3 },
                { id: 'NUMBER_4_1', type: 'NUMBER', value: 4 },
                { id: 'NUMBER_5_1', type: 'NUMBER', value: 5 },
                { id: 'MODIFIER_MULT_2_1', type: 'MODIFIER_MULT', value: 2 },
              ],
            }
          : player
      ),
    });

    const nextState = resolveCard(state, 'p1', { id: 'NUMBER_6_1', type: 'NUMBER', value: 6 });
    expect(nextState.roundOver).toBe(false);
    expect(getPlayer(nextState, 'p1').hand.length).toBe(7);
  });

  // Edge Case 8: Round ends correctly if the last remaining active player stays
  it('Edge Case 8: Round ends correctly if last active player stays', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_9_1', type: 'NUMBER', value: 9 }],
            }
          : { ...player, active: false }
      ),
    });

    const nextState = playerStay(state, 'p1');
    expect(nextState.roundOver).toBe(true);
    expect(getPlayer(nextState, 'p1').totalScore).toBe(9);
  });

  // Edge Case 9: Game Over triggers exactly when a player hits 200 points
  it('Edge Case 9: Game Over triggers exactly when a player hits 200 points', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1'
          ? {
              ...player,
              totalScore: 195,
              hand: [{ id: 'NUMBER_5_1', type: 'NUMBER', value: 5 }],
            }
          : player
      ),
    });

    const nextState = applyRoundScoreToTotal(state, 'p1');
    expect(getPlayer(nextState, 'p1').totalScore).toBe(200);
    expect(nextState.gameOver).toBe(true);
    expect(nextState.winner).toBe('p1');
  });

  // Edge Case 10: FLIP_THREE on target with shield, draws duplicate, pops shield, continues drawing
  it('Edge Case 10: FLIP_THREE on target with shield, duplicate pops shield and continues', () => {
    const duplicateCard: Card = { id: 'NUMBER_5_2', type: 'NUMBER', value: 5 };
    const state = createState({
      deck: [
        duplicateCard, // Duplicate 5 pops shield
        { id: 'NUMBER_6_1', type: 'NUMBER', value: 6 },
        { id: 'NUMBER_7_1', type: 'NUMBER', value: 7 },
      ],
      pendingAction: {
        type: 'FLIP_THREE_TARGET',
        actingPlayerId: 'p1',
      },
      players: createState().players.map((player) =>
        player.id === 'p2'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_5_1', type: 'NUMBER', value: 5 }],
              hasShield: true,
            }
          : player
      ),
    });

    const nextState = resolvePendingAction(state, 'p2');
    const p2 = getPlayer(nextState, 'p2');
    expect(p2.active).toBe(true);
    expect(p2.hasShield).toBe(false);
    expect(p2.hand.length).toBe(3); // 5 + 6 + 7
    expect(nextState.discardPile).toContainEqual(duplicateCard);
    expect(nextState.deck.length).toBe(0); // All 3 drawn
  });
});
