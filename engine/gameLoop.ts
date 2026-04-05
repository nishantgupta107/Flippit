import type { GameState, PlayerState } from './types';

export function getNextActivePlayer(state: GameState): string | null {
  const totalPlayers = state.players.length;

  if (totalPlayers === 0) {
    return null;
  }

  for (let offset = 1; offset <= totalPlayers; offset += 1) {
    const index = (state.currentPlayerIndex + offset) % totalPlayers;
    const player = state.players[index];
    if (player.active) {
      return player.id;
    }
  }

  return null;
}

export function isRoundOver(state: GameState): boolean {
  return state.roundOver || state.players.every((player) => !player.active);
}

export function isGameOver(state: GameState): boolean {
  return state.gameOver;
}

export function getWinner(state: GameState): PlayerState | null {
  if (!state.gameOver || state.players.length === 0) {
    return null;
  }

  return state.players.reduce<PlayerState>((leader, player) => {
    if (player.totalScore > leader.totalScore) {
      return player;
    }

    return leader;
  }, state.players[0]);
}
