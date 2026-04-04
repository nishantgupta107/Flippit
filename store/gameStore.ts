import { create } from 'zustand';

/**
 * Game store stub - will be implemented in Phase 2
 * @see DEV_PLAN.md §3.4, §3.5
 */
interface GameState {
  phase: 'IDLE' | 'DEALING' | 'PLAYER_TURN' | 'DECISION' | 'ROUND_OVER' | 'GAME_OVER';
  isLoading: boolean;
  setPhase: (phase: GameState['phase']) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'IDLE',
  isLoading: false,
  setPhase: (phase) => set({ phase }),
  reset: () => set({ phase: 'IDLE', isLoading: false }),
}));

export default useGameStore;
