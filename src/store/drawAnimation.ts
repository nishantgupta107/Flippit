import type { GameState } from '../engine/types';

export type PendingDrawPhase = 'spawn' | 'flip' | 'travel';

export interface PendingDrawAnimation {
  card: NonNullable<NonNullable<GameState['lastEvent']>['card']>;
  playerId: string;
  phase: PendingDrawPhase;
}

export const DRAW_SPAWN_DELAY_MS = 20;
export const DRAW_FLIP_DURATION_MS = 400;
export const DRAW_FACE_UP_HOLD_MS = 700;
export const DRAW_TRAVEL_DURATION_MS = 650;
export const NON_CARD_EVENT_DELAY_MS = 700;

const DRAW_EVENT_KINDS = new Set([
  'card_drawn',
  'flip_three_card',
  'flip_seven',
  'bust',
  'second_chance_used',
]);

export function getPendingDrawAnimation(state: GameState): PendingDrawAnimation | null {
  const event = state.lastEvent;

  if (!event?.card || !DRAW_EVENT_KINDS.has(event.kind)) {
    return null;
  }

  return {
    card: event.card,
    playerId: event.playerId,
    phase: 'spawn',
  };
}

export function runPendingDrawAnimation(
  animation: PendingDrawAnimation,
  setPendingDrawAnimation: (animation: PendingDrawAnimation | null) => void,
  onComplete: () => void
): void {
  setPendingDrawAnimation(animation);

  setTimeout(() => {
    setPendingDrawAnimation({
      ...animation,
      phase: 'flip',
    });

    setTimeout(() => {
      setPendingDrawAnimation({
        ...animation,
        phase: 'travel',
      });

      setTimeout(() => {
        setPendingDrawAnimation(null);
        onComplete();
      }, DRAW_TRAVEL_DURATION_MS);
    }, DRAW_FLIP_DURATION_MS + DRAW_FACE_UP_HOLD_MS);
  }, DRAW_SPAWN_DELAY_MS);
}

export function waitForNonCardEvent(onComplete: () => void): void {
  setTimeout(onComplete, NON_CARD_EVENT_DELAY_MS);
}
