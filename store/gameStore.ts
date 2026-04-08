import { create } from 'zustand';
import { getBotActionTarget, easyBotDecide, hardBotDecide, mediumBotDecide } from '@/engine/aiPlayer';
import { drawForPlayer, initGame as initEngineGame, playerStay as applyPlayerStay, resolvePendingAction, startNewRound as startEngineRound } from '@/engine/gameEngine';
import type { GameState, PlayerInput } from '@/engine/types';
import { PendingDrawAnimation, getPendingDrawAnimation, runPendingDrawAnimation, waitForNonCardEvent } from './drawAnimation';

interface GameStoreState {
  gameState: GameState | null;
  pendingDrawAnimation: PendingDrawAnimation | null;
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

function handleGameStateTransition(
  state: GameState,
  set: (partial: Partial<GameStoreState> | ((state: GameStoreState) => Partial<GameStoreState>)) => void,
  get: () => GameStoreState,
  onComplete: () => void
) {
  const pendingDrawAnimation = getPendingDrawAnimation(state);

  if (pendingDrawAnimation) {
    set({ gameState: state, pendingDrawAnimation });

    const pendingCardId = pendingDrawAnimation.card.id;
    const setPendingDrawAnimationIfCurrent = (nextAnimation: PendingDrawAnimation | null) => {
      const currentAnimation = get().pendingDrawAnimation;
      if (currentAnimation?.card.id !== pendingCardId) {
        return;
      }

      set({ pendingDrawAnimation: nextAnimation });
    };

    runPendingDrawAnimation(
      pendingDrawAnimation,
      setPendingDrawAnimationIfCurrent,
      () => {
        const currentState = get().gameState;
        if (!currentState) {
          onComplete();
          return;
        }

        const latestDrawAnimation = get().pendingDrawAnimation;
        if (latestDrawAnimation && latestDrawAnimation.card.id !== pendingCardId) {
          onComplete();
          return;
        }

        set({ pendingDrawAnimation: null });
        onComplete();
      }
    );

    return;
  }

  set({ gameState: state, pendingDrawAnimation: null });

  // If there's an event or a pending action, we wait before proceeding
  const hasEvent = !!state.lastEvent;
  const hasPendingAction = !!state.pendingAction;

  if (hasEvent || hasPendingAction) {
    waitForNonCardEvent(onComplete);
  } else {
    onComplete();
  }
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

    if (latestState.pendingAction) {
      const target = getBotActionTarget(latestState, latestState.pendingAction.actingPlayerId);
      if (!target) {
        return;
      }

      const nextState = resolvePendingAction(latestState, target);
      handleGameStateTransition(nextState, set, get, () => scheduleBotTurn(set, get));
      return;
    }

    const currentPlayer = getCurrentPlayer(latestState);
    if (!currentPlayer || !currentPlayer.isBot) {
      return;
    }

    const decision = getBotDecision(latestState, currentPlayer.id);
    const nextState =
      decision === 'HIT'
        ? drawForPlayer(latestState, currentPlayer.id)
        : applyPlayerStay(latestState, currentPlayer.id);

    handleGameStateTransition(nextState, set, get, () => scheduleBotTurn(set, get));
  }, BOT_DELAY_MS);
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  pendingDrawAnimation: null,
  isLoading: false,

  initGame: (players, seed) => {
    const nextState = {
      ...initEngineGame(players, seed),
      phase: 'PLAYER_TURN' as const,
    };
    set({ gameState: nextState, pendingDrawAnimation: null, isLoading: false });
    scheduleBotTurn(set, get);
  },

  dealCard: (playerId) => {
    const gameState = get().gameState;
    if (!gameState || gameState.pendingAction || gameState.gameOver || gameState.roundOver) {
      return;
    }

    const nextState = drawForPlayer(gameState, playerId);
    handleGameStateTransition(nextState, set, get, () => {});
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
    handleGameStateTransition(nextState, set, get, () => scheduleBotTurn(set, get));
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
    handleGameStateTransition(nextState, set, get, () => scheduleBotTurn(set, get));
  },

  selectActionTarget: (targetPlayerId) => {
    const gameState = get().gameState;
    if (!gameState?.pendingAction) {
      return;
    }

    const nextState = resolvePendingAction(gameState, targetPlayerId);
    handleGameStateTransition(nextState, set, get, () => {
      if (!isHumanPendingAction(nextState)) {
        scheduleBotTurn(set, get);
      }
    });
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
    set({ gameState: nextState, pendingDrawAnimation: null, isLoading: false });
    scheduleBotTurn(set, get);
  },
}));

export default useGameStore;
