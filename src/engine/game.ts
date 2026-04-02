import type { Card, Difficulty, GameState, PlayerState } from './types';
import { buildDeck, drawCard, shuffle } from './deck';
import { applyRoundScores, checkFlip7, checkWinCondition } from './scoring';
import { hitPlayer, stayPlayer } from './player';
import { resolveFreeze, resolveSecondChance, startFlipThree, continueFlipThree } from './actions';
import { aiDecide, selectFreezeTarget, selectFlipThreeTarget } from './ai';
import { logGameEvent, logAIEvent } from '../utils/eventLogger';

// ─── Init ────────────────────────────────────────────────────────────────────

function makePlayer(id: string, name: string, isAI: boolean, difficulty?: Difficulty): PlayerState {
  return {
    id,
    name,
    isAI,
    difficulty,
    numberCards: [],
    modifierCards: [],
    actionCards: [],
    status: 'active',
    roundScore: 0,
    totalScore: 0,
  };
}

/**
 * Create the initial game state.
 * Supports 1 human vs up to 3 AI opponents.
 */
export function initGame(aiDifficulty: Difficulty = 'easy', aiCount: number = 1): GameState {
  const deck = shuffle(buildDeck());
  const human = makePlayer('human', 'You', false);
  
  const players: PlayerState[] = [human];
  
  for (let i = 0; i < Math.min(Math.max(aiCount, 1), 3); i++) {
    players.push(makePlayer(`ai-${i + 1}`, `CPU ${i + 1}`, true, aiDifficulty));
  }

  return {
    phase: 'deal',
    drawPile: deck,
    discardPile: [],
    players: players,
    dealerIndex: 0,
    activePlayerIndex: 1, // player left of dealer goes first
    roundNumber: 1,
    pendingAction: null,
    winner: null,
    lastEvent: null,
  };
}

// ─── Round Lifecycle ─────────────────────────────────────────────────────────

/**
 * Reset all players' hands for a new round (preserving total scores).
 */
function resetPlayersForRound(state: GameState): GameState {
  const resetPlayers = state.players.map((p): PlayerState => ({
    ...p,
    numberCards: [],
    modifierCards: [],
    actionCards: [],
    status: 'active',
    roundScore: 0,
  }));
  return { ...state, players: resetPlayers };
}

/**
 * Deal one card to each player in turn order.
 * If an action card is encountered during deal, resolve it immediately
 * before continuing to the next player.
 *
 * After all players have been dealt, transition to 'play' phase.
 */
export function startRound(state: GameState): GameState {
  let s = resetPlayersForRound(state);

  // Set phase to deal, and first player to deal to is dealer's left
  s = {
    ...s,
    phase: 'deal',
    activePlayerIndex: (s.dealerIndex + 1) % s.players.length,
    lastEvent: null,
  };

  return s;
}

/**
 * Deal exactly one card to the activePlayerIndex, then advance activePlayerIndex.
 */
function dealNextCard(state: GameState): GameState {
  if (state.phase !== 'deal') return state;

  let s = { ...state };
  const playerIdx = s.activePlayerIndex;
  const player = s.players[playerIdx];

  // If player is inactive (e.g. frozen from another player's action card dealt earlier), we still count it as their deal turn, but they get no card.
  if (player.status !== 'active') {
    s.activePlayerIndex = (s.activePlayerIndex + 1) % s.players.length;
    return s;
  }

  let card: Card;
  [s, card] = drawCard(s);
  
  logGameEvent('CARD_DEALT', { playerId: player.id, cardType: card.type, cardValue: card.value || card.modifier || card.action }, s, player.id);
  
  s.lastEvent = { kind: 'card_drawn', playerId: player.id, card };

  if (card.type === 'number') {
    const updatedPlayers = [...s.players];
    updatedPlayers[playerIdx] = {
      ...player,
      numberCards: [...player.numberCards, card].sort((a, b) => (a.value ?? 0) - (b.value ?? 0)),
    };
    s.players = updatedPlayers;
  } else if (card.type === 'modifier') {
    const updatedPlayers = [...s.players];
    updatedPlayers[playerIdx] = {
      ...player,
      modifierCards: [...player.modifierCards, card],
    };
    s.players = updatedPlayers;
  } else if (card.type === 'action') {
    s = resolveActionCard(s, card, player.id);
  }

  s.activePlayerIndex = (s.activePlayerIndex + 1) % s.players.length;
  return s;
}

/**
 * Route an action card to the correct resolver.
 * During deal phase, AI action card logic applies for targeting.
 * `actorId` is the player who received the action card.
 */
export function resolveActionCard(state: GameState, card: Card, actorId: string): GameState {
  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) return state;

  if (card.action === 'freeze') {
    // Target: the active player with the highest score (excluding self if possible)
    const targetId = selectFreezeTarget(actorId, state);
    const discardState = { ...state, discardPile: [...state.discardPile, card] };
    return targetId ? resolveFreeze(discardState, targetId) : discardState;
  }

  if (card.action === 'flip_three') {
    const targetId = selectFlipThreeTarget(actorId, state);
    if (!targetId) {
      // No valid target — discard the card
      return { ...state, discardPile: [...state.discardPile, card] };
    }
    const discardState = { ...state, discardPile: [...state.discardPile, card] };
    return startFlipThree(discardState, targetId);
  }

  if (card.action === 'second_chance') {
    return resolveSecondChance(state, card, actorId);
  }

  return state;
}

/**
 * Advance to the next active player.
 * Returns updated state with `activePlayerIndex` pointing to the next player.
 * If all players are done (stayed/busted/frozen), transitions to round_end.
 */
export function nextTurn(state: GameState): GameState {
  const numPlayers = state.players.length;
  let nextIdx = (state.activePlayerIndex + 1) % numPlayers;

  // Find the next active player
  let found = false;
  for (let i = 0; i < numPlayers; i++) {
    const candidate = state.players[nextIdx];
    if (candidate.status === 'active') {
      found = true;
      break;
    }
    nextIdx = (nextIdx + 1) % numPlayers;
  }

  if (!found) {
    // All players are done — end the round
    return endRound(state);
  }

  return { ...state, activePlayerIndex: nextIdx };
}

export function endRound(state: GameState, flip7WinnerId: string | null = null): GameState {
  // Apply round scores
  let s = applyRoundScores(state, flip7WinnerId);
  
  logGameEvent('ROUND_ENDED', { flip7WinnerId, scores: s.players.map(p => ({ id: p.id, roundScore: p.roundScore, totalScore: p.totalScore })) }, s);

  // Check for game win
  const winnerId = checkWinCondition(s);
  if (winnerId) {
    logGameEvent('GAME_OVER', { winnerId, finalScores: s.players.map(p => ({ id: p.id, totalScore: p.totalScore })) }, s, winnerId);
    return {
      ...s,
      phase: 'game_over',
      winner: winnerId,
      lastEvent: { kind: 'game_over', playerId: winnerId },
    };
  }

  // Move all player cards to discard
  const allPlayerCards: Card[] = [];
  s.players.forEach((p) => {
    allPlayerCards.push(...p.numberCards, ...p.modifierCards, ...p.actionCards);
  });

  // Rotate dealer (simple rotation for now)
  const newDealerIndex = (s.dealerIndex + 1) % s.players.length;

  return {
    ...s,
    phase: 'round_end',
    discardPile: [...s.discardPile, ...allPlayerCards],
    dealerIndex: newDealerIndex,
    roundNumber: s.roundNumber + 1,
    lastEvent: { kind: 'round_end', playerId: '' },
  };
}

// ─── High-Level Game Actions ─────────────────────────────────────────────────

/**
 * Human player hits. Handles the full turn cycle including:
 * - Drawing the card
 * - Resolving bust/Flip 7/action cards
 * - Advancing turn if needed
 */
export function humanHit(state: GameState): GameState {
  const humanPlayer = state.players.find((p) => !p.isAI);
  if (!humanPlayer) return state;
  if (humanPlayer.status !== 'active') return state;

  let s = hitPlayer(state, humanPlayer.id);
  const event = s.lastEvent;

  if (!event) return s;

  if (event.kind === 'bust') {
    return nextTurn(s);
  }

  if (event.kind === 'flip_seven') {
    return endRound(s, humanPlayer.id);
  }

  if (event.kind === 'card_drawn' && event.card?.type === 'action') {
    // Resolve the action card
    s = resolveActionCard(s, event.card, humanPlayer.id);
  }

  // Do not advance turn if there's a pending action (like Flip Three)
  if (s.pendingAction) {
    return s;
  }

  return nextTurn(s);
}

/**
 * Utility function to be called by the store after resolving a pending action.
 * Advances the turn.
 */
export function finishPendingAction(state: GameState): GameState {
  if (state.pendingAction) {
    return state; // Still pending
  }
  return nextTurn(state);
}

/**
 * Human player stays.
 */
export function humanStay(state: GameState): GameState {
  const humanPlayer = state.players.find((p) => !p.isAI);
  if (!humanPlayer) return state;
  if (humanPlayer.status !== 'active') return state;

  const s = stayPlayer(state, humanPlayer.id);
  return nextTurn(s);
}

/**
 * Execute the AI's turn fully (synchronously).
 * The store should add artificial delay BEFORE calling this.
 */
export function executeAITurn(state: GameState): GameState {
  const aiPlayer = state.players.find((p) => p.isAI);
  if (!aiPlayer || aiPlayer.status !== 'active') return nextTurn(state);

  const decision = aiDecide(aiPlayer, state, aiPlayer.difficulty ?? 'easy');
  logAIEvent('AI_DECISION', { playerId: aiPlayer.id, decision, difficulty: aiPlayer.difficulty }, state, aiPlayer.id);

  if (decision === 'stay') {
    const s = stayPlayer(state, aiPlayer.id);
    return nextTurn(s);
  }

  // AI hits
  let s = hitPlayer(state, aiPlayer.id);
  const event = s.lastEvent;

  if (!event) return nextTurn(s);

  if (event.kind === 'bust') {
    return nextTurn(s);
  }

  if (event.kind === 'flip_seven') {
    return endRound(s, aiPlayer.id);
  }

  if (event.kind === 'card_drawn' && event.card?.type === 'action') {
    s = resolveActionCard(s, event.card, aiPlayer.id);

    // Resolve any Flip Three immediately for AI
    while (s.pendingAction?.type === 'flip_three') {
      const target = s.players.find(
        (p) => p.id === s.pendingAction?.targetPlayerId
      );
      if (!target || target.status !== 'active') break;
      s = continueFlipThree(s);

      if (s.lastEvent?.kind === 'bust' || s.lastEvent?.kind === 'flip_seven') {
        if (s.lastEvent.kind === 'flip_seven') {
          return endRound(s, s.lastEvent.playerId);
        }
        break;
      }
    }
  }

  // If a pending action is still active (e.g. paused for animation), wait.
  // Note: executeAITurn is fully synchronous for its own actions, so it should have resolved its own flip three unless targeting a human.
  // Wait, if AI targets human, the AI's flip three resolves immediately in the loop above.
  if (s.pendingAction) {
    return s;
  }

  return nextTurn(s);
}

// Re-export continueFlipThree and dealNextCard for the store to use
export { continueFlipThree, dealNextCard, hitPlayer, stayPlayer, resolveActionCard as resolveAction };
export { checkFlip7 };
