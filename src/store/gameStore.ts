import { create } from 'zustand';
import type { GameState, Difficulty } from '../engine/types';
import {
  initGame,
  startRound,
  humanHit,
  humanStay,
  executeAITurn,
  continueFlipThree,
  dealNextCard,
  finishPendingAction,
} from '../engine/game';
import { logUserAction, logGameEvent, logAIEvent } from '../utils/eventLogger';
import {
  getPendingDrawAnimation,
  runPendingDrawAnimation,
  waitForNonCardEvent,
} from './drawAnimation';
import type { PendingDrawAnimation } from './drawAnimation';
import { networkManager } from '../network/peer';

interface GameStore {
  gameState: GameState | null;
  isAIThinking: boolean;
  pendingDrawAnimation: PendingDrawAnimation | null;
  isHost: boolean; // True for single-player, true for multiplayer host, false for multiplayer clients

  // Actions
  startGame: (difficulty?: Difficulty, aiCount?: number) => void;
  hit: (playerId?: string) => void;
  stay: (playerId?: string) => void;
  startNextRound: () => void;
  resetGame: () => void;

  // Network Abstractions
  setHostStatus: (isHost: boolean) => void;
  syncGameState: (state: GameState) => void; // for clients to receive state updates from host
}

const AI_DELAY_MS = () => 500 + Math.random() * 300; // 500–800ms

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  isAIThinking: false,
  pendingDrawAnimation: null,
  isHost: true,

  startGame: (difficulty: Difficulty = 'easy', aiCount: number = 1) => {
    logUserAction('START_GAME_CLICKED', { difficulty, aiCount });
    const initial = initGame(difficulty, aiCount);
    logGameEvent('GAME_INITIALIZED', { playerCount: initial.players.length, dealerIndex: initial.dealerIndex }, initial);
    const afterDeal = startRound(initial);
    performDealSequence(afterDeal, set, get);
  },

  hit: (playerId?: string) => {
    const { gameState, isAIThinking } = get();
    if (!gameState || isAIThinking) return;
    if (gameState.phase !== 'play') return;

    // For single-player backward compatibility, if playerId is not provided, use the first human player
    const targetId = playerId ?? gameState.players.find(p => !p.isAI)?.id;
    if (!targetId) return;

    const humanPlayer = gameState.players.find((p) => p.id === targetId);
    if (!humanPlayer || humanPlayer.status !== 'active') return;
    if (gameState.activePlayerIndex !== gameState.players.indexOf(humanPlayer)) return;

    logUserAction('HIT_CLICKED', { playerId: humanPlayer.id, playerIndex: gameState.players.indexOf(humanPlayer) }, gameState);
    const newState = humanHit(gameState, humanPlayer.id);
    logGameEvent('HIT_EXECUTED', { playerId: humanPlayer.id, cardDrawn: !!newState.lastEvent?.card }, newState, humanPlayer.id);
    
    // Process the hit result (might include a toast)
    processGameStateUpdate(newState, set, get, () => {
      scheduleAIIfNeeded(get().gameState!, set, get);
    });
  },

  stay: (playerId?: string) => {
    const { gameState, isAIThinking } = get();
    if (!gameState || isAIThinking) return;
    if (gameState.phase !== 'play') return;

    // For single-player backward compatibility, if playerId is not provided, use the first human player
    const targetId = playerId ?? gameState.players.find(p => !p.isAI)?.id;
    if (!targetId) return;

    const humanPlayer = gameState.players.find((p) => p.id === targetId);
    if (!humanPlayer || humanPlayer.status !== 'active') return;
    if (gameState.activePlayerIndex !== gameState.players.indexOf(humanPlayer)) return;

    logUserAction('STAY_CLICKED', { playerId: humanPlayer.id, playerIndex: gameState.players.indexOf(humanPlayer) }, gameState);
    const newState = humanStay(gameState, humanPlayer.id);
    logGameEvent('STAY_EXECUTED', { playerId: humanPlayer.id, roundScore: humanPlayer.roundScore }, newState, humanPlayer.id);
    processGameStateUpdate(newState, set, get, () => {
      scheduleAIIfNeeded(get().gameState!, set, get);
    });
  },

  startNextRound: () => {
    const { gameState } = get();
    if (!gameState || gameState.phase !== 'round_end') return;

    logUserAction('START_NEXT_ROUND_CLICKED', { roundNumber: gameState.roundNumber + 1 }, gameState);
    const newState = startRound(gameState);
    logGameEvent('ROUND_STARTED', { roundNumber: newState.roundNumber, dealerIndex: newState.dealerIndex }, newState);
    performDealSequence(newState, set, get);
  },

  resetGame: () => {
    logUserAction('RESET_GAME_CLICKED');
    logGameEvent('GAME_RESET');
    set({ gameState: null, isAIThinking: false, pendingDrawAnimation: null });
  },

  setHostStatus: (isHost: boolean) => {
    set({ isHost });
  },

  syncGameState: (state: GameState) => {
    // Allows clients to update local state from a network message directly without running engine logic locally
    set({ gameState: state });
  },
}));

// Set up network listeners to bind PeerJS to the store
networkManager.onMessage((msg) => {
  const store = useGameStore.getState();

  if (msg.type === 'ACTION' && store.isHost) {
    // Host receives action from client and executes it
    if (msg.action === 'HIT') {
      store.hit(msg.playerId);
    } else if (msg.action === 'STAY') {
      store.stay(msg.playerId);
    }
  } else if (msg.type === 'STATE_UPDATE' && !store.isHost) {
    // Client receives state update from host
    store.syncGameState(msg.state);
  }
});

/**
 * If the current active player is the AI, schedule their turn with a delay.
 */
function scheduleAIIfNeeded(
  state: GameState,
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore
): void {
  if (state.phase !== 'play') return;

  // Only the host should compute AI turns
  if (!get().isHost) return;

  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer?.isAI) return;
  if (activePlayer.status !== 'active') return;

  logAIEvent('AI_TURN_SCHEDULED', { playerId: activePlayer.id, difficulty: activePlayer.difficulty }, state, activePlayer.id);
  set({ isAIThinking: true });
  setTimeout(() => {
    const { gameState } = get();
    if (!gameState || gameState.phase !== 'play') {
      set({ isAIThinking: false });
      return;
    }

    const aiPlayer = gameState.players[gameState.activePlayerIndex];
    logAIEvent('AI_TURN_STARTED', { playerId: aiPlayer.id }, gameState, aiPlayer.id);
    
    let newState = executeAITurn(gameState);
    
    logAIEvent('AI_TURN_COMPLETED', { 
      playerId: aiPlayer.id, 
      action: newState.lastEvent?.kind || 'unknown',
      newStatus: newState.players[gameState.activePlayerIndex].status 
    }, newState, aiPlayer.id);

    processGameStateUpdate(newState, set, get, () => {
      set({ isAIThinking: false });
      scheduleAIIfNeeded(get().gameState!, set, get);
    });
  }, AI_DELAY_MS());
}

function processGameStateUpdate(
  state: GameState,
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  onComplete: () => void
) {
  // If we are host, broadcast the updated state to all clients
  if (get().isHost) {
    networkManager.broadcastState(state);
  }

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

        if (currentState.pendingAction?.type === 'flip_three' && currentState.pendingAction.cardsRemaining > 0) {
          const nextState = continueFlipThree(currentState);
          processGameStateUpdate(nextState, set, get, onComplete);
          return;
        }

        if (state.pendingAction && !currentState.pendingAction) {
          // A pending action was resolved in this chain. We must advance the turn.
          const finalState = finishPendingAction(currentState);
          if (finalState !== currentState) {
            set({ gameState: finalState });
          }
        }

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
    waitForNonCardEvent(() => {
      const currentState = get().gameState;
      if (!currentState) return;

      if (currentState.pendingAction?.type === 'flip_three' && currentState.pendingAction.cardsRemaining > 0) {
        const nextState = continueFlipThree(currentState);
        processGameStateUpdate(nextState, set, get, onComplete);
      } else {
        if (state.pendingAction && !currentState.pendingAction) {
          const finalState = finishPendingAction(currentState);
          if (finalState !== currentState) {
             set({ gameState: finalState });
          }
        }
        onComplete();
      }
    });
  } else {
    onComplete();
  }
}



/**
 * Animate dealing cards one by one before starting logic
 */
function performDealSequence(
  startState: GameState,
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore
) {
  set({ gameState: startState, isAIThinking: true });
  let dealt = 0;
  
  function nextDealStep() {
    let state = get().gameState;
    if (!state || state.phase !== 'deal') return;
    
    // Check if we finished
    if (dealt >= state.players.length) {
       let finalState = { 
         ...state, 
         phase: 'play' as const, 
         activePlayerIndex: (state.dealerIndex + 1) % state.players.length,
         lastEvent: null 
       };
       set({ gameState: finalState, isAIThinking: false });
       scheduleAIIfNeeded(finalState, set, get);
       return;
    }
    
    let nextState = dealNextCard(state);
    
    processGameStateUpdate(nextState, set, get, () => {
      dealt++;
      nextDealStep();
    });
  }
  
  nextDealStep();
}
