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
import type { GameState, PlayerInput, PlayerState } from '../types';

const players: PlayerInput[] = [
  { id: 'p1', name: 'Alice', avatar: 'A', isBot: false },
  { id: 'p2', name: 'Bob', avatar: 'B', isBot: false },
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

describe('calculateRoundScore', () => {
  it('scores plain numbers, multiplier, bonus, and flip 7 bonus', () => {
    const plainPlayer = getPlayer(createState(), 'p1');
    expect(
      calculateRoundScore({
        ...plainPlayer,
        hand: [
          { id: 'NUMBER_4_1', type: 'NUMBER', value: 4 },
          { id: 'NUMBER_5_1', type: 'NUMBER', value: 5 },
        ],
      })
    ).toBe(9);

    expect(
      calculateRoundScore({
        ...plainPlayer,
        hand: [
          { id: 'NUMBER_4_1', type: 'NUMBER', value: 4 },
          { id: 'MODIFIER_MULT_2_1', type: 'MODIFIER_MULT', value: 2 },
        ],
      })
    ).toBe(8);

    expect(
      calculateRoundScore({
        ...plainPlayer,
        hand: [
          { id: 'NUMBER_4_1', type: 'NUMBER', value: 4 },
          { id: 'MODIFIER_BONUS_6_1', type: 'MODIFIER_BONUS', value: 6 },
        ],
      })
    ).toBe(10);

    expect(
      calculateRoundScore({
        ...plainPlayer,
        hand: [
          { id: 'NUMBER_4_1', type: 'NUMBER', value: 4 },
          { id: 'NUMBER_5_1', type: 'NUMBER', value: 5 },
          { id: 'MODIFIER_MULT_2_1', type: 'MODIFIER_MULT', value: 2 },
          { id: 'MODIFIER_BONUS_6_1', type: 'MODIFIER_BONUS', value: 6 },
        ],
      })
    ).toBe(24);

    expect(
      calculateRoundScore({
        ...plainPlayer,
        hand: [
          { id: 'NUMBER_0_1', type: 'NUMBER', value: 0 },
          { id: 'NUMBER_1_1', type: 'NUMBER', value: 1 },
          { id: 'NUMBER_2_1', type: 'NUMBER', value: 2 },
          { id: 'NUMBER_3_1', type: 'NUMBER', value: 3 },
          { id: 'NUMBER_4_1', type: 'NUMBER', value: 4 },
          { id: 'NUMBER_5_1', type: 'NUMBER', value: 5 },
          { id: 'NUMBER_6_1', type: 'NUMBER', value: 6 },
        ],
      })
    ).toBe(36);
  });
});

describe('resolveCard', () => {
  it('adds number cards normally', () => {
    const state = createState();
    const nextState = resolveCard(state, 'p1', { id: 'NUMBER_5_1', type: 'NUMBER', value: 5 });

    expect(getPlayer(nextState, 'p1').hand).toHaveLength(1);
    expect(getPlayer(nextState, 'p1').active).toBe(true);
  });

  it('busts on duplicate numbers', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_5_1', type: 'NUMBER', value: 5 }],
            }
          : player
      ),
    });

    const nextState = resolveCard(state, 'p1', { id: 'NUMBER_5_2', type: 'NUMBER', value: 5 });
    const player = getPlayer(nextState, 'p1');

    expect(player.active).toBe(false);
    expect(player.hasBanked).toBe(true);
    expect(player.roundScore).toBe(0);
  });

  it('triggers flip 7 round win at seven unique numbers', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1'
          ? {
              ...player,
              hand: [
                { id: 'NUMBER_0_1', type: 'NUMBER', value: 0 },
                { id: 'NUMBER_1_1', type: 'NUMBER', value: 1 },
                { id: 'NUMBER_2_1', type: 'NUMBER', value: 2 },
                { id: 'NUMBER_3_1', type: 'NUMBER', value: 3 },
                { id: 'NUMBER_4_1', type: 'NUMBER', value: 4 },
                { id: 'NUMBER_5_1', type: 'NUMBER', value: 5 },
              ],
            }
          : player
      ),
    });

    const nextState = resolveCard(state, 'p1', { id: 'NUMBER_6_1', type: 'NUMBER', value: 6 });
    expect(nextState.roundOver).toBe(true);
    expect(getPlayer(nextState, 'p1').totalScore).toBe(36);
    expect(getPlayer(nextState, 'p1').hasBanked).toBe(true);
  });

  it('self banks on freeze when alone', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p2'
          ? { ...player, active: false }
          : {
              ...player,
              hand: [{ id: 'NUMBER_8_1', type: 'NUMBER', value: 8 }],
            }
      ),
    });

    const nextState = resolveCard(state, 'p1', { id: 'ACTION_FREEZE_1', type: 'ACTION_FREEZE', value: 0 });
    const player = getPlayer(nextState, 'p1');

    expect(player.totalScore).toBe(8);
    expect(player.active).toBe(false);
    expect(player.hasBanked).toBe(true);
  });

  it('creates pending freeze action when multiple players are active', () => {
    const state = createState();
    const nextState = resolveCard(state, 'p1', { id: 'ACTION_FREEZE_1', type: 'ACTION_FREEZE', value: 0 });

    expect(nextState.pendingAction).toEqual({
      type: 'FREEZE_TARGET',
      actingPlayerId: 'p1',
    });
  });

  it('creates pending flip three action when multiple players are active', () => {
    const state = createState();
    const nextState = resolveCard(state, 'p1', {
      id: 'ACTION_FLIP_THREE_1',
      type: 'ACTION_FLIP_THREE',
      value: 0,
    });

    expect(nextState.pendingAction).toEqual({
      type: 'FLIP_THREE_TARGET',
      actingPlayerId: 'p1',
    });
  });

  it('self targets flip three when alone', () => {
    const state = createState({
      deck: [
        { id: 'NUMBER_7_1', type: 'NUMBER', value: 7 },
        { id: 'MODIFIER_BONUS_2_1', type: 'MODIFIER_BONUS', value: 2 },
        { id: 'NUMBER_8_1', type: 'NUMBER', value: 8 },
      ],
      players: createState().players.map((player) =>
        player.id === 'p2' ? { ...player, active: false } : player
      ),
    });

    const nextState = resolveCard(state, 'p1', {
      id: 'ACTION_FLIP_THREE_1',
      type: 'ACTION_FLIP_THREE',
      value: 0,
    });

    expect(getPlayer(nextState, 'p1').hand).toHaveLength(3);
    expect(nextState.pendingAction).toBeUndefined();
  });

  it('keeps second chance when acting player has no shield', () => {
    const state = createState();
    const nextState = resolveCard(state, 'p1', {
      id: 'ACTION_SECOND_CHANCE_1',
      type: 'ACTION_SECOND_CHANCE',
      value: 0,
    });

    expect(getPlayer(nextState, 'p1').hasShield).toBe(true);
    expect(nextState.pendingAction).toBeUndefined();
  });

  it('passes second chance using pending action and guard', () => {
    const state = createState({
      players: createState().players.map((player) => ({
        ...player,
        hasShield: true,
      })),
    });

    const pendingState = resolveCard(state, 'p1', {
      id: 'ACTION_SECOND_CHANCE_1',
      type: 'ACTION_SECOND_CHANCE',
      value: 0,
    });
    expect(pendingState.pendingAction?.type).toBe('SECOND_CHANCE_TARGET');

    const nextState = resolvePendingAction(pendingState, 'p2');
    expect(nextState.pendingAction?.actingPlayerId).toBe('p2');

    const guardedState = resolvePendingAction(nextState, 'p1');
    expect(guardedState.pendingAction).toBeUndefined();
  });

  it('discards second chance immediately when only one active player remains', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1' ? { ...player, hasShield: true } : { ...player, active: false }
      ),
    });

    const nextState = resolveCard(state, 'p1', {
      id: 'ACTION_SECOND_CHANCE_1',
      type: 'ACTION_SECOND_CHANCE',
      value: 0,
    });

    expect(nextState.pendingAction).toBeUndefined();
    expect(nextState.discardPile).toHaveLength(1);
  });

  it('returns unchanged for inactive player or finished round', () => {
    const inactiveState = createState({
      players: createState().players.map((player) =>
        player.id === 'p1' ? { ...player, active: false } : player
      ),
    });
    const roundOverState = createState({ roundOver: true });
    const card = { id: 'NUMBER_3_1', type: 'NUMBER' as const, value: 3 };

    expect(resolveCard(inactiveState, 'p1', card)).toEqual(inactiveState);
    expect(resolveCard(roundOverState, 'p1', card)).toEqual(roundOverState);
  });
});

describe('pending actions and score application', () => {
  it('resolves freeze target and triggers game over at 200', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p2'
          ? {
              ...player,
              totalScore: 199,
              hand: [{ id: 'NUMBER_1_1', type: 'NUMBER', value: 1 }],
            }
          : player
      ),
      pendingAction: {
        type: 'FREEZE_TARGET',
        actingPlayerId: 'p1',
      },
    });

    const nextState = resolvePendingAction(state, 'p2');
    expect(getPlayer(nextState, 'p2').totalScore).toBe(200);
    expect(nextState.gameOver).toBe(true);
  });

  it('ignores invalid pending-action target requests', () => {
    const state = createState({
      pendingAction: {
        type: 'SECOND_CHANCE_TARGET',
        actingPlayerId: 'p1',
      },
    });

    expect(resolvePendingAction(state, 'p1')).toEqual(state);
    expect(resolvePendingAction(createState(), 'p1')).toEqual(createState());
  });

  it('resolves flip three sequentially and stops on bust', () => {
    const state = createState({
      deck: [
        { id: 'NUMBER_5_1', type: 'NUMBER', value: 5 },
        { id: 'NUMBER_5_2', type: 'NUMBER', value: 5 },
        { id: 'NUMBER_6_1', type: 'NUMBER', value: 6 },
      ],
      pendingAction: {
        type: 'FLIP_THREE_TARGET',
        actingPlayerId: 'p1',
      },
      players: createState().players.map((player) =>
        player.id === 'p2'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_3_1', type: 'NUMBER', value: 3 }],
            }
          : player
      ),
    });

    const nextState = resolvePendingAction(state, 'p2');
    expect(getPlayer(nextState, 'p2').active).toBe(false);
    expect(getPlayer(nextState, 'p2').hand).toHaveLength(3);
    expect(nextState.deck).toHaveLength(1);
  });

  it('guards applyRoundScoreToTotal when player has banked', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1'
          ? {
              ...player,
              totalScore: 30,
              hasBanked: true,
              hand: [{ id: 'NUMBER_10_1', type: 'NUMBER', value: 10 }],
            }
          : player
      ),
    });

    const nextState = applyRoundScoreToTotal(state, 'p1');
    expect(getPlayer(nextState, 'p1').totalScore).toBe(30);
  });

  it('stores winner when scores are applied', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_10_1', type: 'NUMBER', value: 10 }],
            }
          : player
      ),
    });

    const nextState = applyRoundScoreToTotal(state, 'p1');
    expect(nextState.winner).toBe('p1');
  });

  it('ends round when player stays and everyone becomes inactive', () => {
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

  it('banks remaining active players at end of round', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'p1'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_4_1', type: 'NUMBER', value: 4 }],
            }
          : { ...player, active: false }
      ),
    });

    const nextState = endRound(state);
    expect(getPlayer(nextState, 'p1').totalScore).toBe(4);
    expect(getPlayer(nextState, 'p1').hasBanked).toBe(true);
  });

  it('recycles discard pile when deck is empty', () => {
    const state = createState({
      deck: [],
      discardPile: [{ id: 'NUMBER_7_1', type: 'NUMBER', value: 7 }],
    });

    const nextState = drawForPlayer(state, 'p1');
    expect(getPlayer(nextState, 'p1').hand).toHaveLength(1);
    expect(nextState.discardPile).toEqual([]);
  });

  it('throws when both deck and discard are empty', () => {
    const state = createState({
      deck: [],
      discardPile: [],
    });

    expect(() => drawForPlayer(state, 'p1')).toThrow(
      'Cannot draw a card when both deck and discard pile are empty.'
    );
  });

  it('starts a new round with reset per-round state', () => {
    const state = createState({
      players: createState().players.map((player) => ({
        ...player,
        hand: [{ id: 'NUMBER_7_1', type: 'NUMBER', value: 7 }],
        roundScore: 7,
        active: false,
        hasBanked: true,
        hasShield: true,
      })),
      roundNumber: 1,
      deck: buildDeck(9),
    });

    const nextState = startNewRound(state);
    expect(nextState.roundNumber).toBe(2);
    expect(nextState.players.every((player) => player.hand.length === 0)).toBe(true);
    expect(nextState.players.every((player) => player.active)).toBe(true);
    expect(nextState.deck).toHaveLength(94);
  });

  it('advances to the next player or ends the round when no active players remain', () => {
    const state = createState({
      currentPlayerIndex: 0,
      players: createState().players.map((player, index) =>
        index === 1 ? { ...player, active: false } : player
      ),
    });
    const roundEndState = createState({
      players: createState().players.map((player) => ({ ...player, active: false })),
    });

    expect(advanceToNextPlayer(state).currentPlayerIndex).toBe(0);
    expect(advanceToNextPlayer(roundEndState).roundOver).toBe(true);
  });

  it('returns current state when pending action target is inactive and uses default seed', () => {
    const state = createState({
      pendingAction: {
        type: 'FREEZE_TARGET',
        actingPlayerId: 'p1',
      },
      players: createState().players.map((player) =>
        player.id === 'p2' ? { ...player, active: false } : player
      ),
    });
    const defaultSeedState = initGame(players);

    expect(resolvePendingAction(state, 'p2')).toEqual(state);
    expect(defaultSeedState.seed).toBeGreaterThan(0);
  });
});
