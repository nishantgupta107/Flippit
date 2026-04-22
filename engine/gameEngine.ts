import { buildDeck, drawCard, shuffleDeck, DEFAULT_SEED } from './deck';
import { getNextActivePlayer, isRoundOver } from './gameLoop';
import type { Card, GamePhase, GameState, PendingAction, PlayerInput, PlayerState } from './types';

function clonePlayer(player: PlayerState, updates: Partial<PlayerState>): PlayerState {
  return {
    ...player,
    ...updates,
  };
}

function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((player) => player.active);
}

function getPlayerIndex(state: GameState, playerId: string): number {
  return state.players.findIndex((player) => player.id === playerId);
}

function assertPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error(`Player not found: ${playerId}`);
  }

  return player;
}

function updatePlayer(state: GameState, playerId: string, updates: Partial<PlayerState>): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? clonePlayer(player, updates) : player
    ),
  };
}

function updateWinner(state: GameState): GameState {
  if (state.players.length === 0) {
    return state;
  }

  const winner = state.players.reduce<PlayerState>((leader, player) => {
    if (player.totalScore > leader.totalScore) {
      return player;
    }

    return leader;
  }, state.players[0]);

  return {
    ...state,
    winner: winner.id,
  };
}

function syncPhase(state: GameState): GameState {
  let phase: GamePhase;
  if (state.gameOver) {
    phase = 'GAME_OVER';
  } else if (isRoundOver(state)) {
    phase = 'ROUND_OVER';
  } else if (state.pendingAction) {
    phase = 'DECISION';
  } else {
    phase = 'PLAYER_TURN';
  }

  return {
    ...state,
    roundOver: isRoundOver(state),
    phase,
  };
}

function createRoundSeed(baseSeed: number, roundNumber: number): number {
  return baseSeed + roundNumber;
}

function recycleDeckIfNeeded(state: GameState): GameState {
  if (state.deck.length > 0) {
    return state;
  }

  if (state.discardPile.length === 0) {
    throw new Error('Cannot draw a card when both deck and discard pile are empty.');
  }

  return {
    ...state,
    deck: shuffleDeck(state.discardPile),
    discardPile: [],
  };
}

function drawFromState(state: GameState): { state: GameState; card: Card } {
  const drawableState = recycleDeckIfNeeded(state);
  const { card, remainingDeck } = drawCard(drawableState.deck);

  return {
    state: {
      ...drawableState,
      deck: remainingDeck,
    },
    card,
  };
}

function clearPendingAction(state: GameState): GameState {
  return {
    ...state,
    pendingAction: undefined,
    pendingActionPassCount: undefined,
  };
}

function discardActionCard(state: GameState, card: Card): GameState {
  return {
    ...state,
    discardPile: [...state.discardPile, card],
  };
}

function applyFreezeTarget(state: GameState, targetPlayerId: string): GameState {
  const target = assertPlayer(state, targetPlayerId);
  let nextState = applyRoundScoreToTotal(state, target.id);
  nextState = updatePlayer(nextState, target.id, {
    active: false,
    hasBanked: true,
    outReason: 'FROZEN',
  });

  return syncPhase({
    ...clearPendingAction(nextState),
    lastEvent: {
      kind: 'freeze',
      playerId: targetPlayerId,
      message: 'Frozen!',
    },
  });
}

function resolveFlipThreeTarget(state: GameState, targetPlayerId: string): GameState {
  let nextState = clearPendingAction(state);

  for (let count = 0; count < 3; count += 1) {
    const target = assertPlayer(nextState, targetPlayerId);
    if (!target.active || nextState.roundOver) {
      break;
    }

    const drawResult = drawFromState(nextState);
    nextState = resolveCard(drawResult.state, targetPlayerId, drawResult.card);

    if (nextState.roundOver || !assertPlayer(nextState, targetPlayerId).active) {
      break;
    }
  }

  return syncPhase(nextState);
}

function resolveSecondChanceTarget(state: GameState, targetPlayerId: string): GameState {
  const pendingAction = state.pendingAction;
  if (!pendingAction || pendingAction.type !== 'SECOND_CHANCE_TARGET') {
    return state;
  }

  const activeCount = activePlayers(state).length;
  const target = assertPlayer(state, targetPlayerId);
  const nextPassCount = (state.pendingActionPassCount ?? 0) + 1;

  if (!target.active || target.id === pendingAction.actingPlayerId) {
    return state;
  }

  if (!target.hasShield) {
    const nextState = updatePlayer(clearPendingAction(state), target.id, {
      hasShield: true,
    });
    return syncPhase({
      ...nextState,
      lastEvent: {
        kind: 'second_chance_passed',
        playerId: target.id,
        message: 'Second Chance received!',
      },
    });
  }

  if (activeCount <= 1 || nextPassCount >= activeCount || activeCount === activePlayers(state).filter(p => p.hasShield).length) {
    return syncPhase({
      ...clearPendingAction(state),
      lastEvent: {
        kind: 'second_chance_discarded',
        playerId: pendingAction.actingPlayerId,
        message: 'Second Chance discarded!',
      },
    });
  }

  return syncPhase({
    ...state,
    pendingAction: {
      type: 'SECOND_CHANCE_TARGET',
      actingPlayerId: target.id,
    },
    pendingActionPassCount: nextPassCount,
  });
}

export function calculateRoundScore(player: PlayerState): number {
  const baseScore = player.hand
    .filter((card) => card.type === 'NUMBER')
    .reduce((sum, card) => sum + card.value, 0);
  const multiplierCards = player.hand.filter((card) => card.type === 'MODIFIER_MULT');
  const multiplier =
    multiplierCards.length === 0
      ? 1
      : multiplierCards.reduce((product, card) => product * card.value, 1);
  const bonus = player.hand
    .filter((card) => card.type === 'MODIFIER_BONUS')
    .reduce((sum, card) => sum + card.value, 0);
  const numberCount = player.hand.filter((card) => card.type === 'NUMBER').length;

  let score = baseScore * multiplier + bonus;
  if (numberCount >= 7) {
    score += 15;
  }

  return score;
}

export function applyRoundScoreToTotal(state: GameState, playerId: string): GameState {
  const player = assertPlayer(state, playerId);

  if (player.hasBanked) {
    return state;
  }

  const roundScore = calculateRoundScore(player);
  let nextState = {
    ...state,
    players: state.players.map((entry) =>
      entry.id === playerId
        ? {
            ...entry,
            roundScore,
            totalScore: entry.totalScore + roundScore,
          }
        : entry
    ),
  };

  const updatedPlayer = assertPlayer(nextState, playerId);
  if (updatedPlayer.totalScore >= 200) {
    nextState = {
      ...nextState,
      gameOver: true,
    };
  }

  return syncPhase(updateWinner(nextState));
}

export function resolveCard(state: GameState, playerId: string, card: Card): GameState {
  const player = assertPlayer(state, playerId);

  if (!player.active || state.roundOver) {
    return state;
  }

  // Preserve the initial card drawn event, unless overwritten later (e.g. by bust, etc.)
  let nextState = state;
  if (!nextState.lastEvent || nextState.lastEvent.card?.id !== card.id) {
    nextState = {
      ...state,
      lastEvent: {
        kind: 'card_drawn',
        playerId: playerId,
        card: card
      }
    };
  }

  if (card.type === 'ACTION_SECOND_CHANCE') {
    nextState = discardActionCard(nextState, card);

    if (!player.hasShield) {
      nextState = updatePlayer(nextState, playerId, { hasShield: true });
      return syncPhase(nextState);
    }

    if (activePlayers(nextState).length <= 1 || activePlayers(nextState).every(p => p.hasShield)) {
      return syncPhase(nextState);
    }

    const pendingAction: PendingAction = {
      type: 'SECOND_CHANCE_TARGET',
      actingPlayerId: playerId,
    };

    return syncPhase({
      ...nextState,
      pendingAction,
      pendingActionPassCount: 0,
    });
  }

  if (card.type === 'ACTION_FREEZE') {
    nextState = discardActionCard(nextState, card);

    if (activePlayers(nextState).length <= 1) {
      nextState = applyRoundScoreToTotal(nextState, playerId);
      nextState = updatePlayer(nextState, playerId, {
        active: false,
        hasBanked: true,
        outReason: 'FROZEN',
      });
      return syncPhase({
        ...nextState,
        lastEvent: {
          kind: 'freeze',
          playerId,
          message: 'Frozen!',
        },
      });
    }

    return syncPhase({
      ...nextState,
      pendingAction: {
        type: 'FREEZE_TARGET',
        actingPlayerId: playerId,
      },
    });
  }

  if (card.type === 'ACTION_FLIP_THREE') {
    nextState = discardActionCard(nextState, card);
    // Always surface a FLIP_THREE_TARGET pending action — even when only 1
    // active player remains. The store layer decides whether to show the
    // interactive overlay (human alone → tension reveal) or auto-resolve
    // (bot alone → synchronous engine resolution).
    return syncPhase({
      ...nextState,
      pendingAction: {
        type: 'FLIP_THREE_TARGET',
        actingPlayerId: playerId,
      },
    });
  }

  if (card.type === 'NUMBER') {
    const nextHand = [...player.hand, card];
    nextState = updatePlayer(nextState, playerId, {
      hand: nextHand,
    });
    const numberCards = nextHand.filter((entry) => entry.type === 'NUMBER');
    const duplicateCount = numberCards.filter((entry) => entry.value === card.value).length;

    if (duplicateCount > 1) {
      if (player.hasShield) {
        // Player is saved from busting by their shield
        let savedState = discardActionCard(nextState, card); // Discard the duplicate NUMBER card

        // Remove from hand again
        savedState = updatePlayer(savedState, playerId, {
          hand: player.hand,
          hasShield: false, // Update "Shield No"
        });
        return syncPhase({
          ...savedState,
          lastEvent: {
            kind: 'second_chance_used',
            playerId,
            card,
            message: 'Second Chance used!',
          },
        });
      }

      return syncPhase({
        ...updatePlayer(nextState, playerId, {
          roundScore: 0,
          active: false,
          hasBanked: true,
          outReason: 'BUSTED',
        }),
        lastEvent: {
          kind: 'bust',
          playerId,
          card,
          message: 'Busted!',
        },
      });
    }

    if (numberCards.length >= 7) {
      let scoredState = applyRoundScoreToTotal(nextState, playerId);
      scoredState = updatePlayer(scoredState, playerId, {
        hasBanked: true,
      });

      return syncPhase({
        ...scoredState,
        roundOver: true,
      });
    }

    return syncPhase(nextState);
  }

  return syncPhase(
    updatePlayer(nextState, playerId, {
      hand: [...player.hand, card],
    })
  );
}

export function resolvePendingAction(state: GameState, targetPlayerId: string): GameState {
  const pendingAction = state.pendingAction;
  if (!pendingAction) {
    return state;
  }

  const target = assertPlayer(state, targetPlayerId);
  if (!target.active) {
    return state;
  }

  let nextState = state;
  if (pendingAction.type === 'FREEZE_TARGET') {
    nextState = applyFreezeTarget(state, targetPlayerId);
  } else if (pendingAction.type === 'FLIP_THREE_TARGET') {
    nextState = resolveFlipThreeTarget(state, targetPlayerId);
  } else {
    nextState = resolveSecondChanceTarget(state, targetPlayerId);
  }

  // Only advance turn AFTER the entire Action chain (including nested Flip Threes) is resolved.
  return advanceToNextPlayer(nextState);
}

export function playerStay(state: GameState, playerId: string): GameState {
  let nextState = applyRoundScoreToTotal(state, playerId);
  nextState = updatePlayer(nextState, playerId, {
    active: false,
    hasBanked: true,
    outReason: 'BANKED',
  });

  if (nextState.players.every((player) => !player.active)) {
    nextState = {
      ...nextState,
      roundOver: true,
    };
  }

  return advanceToNextPlayer(nextState);
}

export function endRound(state: GameState): GameState {
  let nextState = state;

  for (const player of nextState.players) {
    if (player.active && !player.hasBanked) {
      nextState = applyRoundScoreToTotal(nextState, player.id);
      nextState = updatePlayer(nextState, player.id, {
        hasBanked: true,
      });
    }
  }

  return syncPhase({
    ...nextState,
    roundOver: true,
  });
}

export function startNewRound(state: GameState): GameState {
  const nextRoundNumber = state.roundNumber + 1;
  const roundSeed = createRoundSeed(state.seed, nextRoundNumber);

  // Collect all cards from player hands to add to discard pile
  const cardsFromHands = state.players.flatMap((player) => player.hand);

  return {
    ...state,
    phase: 'DEALING',
    players: state.players.map((player) => ({
      ...player,
      hand: [],
      roundScore: 0,
      active: true,
      hasBanked: false,
      hasShield: false,
      outReason: undefined,
    })),
    // Preserve deck between rounds - only reshuffle when deck is empty
    deck: state.deck,
    // Add cards from player hands to discard pile so they can be recycled
    discardPile: [...state.discardPile, ...cardsFromHands],
    roundNumber: nextRoundNumber,
    roundSeed,
    roundOver: false,
    gameOver: false,
    winner: null,
    pendingAction: undefined,
    pendingActionPassCount: undefined,
    currentPlayerIndex: 0,
  };
}

export function initGame(players: PlayerInput[], seed?: number): GameState {
  const normalizedSeed =
    typeof seed === 'number' && Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) || DEFAULT_SEED : DEFAULT_SEED;

  return {
    phase: 'DEALING',
    players: players.map((player) => ({
      ...player,
      hand: [],
      roundScore: 0,
      totalScore: 0,
      active: true,
      hasBanked: false,
      hasShield: false,
      outReason: undefined,
    })),
    deck: buildDeck(normalizedSeed),
    discardPile: [],
    currentPlayerIndex: 0,
    roundNumber: 1,
    roundOver: false,
    gameOver: false,
    winner: null,
    seed: normalizedSeed,
    roundSeed: createRoundSeed(normalizedSeed, 1),
    pendingAction: undefined,
    pendingActionPassCount: undefined,
  };
}

export function advanceToNextPlayer(state: GameState): GameState {
  if (state.pendingAction || state.roundOver || state.gameOver) {
    return syncPhase(state);
  }

  const nextPlayerId = getNextActivePlayer(state);
  if (!nextPlayerId) {
    return syncPhase({
      ...state,
      roundOver: true,
    });
  }

  return syncPhase({
    ...state,
    currentPlayerIndex: getPlayerIndex(state, nextPlayerId),
  });
}

/**
 * Applies a freeze to `targetPlayerId` without advancing the turn.
 * Used by the FlipThree overlay state machine when a Freeze card is
 * encountered mid-reveal and the user selects a sub-target.
 */
export function applyFreezeEffect(state: GameState, targetPlayerId: string): GameState {
  return applyFreezeTarget(state, targetPlayerId);
}

/**
 * Resolves a Second Chance pass to `targetPlayerId` without advancing the turn.
 * Used by the FlipThree overlay state machine when a Second Chance card
 * requires passing the shield to another player mid-reveal.
 */
export function resolveSecondChanceEffect(state: GameState, targetPlayerId: string): GameState {
  return resolveSecondChanceTarget(state, targetPlayerId);
}

/**
 * Deals 3 cards to `targetPlayerId` and resolves each one synchronously.
 * Used by the store when a bot is the Flip Three acting player — no overlay
 * is shown and resolution proceeds directly through the engine.
 */
export function resolveFlipThreeForBot(state: GameState, targetPlayerId: string): GameState {
  return resolveFlipThreeTarget(state, targetPlayerId);
}

export function drawForPlayer(state: GameState, playerId: string): GameState {
  const drawResult = drawFromState(state);

  // Set lastEvent for drawn card BEFORE resolving to match expected structure
  let nextState: GameState = {
    ...drawResult.state,
    lastEvent: {
      kind: 'card_drawn',
      playerId: playerId,
      card: drawResult.card
    }
  };

  nextState = resolveCard(nextState, playerId, drawResult.card);
  
  // Advance turn AFTER the card is resolved (this includes potentially deep Flip Three chains).
  return advanceToNextPlayer(nextState);
}
