import { create } from 'zustand';
import { getBotActionTarget, easyBotDecide, hardBotDecide, mediumBotDecide } from '@/engine/aiPlayer';
import { advanceToNextPlayer, drawForPlayer, initGame as initEngineGame, playerStay as applyPlayerStay, resolvePendingAction, startNewRound as startEngineRound } from '@/engine/gameEngine';
import type { GameState, PlayerInput } from '@/engine/types';

interface GameStoreState {
  gameState: GameState | null;
  isLoading: boolean;
  initGame: (players: PlayerInput[], seed?: number) => void;
  dealCard: (playerId: string) => void;
  playerHit: (playerId: string) => void;
  playerStay: (playerId: string) => void;
  selectActionTarget: (targetPlayerId: string) => void;
  startNewRound: () => void;
}

const BOT_DELAY_MS = 600;

function getCurrentPlayer(state: GameState) {
  return state.players[state.currentPlayerIndex] ?? null;
}

function isHumanPendingAction(state: GameState): boolean {
  if (!state.pendingAction) {
    return false;
  }

  const actingPlayer = state.players.find(
    (player) => player.id === state.pendingAction?.actingPlayerId
  );

  return Boolean(actingPlayer && !actingPlayer.isBot);
}

function getBotDecision(state: GameState, playerId: string): 'HIT' | 'STAY' {
  const bot = state.players.find((player) => player.id === playerId);
  if (!bot) {
    throw new Error(`Bot not found: ${playerId}`);
  }

  if (bot.botDifficulty === 'HARD') {
    return hardBotDecide(state, playerId);
  }

  if (bot.botDifficulty === 'MEDIUM') {
    return mediumBotDecide(state, playerId);
  }

  return easyBotDecide(state, playerId);
}

function shouldRunBots(state: GameState | null): state is GameState {
  if (!state || state.gameOver || state.roundOver) {
    return false;
  }

  if (state.pendingAction) {
    const actingPlayer = state.players.find(
      (player) => player.id === state.pendingAction?.actingPlayerId
    );

    return Boolean(actingPlayer?.isBot);
  }

  return Boolean(getCurrentPlayer(state)?.isBot);
}

function scheduleBotTurn(
  set: (partial: Partial<GameStoreState> | ((state: GameStoreState) => Partial<GameStoreState>)) => void,
  get: () => GameStoreState
): void {
  const currentState = get().gameState;
  if (!shouldRunBots(currentState)) {
    return;
  }

  setTimeout(() => {
    const latestState = get().gameState;
    if (!shouldRunBots(latestState)) {
      return;
    }

    let nextState = latestState;

    while (shouldRunBots(nextState)) {
      if (nextState.pendingAction) {
        const target = getBotActionTarget(nextState, nextState.pendingAction.actingPlayerId);
        if (!target) {
          break;
        }

        nextState = resolvePendingAction(nextState, target);
        continue;
      }

      const currentPlayer = getCurrentPlayer(nextState);
      if (!currentPlayer || !currentPlayer.isBot) {
        break;
      }

      const decision = getBotDecision(nextState, currentPlayer.id);
      nextState =
        decision === 'HIT'
          ? drawForPlayer(nextState, currentPlayer.id)
          : applyPlayerStay(nextState, currentPlayer.id);
    }

    set({ gameState: nextState, isLoading: false });
  }, BOT_DELAY_MS);
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  isLoading: false,

  initGame: (players, seed) => {
    const nextState = {
      ...initEngineGame(players, seed),
      phase: 'PLAYER_TURN' as const,
    };
    set({ gameState: nextState, isLoading: false });
    scheduleBotTurn(set, get);
  },

  dealCard: (playerId) => {
    const gameState = get().gameState;
    if (!gameState || gameState.pendingAction || gameState.gameOver || gameState.roundOver) {
      return;
    }

    const nextState = drawForPlayer(gameState, playerId);
    set({ gameState: nextState, isLoading: false });
  },

  playerHit: (playerId) => {
    const gameState = get().gameState;
    if (!gameState || gameState.pendingAction || gameState.gameOver || gameState.roundOver) {
      return;
    }

    const currentPlayer = getCurrentPlayer(gameState);
    if (!currentPlayer || currentPlayer.id !== playerId || !currentPlayer.active) {
      return;
    }

    const nextState = drawForPlayer(gameState, playerId);
    set({ gameState: nextState, isLoading: false });
    scheduleBotTurn(set, get);
  },

  playerStay: (playerId) => {
    const gameState = get().gameState;
    if (!gameState || gameState.pendingAction || gameState.gameOver || gameState.roundOver) {
      return;
    }

    const currentPlayer = getCurrentPlayer(gameState);
    if (!currentPlayer || currentPlayer.id !== playerId || !currentPlayer.active) {
      return;
    }

    const nextState = applyPlayerStay(gameState, playerId);
    set({ gameState: nextState, isLoading: false });
    scheduleBotTurn(set, get);
  },

  selectActionTarget: (targetPlayerId) => {
    const gameState = get().gameState;
    if (!gameState?.pendingAction) {
      return;
    }

    const nextState = resolvePendingAction(gameState, targetPlayerId);
    set({ gameState: nextState, isLoading: false });

    if (!isHumanPendingAction(nextState)) {
      scheduleBotTurn(set, get);
    }
  },

  startNewRound: () => {
    const gameState = get().gameState;
    if (!gameState || gameState.gameOver) {
      return;
    }

    const nextState = {
      ...startEngineRound(gameState),
      phase: 'PLAYER_TURN' as const,
    };
    set({ gameState: nextState, isLoading: false });
    scheduleBotTurn(set, get);
  },
}));

export default useGameStore;
