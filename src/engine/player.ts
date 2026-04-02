import type { Card, GameState, PlayerState } from './types';
import { drawCard } from './deck';
import { checkFlip7 } from './scoring';
import { logGameEvent } from '../utils/eventLogger';

/**
 * Check if drawing `newCard` would cause a bust for `player`.
 * A bust occurs when `newCard` is a number card whose value
 * already exists in the player's number card row.
 */
export function bustCheck(player: PlayerState, newCard: Card): boolean {
  if (newCard.type !== 'number') return false;
  return player.numberCards.some((c) => c.value === newCard.value);
}

/**
 * Apply a modifier card to a player (just adds it to their modifierCards array).
 */
export function applyModifierCard(player: PlayerState, card: Card): PlayerState {
  return { ...player, modifierCards: [...player.modifierCards, card] };
}

/**
 * Process a player hitting (drawing a card from the deck).
 *
 * Handles:
 *   - Number cards → bust check → Second Chance → add to hand
 *   - Modifier cards → added above the row
 *   - Action cards → resolved immediately (except inside Flip Three)
 *   - Flip 7 detection
 *
 * Returns updated GameState. Callers should check `lastEvent` to understand
 * what happened and to trigger action card resolution UI if needed.
 */
export function hitPlayer(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) throw new Error(`Player ${playerId} not found`);

  const player = state.players[playerIndex];
  if (player.status !== 'active') {
    throw new Error(`Player ${playerId} is not active (status: ${player.status})`);
  }

  let newState: GameState;
  let drawnCard: Card;
  [newState, drawnCard] = drawCard(state);

  // Add drawn card to discard immediately (action/modifier dealt to player are
  // considered "played"; number cards stay in front of player, not discard)
  // Actually per rules: number/modifier/action cards in front of players stay there.
  // The discard pile only receives cards when a round ends or a player busts.
  // We'll not add to discard here — cards live on the player's state.

  if (drawnCard.type === 'number') {
    return handleNumberCard(newState, playerIndex, drawnCard);
  }

  if (drawnCard.type === 'modifier') {
    const updatedPlayers = [...newState.players];
    updatedPlayers[playerIndex] = applyModifierCard(player, drawnCard);
    return {
      ...newState,
      players: updatedPlayers,
      lastEvent: { kind: 'card_drawn', playerId, card: drawnCard },
    };
  }

  if (drawnCard.type === 'action') {
    // Action cards resolve immediately when drawn voluntarily (not inside flip three)
    // The store/game.ts will route to the appropriate resolver
    return {
      ...newState,
      lastEvent: { kind: 'card_drawn', playerId, card: drawnCard },
    };
  }

  return newState;
}

function handleNumberCard(
  state: GameState,
  playerIndex: number,
  card: Card
): GameState {
  const player = state.players[playerIndex];
  const isDuplicate = bustCheck(player, card);

  if (isDuplicate) {
    // Check for Second Chance
    const secondChanceIdx = player.actionCards.findIndex(
      (c) => c.action === 'second_chance'
    );

    if (secondChanceIdx !== -1) {
      // Second Chance absorbs the duplicate: remove Second Chance card + discard duplicate
      const newActionCards = player.actionCards.filter((_, i) => i !== secondChanceIdx);
      const updatedPlayer: PlayerState = { ...player, actionCards: newActionCards };
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = updatedPlayer;
      
      const result: GameState = {
        ...state,
        players: updatedPlayers,
        discardPile: [...state.discardPile, card],
        lastEvent: {
          kind: 'second_chance_used',
          playerId: player.id,
          card,
          message: 'Second Chance saved you!',
        },
      };
      logGameEvent('SECOND_CHANCE_USED', { playerId: player.id, cardValue: card.value }, result, player.id);
      return result;
    }

    // Bust! Player scores 0 for the round.
    // Keep numberCards for animation (cleared at round end)
    // Include the duplicate card that caused the bust
    const bustedPlayer: PlayerState = {
      ...player,
      numberCards: [...player.numberCards, card].sort((a, b) => (a.value ?? 0) - (b.value ?? 0)),
      status: 'busted',
      roundScore: 0,
    };
    const updatedPlayers = [...state.players];
    updatedPlayers[playerIndex] = bustedPlayer;
    
    const bustResult: GameState = {
      ...state,
      players: updatedPlayers,
      lastEvent: { kind: 'bust', playerId: player.id, card },
    };
    logGameEvent('PLAYER_BUSTED', { playerId: player.id, duplicateValue: card.value, cardCountDiscarded: bustedPlayer.numberCards.length + bustedPlayer.actionCards.length + bustedPlayer.modifierCards.length }, bustResult, player.id);
    return bustResult;
  }

  // Normal number card: add to row
  const updatedPlayer: PlayerState = {
    ...player,
    numberCards: [...player.numberCards, card].sort((a, b) => (a.value ?? 0) - (b.value ?? 0)),
  };

  // Check Flip 7
  if (checkFlip7(updatedPlayer)) {
    const updatedPlayers = [...state.players];
    updatedPlayers[playerIndex] = updatedPlayer;
    const flip7Result: GameState = {
      ...state,
      players: updatedPlayers,
      lastEvent: { kind: 'flip_seven', playerId: player.id, card },
    };
    logGameEvent('FLIP_SEVEN_ACHIEVED', { playerId: player.id, uniqueCards: updatedPlayer.numberCards.length }, flip7Result, player.id);
    return flip7Result;
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = updatedPlayer;
  const normalResult: GameState = {
    ...state,
    players: updatedPlayers,
    lastEvent: { kind: 'card_drawn', playerId: player.id, card },
  };
  logGameEvent('NUMBER_CARD_ADDED', { playerId: player.id, cardValue: card.value, uniqueCount: updatedPlayer.numberCards.length }, normalResult, player.id);
  return normalResult;
}

/**
 * Player chooses to stay — banks current hand, exits the round.
 */
export function stayPlayer(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) throw new Error(`Player ${playerId} not found`);

  const player = state.players[playerIndex];
  if (player.status !== 'active') {
    throw new Error(`Player ${playerId} is not active`);
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = { ...player, status: 'stayed' };

  const result: GameState = {
    ...state,
    players: updatedPlayers,
    lastEvent: { kind: 'stay', playerId },
  };
  logGameEvent('PLAYER_STAYED', { playerId, cardsInHand: player.numberCards.length + player.modifierCards.length }, result, playerId);
  return result;
}
