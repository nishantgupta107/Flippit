import { createSeededRandom } from './deck';
import { calculateRoundScore } from './gameEngine';
import type { Card, GameState, PlayerState } from './types';

type BotDecision = 'HIT' | 'STAY';

function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error(`Player not found: ${playerId}`);
  }

  return player;
}

function getDrawableCards(state: GameState): Card[] {
  if (state.deck.length > 0) {
    return state.deck;
  }

  return state.discardPile;
}

function getNumberValues(player: PlayerState): Set<number> {
  return new Set(
    player.hand.filter((card) => card.type === 'NUMBER').map((card) => card.value)
  );
}

function calculateBustProbability(state: GameState, playerId: string): number {
  const player = getPlayer(state, playerId);
  const drawableCards = getDrawableCards(state);

  if (drawableCards.length === 0) {
    return 0;
  }

  const values = getNumberValues(player);
  const bustCards = drawableCards.filter(
    (card) => card.type === 'NUMBER' && values.has(card.value)
  ).length;

  return bustCards / drawableCards.length;
}

function calculateExpectedGain(state: GameState, playerId: string): number {
  const player = getPlayer(state, playerId);
  const drawableCards = getDrawableCards(state);
  if (drawableCards.length === 0) {
    return 0;
  }

  const currentScore = calculateRoundScore(player);
  const values = getNumberValues(player);
  const gains = drawableCards
    .filter((card) => !(card.type === 'NUMBER' && values.has(card.value)))
    .map((card) => {
      const simulatedPlayer: PlayerState = {
        ...player,
        hand: [...player.hand, card],
      };
      return calculateRoundScore(simulatedPlayer) - currentScore;
    });

  if (gains.length === 0) {
    return 0;
  }

  return gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
}

function chooseRandomTarget(state: GameState, actingPlayerId: string): string | null {
  const pendingAction = state.pendingAction;
  if (!pendingAction) {
    return null;
  }

  const candidates = state.players.filter((player) => {
    if (!player.active) {
      return false;
    }

    if (pendingAction.type === 'SECOND_CHANCE_TARGET') {
      return player.id !== actingPlayerId;
    }

    return true;
  });

  if (candidates.length === 0) {
    return null;
  }

  const contextSeed =
    state.seed +
    state.roundNumber +
    state.currentPlayerIndex +
    pendingAction.type.length +
    actingPlayerId.length;
  const random = createSeededRandom(contextSeed);
  const index = Math.floor(random() * candidates.length);
  return candidates[index].id;
}

export function easyBotDecide(state: GameState, playerId: string): BotDecision {
  const player = getPlayer(state, playerId);
  const roundScore = calculateRoundScore(player);
  const numberCount = player.hand.filter((card) => card.type === 'NUMBER').length;

  return roundScore >= 15 || numberCount >= 4 ? 'STAY' : 'HIT';
}

export function mediumBotDecide(state: GameState, playerId: string): BotDecision {
  return calculateBustProbability(state, playerId) > 0.3 ? 'STAY' : 'HIT';
}

export function hardBotDecide(state: GameState, playerId: string): BotDecision {
  const player = getPlayer(state, playerId);
  const numberCount = player.hand.filter((card) => card.type === 'NUMBER').length;
  if (numberCount >= 6) {
    return 'HIT';
  }

  const currentRoundScore = calculateRoundScore(player);
  const bustProbability = calculateBustProbability(state, playerId);
  const expectedGain = calculateExpectedGain(state, playerId);
  const expectedValue = (1 - bustProbability) * expectedGain - bustProbability * currentRoundScore;

  return expectedValue <= 5 ? 'STAY' : 'HIT';
}

export function getBotActionTarget(state: GameState, actingPlayerId: string): string | null {
  const bot = getPlayer(state, actingPlayerId);
  const pendingAction = state.pendingAction;

  if (!pendingAction) {
    return null;
  }

  const validPlayers = state.players.filter((player) => {
    if (!player.active) {
      return false;
    }

    if (pendingAction.type === 'SECOND_CHANCE_TARGET') {
      return player.id !== actingPlayerId;
    }

    return true;
  });

  if (validPlayers.length === 0) {
    return null;
  }

  if (bot.botDifficulty === 'HARD') {
    if (pendingAction.type === 'SECOND_CHANCE_TARGET') {
      return validPlayers.reduce((lowest, player) => {
        if (player.totalScore < lowest.totalScore) {
          return player;
        }

        return lowest;
      }, validPlayers[0]).id;
    }

    return validPlayers.reduce((leader, player) => {
      if (player.totalScore > leader.totalScore) {
        return player;
      }

      return leader;
    }, validPlayers[0]).id;
  }

  return chooseRandomTarget(state, actingPlayerId);
}
