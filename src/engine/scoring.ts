import type { GameState, PlayerState } from './types';

export const FLIP_7_BONUS = 15;
export const WIN_SCORE = 200;

/**
 * Calculate a player's round score from their current cards.
 * Formula: (sum_of_number_cards × multiplier) + flat_modifiers
 * Result is floored at 0.
 * Flip 7 bonus (+15) is applied separately as it requires knowledge of
 * whether the player triggered Flip 7 — pass `hasFlipSeven = true` if so.
 */
export function calculateRoundScore(player: PlayerState, hasFlipSeven = false): number {
  const numberSum = player.numberCards.reduce((sum, c) => sum + (c.value ?? 0), 0);

  let multiplier = 1;
  let flatBonus = 0;

  for (const mod of player.modifierCards) {
    if (mod.modifier?.startsWith('x')) {
      const val = parseInt(mod.modifier.replace('x', ''), 10);
      if (!isNaN(val)) {
        multiplier *= val;
      }
    } else if (mod.modifier?.startsWith('+')) {
      const val = parseInt(mod.modifier.replace('+', ''), 10);
      if (!isNaN(val)) {
        flatBonus += val;
      }
    }
  }

  const score = Math.max(0, numberSum * multiplier + flatBonus);
  return score + (hasFlipSeven ? FLIP_7_BONUS : 0);
}

/**
 * Check if a player has 7 number cards (Flip 7 condition).
 */
export function checkFlip7(player: PlayerState): boolean {
  return player.numberCards.length >= 7;
}

/**
 * Apply round scores to all players' cumulative totals.
 * Busted players score 0 for the round.
 * Returns updated state.
 */
export function applyRoundScores(
  state: GameState,
  flip7WinnerId: string | null = null
): GameState {
  const updatedPlayers = state.players.map((p) => {
    if (p.status === 'busted') {
      return { ...p, roundScore: 0 };
    }
    const roundScore = calculateRoundScore(p, p.id === flip7WinnerId);
    return {
      ...p,
      roundScore,
      totalScore: p.totalScore + roundScore,
    };
  });

  return { ...state, players: updatedPlayers };
}

/**
 * Check if the game is over — i.e. any player has reached WIN_SCORE.
 * Returns the id of the highest-scoring player if the game is over, else null.
 * If multiple players reach 200 in the same round, highest total wins.
 */
export function checkWinCondition(state: GameState): string | null {
  const hasReached200 = state.players.some((p) => p.totalScore >= WIN_SCORE);
  if (!hasReached200) return null;

  const winner = [...state.players].sort((a, b) => b.totalScore - a.totalScore)[0];
  return winner.id;
}
