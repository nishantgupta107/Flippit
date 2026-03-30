import type { Card, GameState, PlayerState } from './types';
import { drawCard } from './deck';
import { checkFlip7 } from './scoring';

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

      return {
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
    }

    // Bust! Player scores 0 for the round. All their cards go to discard.
    const bustedPlayer: PlayerState = {
      ...player,
      status: 'busted',
      roundScore: 0,
      numberCards: [],
      modifierCards: [],
      actionCards: [],
    };
    const allPlayerCards = [
      ...player.numberCards,
      ...player.modifierCards,
      ...player.actionCards,
      card, // the duplicate that caused the bust
    ];
    const updatedPlayers = [...state.players];
    updatedPlayers[playerIndex] = bustedPlayer;

    return {
      ...state,
      players: updatedPlayers,
      discardPile: [...state.discardPile, ...allPlayerCards],
      lastEvent: { kind: 'bust', playerId: player.id, card },
    };
  }

  // Normal number card: add to row
  const updatedPlayer: PlayerState = {
    ...player,
    numberCards: [...player.numberCards, card],
  };

  // Check Flip 7
  if (checkFlip7(updatedPlayer)) {
    const updatedPlayers = [...state.players];
    updatedPlayers[playerIndex] = updatedPlayer;
    return {
      ...state,
      players: updatedPlayers,
      lastEvent: { kind: 'flip_seven', playerId: player.id, card },
    };
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = updatedPlayer;
  return {
    ...state,
    players: updatedPlayers,
    lastEvent: { kind: 'card_drawn', playerId: player.id, card },
  };
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

  return {
    ...state,
    players: updatedPlayers,
    lastEvent: { kind: 'stay', playerId },
  };
}
