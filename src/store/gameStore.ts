import { create } from 'zustand';
import type { GameState, Difficulty } from '../engine/types';
import {
  initGame,
  startRound,
  humanHit,
  humanStay,
  executeAITurn,
  continueFlipThree,
  nextTurn,
} from '../engine/game';

interface GameStore {
  gameState: GameState | null;
  isAIThinking: boolean;

  // Actions
  startGame: (difficulty?: Difficulty, aiCount?: number) => void;
  hit: () => void;
  stay: () => void;
  startNextRound: () => void;
  resetGame: () => void;
}

const AI_DELAY_MS = () => 150 + Math.random() * 550; // 150–700ms

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  isAIThinking: false,

  startGame: (difficulty: Difficulty = 'easy', aiCount: number = 1) => {
    const initial = initGame(difficulty, aiCount);
    const afterDeal = startRound(initial);
    set({ gameState: afterDeal, isAIThinking: false });

    // If AI goes first (activePlayerIndex points to AI), trigger AI turn
    scheduleAIIfNeeded(afterDeal, set, get);
  },

  hit: () => {
    const { gameState, isAIThinking } = get();
    if (!gameState || isAIThinking) return;
    if (gameState.phase !== 'play') return;

    const humanPlayer = gameState.players.find((p) => !p.isAI);
    if (!humanPlayer || humanPlayer.status !== 'active') return;
    if (gameState.activePlayerIndex !== gameState.players.indexOf(humanPlayer)) return;

    let newState = humanHit(gameState);

    // Resolve any pending Flip Three that targets someone
    newState = resolveFlipThreeIfPending(newState);

    // If the active player is no longer active (e.g. self-Freeze or busted from own Flip Three)
    if (newState.phase === 'play') {
      const activePlayer = newState.players[newState.activePlayerIndex];
      if (activePlayer && activePlayer.status !== 'active') {
        newState = nextTurn(newState);
      }
    }

    set({ gameState: newState });
    scheduleAIIfNeeded(newState, set, get);
  },

  stay: () => {
    const { gameState, isAIThinking } = get();
    if (!gameState || isAIThinking) return;
    if (gameState.phase !== 'play') return;

    const humanPlayer = gameState.players.find((p) => !p.isAI);
    if (!humanPlayer || humanPlayer.status !== 'active') return;
    if (gameState.activePlayerIndex !== gameState.players.indexOf(humanPlayer)) return;

    const newState = humanStay(gameState);
    set({ gameState: newState });
    scheduleAIIfNeeded(newState, set, get);
  },

  startNextRound: () => {
    const { gameState } = get();
    if (!gameState || gameState.phase !== 'round_end') return;

    const newState = startRound(gameState);
    set({ gameState: newState, isAIThinking: false });
    scheduleAIIfNeeded(newState, set, get);
  },

  resetGame: () => {
    set({ gameState: null, isAIThinking: false });
  },
}));

/**
 * If the current active player is the AI, schedule their turn with a delay.
 */
function scheduleAIIfNeeded(
  state: GameState,
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore
): void {
  if (state.phase !== 'play') return;

  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer?.isAI) return;
  if (activePlayer.status !== 'active') return;

  set({ isAIThinking: true });
  setTimeout(() => {
    const { gameState } = get();
    if (!gameState || gameState.phase !== 'play') {
      set({ isAIThinking: false });
      return;
    }

    let newState = executeAITurn(gameState);

    // Resolve any Flip Three that the AI's action created
    newState = resolveFlipThreeIfPending(newState);

    // If the active player is no longer active (e.g. self-Freeze or busted from own Flip Three)
    if (newState.phase === 'play') {
      const activePlayer = newState.players[newState.activePlayerIndex];
      if (activePlayer && activePlayer.status !== 'active') {
        newState = nextTurn(newState);
      }
    }

    set({ gameState: newState, isAIThinking: false });

    // Chain AI turns if AI goes again immediately
    scheduleAIIfNeeded(newState, set, get);
  }, AI_DELAY_MS());
}

/**
 * Synchronously drain any pending Flip Three actions.
 * (The store resolves these instantly; animation happens in the UI layer.)
 */
function resolveFlipThreeIfPending(state: GameState): GameState {
  let s = state;
  while (s.pendingAction?.type === 'flip_three' && s.pendingAction.cardsRemaining > 0) {
    s = continueFlipThree(s);
    // Stop if the Flip Three ended due to bust or Flip 7
    if (!s.pendingAction) break;
  }
  return s;
}
