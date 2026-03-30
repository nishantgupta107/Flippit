import type { Difficulty, GameState, PlayerState } from './types';
import { calculateRoundScore, checkFlip7 } from './scoring';

/**
 * Calculate the bust probability for the next card drawn.
 *
 * P(bust) = (number of duplicate-causing cards in remaining deck) / (total remaining cards)
 *
 * A card is "bust-causing" if it's a number card whose value
 * already exists in the player's number card row.
 */
export function calculateBustProbability(
  player: PlayerState,
  remainingDeck: GameState['drawPile']
): number {
  if (remainingDeck.length === 0) return 0;

  const heldValues = new Set(player.numberCards.map((c) => c.value));
  const duplicateCount = remainingDeck.filter(
    (c) => c.type === 'number' && heldValues.has(c.value)
  ).length;

  return duplicateCount / remainingDeck.length;
}

/**
 * Get the highest score among opponents.
 */
function getLeadingOpponentScore(aiId: string, state: GameState): number {
  const opponents = state.players.filter((p) => p.id !== aiId);
  if (opponents.length === 0) return 0;
  return Math.max(...opponents.map((p) => p.totalScore + p.roundScore));
}

/**
 * Determine bust probability threshold by difficulty.
 *  Easy:   stay if bust probability > 60%
 *  Medium: stay if bust probability > 40%
 *  Hard:   stay if bust probability > 35% (also adjusts for opponent score)
 */
function getDifficultyThreshold(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':   return 0.60;
    case 'medium': return 0.40;
    case 'hard':   return 0.35;
  }
}

/**
 * AI decision engine.
 * Returns 'hit' or 'stay' based on bust probability and difficulty.
 */
export function aiDecide(
  player: PlayerState,
  state: GameState,
  difficulty: Difficulty = 'easy'
): 'hit' | 'stay' {
  const bustProb = calculateBustProbability(player, state.drawPile);
  let threshold = getDifficultyThreshold(difficulty);

  if (difficulty === 'medium' || difficulty === 'hard') {
    const currentScore = player.totalScore + calculateRoundScore(player);
    const leadingOpponent = getLeadingOpponentScore(player.id, state);

    // Risk-adjust: if significantly behind, push harder
    if (leadingOpponent > currentScore + 20) {
      threshold += 0.10;
    }
  }

  // Also consider: if player already has 6 unique cards, one more is Flip 7 — always hit
  if (player.numberCards.length === 6 && difficulty !== 'easy') {
    const uniqueValues = new Set(player.numberCards.map((c) => c.value));
    const remainingUniqueCount = state.drawPile.filter(
      (c) => c.type === 'number' && !uniqueValues.has(c.value)
    ).length;
    if (remainingUniqueCount > 0) return 'hit';
  }

  return bustProb < threshold ? 'hit' : 'stay';
}

/**
 * Determine the best Freeze target for the AI.
 * Targets the active player with the highest current round score (excluding self).
 */
export function selectFreezeTarget(aiId: string, state: GameState): string | null {
  const targets = state.players.filter(
    (p) => p.id !== aiId && p.status === 'active'
  );
  if (targets.length === 0) {
    // Only active player — must target self per spec
    return aiId;
  }
  return [...targets].sort(
    (a, b) => b.totalScore + calculateRoundScore(b) - (a.totalScore + calculateRoundScore(a))
  )[0].id;
}

/**
 * Determine the best Flip Three target.
 * Targets the player closest to 7 unique cards (most dangerous).
 */
export function selectFlipThreeTarget(aiId: string, state: GameState): string | null {
  const targets = state.players.filter(
    (p) => p.id !== aiId && p.status === 'active'
  );
  if (targets.length === 0) return null;
  return [...targets].sort((a, b) => b.numberCards.length - a.numberCards.length)[0].id;
}
