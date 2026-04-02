import type { Card, GameState, PlayerState } from './types';
import { drawCard } from './deck';
import { checkFlip7 } from './scoring';
import { bustCheck, applyModifierCard } from './player';
import { logGameEvent } from '../utils/eventLogger';

/**
 * Freeze: target player must immediately bank all points and exit the round.
 * If the target is the ONLY active player (which can happen during deal phase),
 * they must freeze themselves.
 */
export function resolveFreeze(state: GameState, targetId: string): GameState {
  const targetIdx = state.players.findIndex((p) => p.id === targetId);
  if (targetIdx === -1) throw new Error(`Player ${targetId} not found`);

  const target = state.players[targetIdx];
  if (target.status !== 'active') {
    // Already inactive — no-op (e.g. double freeze edge case)
    return state;
  }

  const frozenPlayer: PlayerState = { ...target, status: 'frozen' };
  const updatedPlayers = [...state.players];
  updatedPlayers[targetIdx] = frozenPlayer;

  const result: GameState = {
    ...state,
    players: updatedPlayers,
    lastEvent: {
      kind: 'freeze',
      playerId: targetId,
      message: `${target.name} is frozen!`,
    },
  };
  logGameEvent('PLAYER_FROZEN', { targetId, targetName: target.name }, result, targetId);
  return result;
}

/**
 * Begin a Flip Three on a target player.
 * Sets pendingAction so the game loop knows to draw 3 cards for that player.
 */
export function startFlipThree(state: GameState, targetId: string): GameState {
  const target = state.players.find((p) => p.id === targetId);
  if (!target) throw new Error(`Player ${targetId} not found`);

  const result: GameState = {
    ...state,
    pendingAction: {
      type: 'flip_three',
      targetPlayerId: targetId,
      cardsRemaining: 3,
      deferredActions: [],
    },
    lastEvent: {
      kind: 'flip_three_start',
      playerId: targetId,
      message: `${target.name} must draw 3 cards!`,
    },
  };
  logGameEvent('FLIP_THREE_STARTED', { targetId, targetName: target.name }, result, targetId);
  return result;
}

/**
 * Draw the next card in an ongoing Flip Three sequence.
 *
 * Rules:
 *  - Number cards: apply normally (bust check, Second Chance, add to hand)
 *  - Modifier cards: applied immediately
 *  - Action cards: DEFERRED until after all 3 cards are drawn (unless bust stops it)
 *  - Stop early if player busts or achieves Flip 7
 *  - If another Flip Three action card is drawn, it gets deferred
 *
 * Returns updated state with pendingAction updated or cleared.
 */
export function continueFlipThree(state: GameState): GameState {
  if (!state.pendingAction || state.pendingAction.type !== 'flip_three') {
    throw new Error('No pending Flip Three action');
  }

  const { targetPlayerId, cardsRemaining, deferredActions } = state.pendingAction;
  const targetIdx = state.players.findIndex((p) => p.id === targetPlayerId);
  if (targetIdx === -1) throw new Error(`Target player ${targetPlayerId} not found`);

  let target = state.players[targetIdx];
  let newState: GameState;
  let drawnCard: Card;
  [newState, drawnCard] = drawCard(state);

  // Update pending action first (decrement remaining)
  const newRemaining = cardsRemaining - 1;

  if (drawnCard.type === 'action') {
    // Defer action card — resolve AFTER flip three completes
    const newDeferred = [...deferredActions, drawnCard];
    const pendingAction = newRemaining === 0
      ? null
      : { ...newState.pendingAction!, cardsRemaining: newRemaining, deferredActions: newDeferred };

    return {
      ...newState,
      pendingAction,
      lastEvent: {
        kind: 'flip_three_card',
        playerId: targetPlayerId,
        card: drawnCard,
        message: `Action card deferred: ${drawnCard.action}`,
      },
    };
  }

  if (drawnCard.type === 'modifier') {
    target = applyModifierCard(target, drawnCard);
    const updatedPlayers = [...newState.players];
    updatedPlayers[targetIdx] = target;

    const pendingAction = newRemaining === 0
      ? null
      : { ...newState.pendingAction!, cardsRemaining: newRemaining };

    return {
      ...newState,
      players: updatedPlayers,
      pendingAction,
      lastEvent: { kind: 'flip_three_card', playerId: targetPlayerId, card: drawnCard },
    };
  }

  // Number card — check for bust
  if (bustCheck(target, drawnCard)) {
    const secondChanceIdx = target.actionCards.findIndex(
      (c) => c.action === 'second_chance'
    );

    if (secondChanceIdx !== -1) {
      // Second Chance absorbs
      const newActionCards = target.actionCards.filter((_, i) => i !== secondChanceIdx);
      target = { ...target, actionCards: newActionCards };
      const updatedPlayers = [...newState.players];
      updatedPlayers[targetIdx] = target;

      const pendingAction = newRemaining === 0
        ? null
        : { ...newState.pendingAction!, cardsRemaining: newRemaining };

      return {
        ...newState,
        players: updatedPlayers,
        pendingAction,
        discardPile: [...newState.discardPile, drawnCard],
        lastEvent: {
          kind: 'second_chance_used',
          playerId: targetPlayerId,
          card: drawnCard,
        },
      };
    }

    // Bust during Flip Three — stop immediately, discard deferred actions too
    // Keep numberCards for animation (cleared at round end)
    const bustedPlayer: PlayerState = {
      ...target,
      status: 'busted',
      roundScore: 0,
    };
    const allCards = [
      ...target.numberCards,
      ...target.modifierCards,
      ...target.actionCards,
      drawnCard,
      ...deferredActions, // deferred action cards go to discard
    ];
    const updatedPlayers = [...newState.players];
    updatedPlayers[targetIdx] = bustedPlayer;

    return {
      ...newState,
      players: updatedPlayers,
      pendingAction: null,
      discardPile: [...newState.discardPile, ...allCards],
      lastEvent: { kind: 'bust', playerId: targetPlayerId, card: drawnCard },
    };
  }

  // Normal number card during Flip Three
  target = { ...target, numberCards: [...target.numberCards, drawnCard] };

  // Check Flip 7 — if achieved, stop Flip Three immediately
  if (checkFlip7(target)) {
    const updatedPlayers = [...newState.players];
    updatedPlayers[targetIdx] = target;
    return {
      ...newState,
      players: updatedPlayers,
      pendingAction: null, // Flip Three ends
      lastEvent: { kind: 'flip_seven', playerId: targetPlayerId, card: drawnCard },
    };
  }

  const updatedPlayers = [...newState.players];
  updatedPlayers[targetIdx] = target;

  const pendingAction = newRemaining === 0
    ? null
    : { ...newState.pendingAction!, cardsRemaining: newRemaining };

  let finalState: GameState = {
    ...newState,
    players: updatedPlayers,
    pendingAction,
    lastEvent: { kind: 'flip_three_card', playerId: targetPlayerId, card: drawnCard },
  };

  return finalState;
}

/**
 * Resolve a Second Chance card being drawn or dealt to a player.
 *
 * If the player already holds one, the extra card must be passed to
 * another active player (pick the first available active player who isn't
 * the holder). If no other active player exists, discard it.
 */
export function resolveSecondChance(
  state: GameState,
  card: Card,
  receiverId: string
): GameState {
  const receiverIdx = state.players.findIndex((p) => p.id === receiverId);
  if (receiverIdx === -1) throw new Error(`Player ${receiverId} not found`);

  const receiver = state.players[receiverIdx];

  // Check if receiver already holds a Second Chance
  const alreadyHoldsOne = receiver.actionCards.some(
    (c) => c.action === 'second_chance'
  );

  if (!alreadyHoldsOne) {
    const updatedPlayers = [...state.players];
    updatedPlayers[receiverIdx] = {
      ...receiver,
      actionCards: [...receiver.actionCards, card],
    };
    return {
      ...state,
      players: updatedPlayers,
      lastEvent: { kind: 'card_drawn', playerId: receiverId, card },
    };
  }

  // Must pass to another active player
  const otherActiveIdx = state.players.findIndex(
    (p) => p.id !== receiverId && p.status === 'active'
  );

  if (otherActiveIdx !== -1) {
    const other = state.players[otherActiveIdx];
    // Check if THAT player also already holds one
    const otherAlreadyHasOne = other.actionCards.some(
      (c) => c.action === 'second_chance'
    );

    if (!otherAlreadyHasOne) {
      const updatedPlayers = [...state.players];
      updatedPlayers[otherActiveIdx] = {
        ...other,
        actionCards: [...other.actionCards, card],
      };
      return {
        ...state,
        players: updatedPlayers,
        lastEvent: {
          kind: 'second_chance_passed',
          playerId: receiverId,
          card,
          message: `Second Chance passed to ${other.name}`,
        },
      };
    }
  }

  // No valid recipient — discard the card
  return {
    ...state,
    discardPile: [...state.discardPile, card],
    lastEvent: { kind: 'second_chance_passed', playerId: receiverId, card },
  };
}
