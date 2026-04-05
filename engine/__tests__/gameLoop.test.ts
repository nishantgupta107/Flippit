import { easyBotDecide, getBotActionTarget, hardBotDecide, mediumBotDecide } from '../aiPlayer';
import { getWinner, getNextActivePlayer, isGameOver, isRoundOver } from '../gameLoop';
import { initGame } from '../gameEngine';
import type { GameState, PlayerInput } from '../types';

const players: PlayerInput[] = [
  { id: 'human', name: 'Human', avatar: 'H', isBot: false },
  { id: 'easy', name: 'Easy', avatar: 'E', isBot: true, botDifficulty: 'EASY' },
  { id: 'hard', name: 'Hard', avatar: 'X', isBot: true, botDifficulty: 'HARD' },
];

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initGame(players, 33),
    phase: 'PLAYER_TURN',
    ...overrides,
  };
}

describe('gameLoop', () => {
  it('finds the next active player in round robin order', () => {
    const state = createState({
      currentPlayerIndex: 0,
      players: createState().players.map((player, index) =>
        index === 1 ? { ...player, active: false } : player
      ),
    });

    expect(getNextActivePlayer(state)).toBe('hard');
  });

  it('reports round and game over state correctly', () => {
    const roundOverState = createState({
      players: createState().players.map((player) => ({ ...player, active: false })),
    });
    const gameOverState = createState({
      gameOver: true,
      players: createState().players.map((player, index) => ({
        ...player,
        totalScore: index === 2 ? 220 : 100,
      })),
    });

    expect(isRoundOver(roundOverState)).toBe(true);
    expect(isGameOver(gameOverState)).toBe(true);
    expect(getWinner(gameOverState)?.id).toBe('hard');
  });

  it('handles empty and non-terminal winner cases', () => {
    const emptyState = createState({ players: [] });
    const liveState = createState();

    expect(getNextActivePlayer(emptyState)).toBeNull();
    expect(getWinner(liveState)).toBeNull();
  });
});

describe('aiPlayer', () => {
  it('uses easy heuristics for hit and stay', () => {
    const hitState = createState();
    const stayState = createState({
      players: createState().players.map((player) =>
        player.id === 'easy'
          ? {
              ...player,
              hand: [
                { id: 'NUMBER_1_1', type: 'NUMBER', value: 1 },
                { id: 'NUMBER_2_1', type: 'NUMBER', value: 2 },
                { id: 'NUMBER_3_1', type: 'NUMBER', value: 3 },
                { id: 'NUMBER_4_1', type: 'NUMBER', value: 4 },
              ],
            }
          : player
      ),
    });

    expect(easyBotDecide(hitState, 'easy')).toBe('HIT');
    expect(easyBotDecide(stayState, 'easy')).toBe('STAY');
  });

  it('stays on medium difficulty when bust probability exceeds threshold', () => {
    const state = createState({
      deck: [
        { id: 'NUMBER_5_1', type: 'NUMBER', value: 5 },
        { id: 'NUMBER_5_2', type: 'NUMBER', value: 5 },
        { id: 'NUMBER_5_3', type: 'NUMBER', value: 5 },
        { id: 'NUMBER_1_1', type: 'NUMBER', value: 1 },
      ],
      players: createState().players.map((player) =>
        player.id === 'easy'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_5_0', type: 'NUMBER', value: 5 }],
            }
          : player
      ),
    });

    expect(mediumBotDecide(state, 'easy')).toBe('STAY');
  });

  it('hits on medium difficulty when bust probability is low or drawable cards come from discard', () => {
    const state = createState({
      deck: [],
      discardPile: [
        { id: 'NUMBER_1_1', type: 'NUMBER', value: 1 },
        { id: 'MODIFIER_BONUS_2_1', type: 'MODIFIER_BONUS', value: 2 },
      ],
      players: createState().players.map((player) =>
        player.id === 'easy'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_9_1', type: 'NUMBER', value: 9 }],
            }
          : player
      ),
    });

    expect(mediumBotDecide(state, 'easy')).toBe('HIT');
  });

  it('treats an empty drawable pool as safe for medium and low-value for hard EV', () => {
    const state = createState({
      deck: [],
      discardPile: [],
    });

    expect(mediumBotDecide(state, 'easy')).toBe('HIT');
    expect(hardBotDecide(state, 'hard')).toBe('STAY');
  });

  it('uses EV logic for hard difficulty', () => {
    const state = createState({
      deck: [
        { id: 'NUMBER_9_1', type: 'NUMBER', value: 9 },
        { id: 'NUMBER_9_2', type: 'NUMBER', value: 9 },
      ],
      players: createState().players.map((player) =>
        player.id === 'hard'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_9_0', type: 'NUMBER', value: 9 }],
            }
          : player
      ),
    });

    expect(hardBotDecide(state, 'hard')).toBe('STAY');
  });

  it('hits on hard difficulty when expected value is strongly positive', () => {
    const state = createState({
      deck: [
        { id: 'NUMBER_12_1', type: 'NUMBER', value: 12 },
        { id: 'MODIFIER_BONUS_10_1', type: 'MODIFIER_BONUS', value: 10 },
      ],
      players: createState().players.map((player) =>
        player.id === 'hard'
          ? {
              ...player,
              hand: [{ id: 'NUMBER_1_1', type: 'NUMBER', value: 1 }],
            }
          : player
      ),
    });

    expect(hardBotDecide(state, 'hard')).toBe('HIT');
  });

  it('always hits when hard bot is one card from flip 7', () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.id === 'hard'
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

    expect(hardBotDecide(state, 'hard')).toBe('HIT');
  });

  it('chooses hard targets by action type', () => {
    const state = createState({
      pendingAction: {
        type: 'FREEZE_TARGET',
        actingPlayerId: 'hard',
      },
      players: createState().players.map((player) => {
        if (player.id === 'human') {
          return { ...player, totalScore: 30 };
        }

        if (player.id === 'easy') {
          return { ...player, totalScore: 10 };
        }

        return { ...player, totalScore: 20 };
      }),
    });

    expect(getBotActionTarget(state, 'hard')).toBe('human');

    const secondChanceState = {
      ...state,
      pendingAction: {
        type: 'SECOND_CHANCE_TARGET' as const,
        actingPlayerId: 'hard',
      },
    };

    expect(getBotActionTarget(secondChanceState, 'hard')).toBe('easy');
  });

  it('chooses the later leading player on hard freeze targeting', () => {
    const state = createState({
      pendingAction: {
        type: 'FREEZE_TARGET',
        actingPlayerId: 'hard',
      },
      players: createState().players.map((player) => {
        if (player.id === 'human') {
          return { ...player, totalScore: 5 };
        }

        if (player.id === 'easy') {
          return { ...player, totalScore: 50 };
        }

        return { ...player, totalScore: 20 };
      }),
    });

    expect(getBotActionTarget(state, 'hard')).toBe('easy');
  });

  it('chooses deterministic random targets for easy and medium bots', () => {
    const easyState = createState({
      pendingAction: {
        type: 'FREEZE_TARGET',
        actingPlayerId: 'easy',
      },
    });
    const mediumState = createState({
      pendingAction: {
        type: 'SECOND_CHANCE_TARGET',
        actingPlayerId: 'easy',
      },
      players: createState().players.map((player) =>
        player.id === 'easy'
          ? { ...player, botDifficulty: 'MEDIUM' as const }
          : player
      ),
    });

    const easyTarget = getBotActionTarget(easyState, 'easy');
    const mediumTarget = getBotActionTarget(mediumState, 'easy');

    expect(easyTarget).toBe(getBotActionTarget(easyState, 'easy'));
    expect(['human', 'hard']).toContain(easyTarget);
    expect(mediumTarget).toBe(getBotActionTarget(mediumState, 'easy'));
    expect(['human', 'hard']).toContain(mediumTarget);
  });

  it('returns null or throws for invalid target selection states', () => {
    const noPending = createState();
    const noCandidates = createState({
      pendingAction: {
        type: 'SECOND_CHANCE_TARGET',
        actingPlayerId: 'easy',
      },
      players: createState().players.map((player) =>
        player.id === 'easy' ? player : { ...player, active: false }
      ),
    });

    expect(getBotActionTarget(noPending, 'easy')).toBeNull();
    expect(getBotActionTarget(noCandidates, 'easy')).toBeNull();
    expect(() => easyBotDecide(noPending, 'missing')).toThrow('Player not found: missing');
  });
});
