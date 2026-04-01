import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Card } from '../../engine/types';
import {
  DRAW_FACE_UP_HOLD_MS,
  DRAW_FLIP_DURATION_MS,
  DRAW_SPAWN_DELAY_MS,
  DRAW_TRAVEL_DURATION_MS,
  NON_CARD_EVENT_DELAY_MS,
  runPendingDrawAnimation,
  waitForNonCardEvent,
} from '../drawAnimation';

function makeCard(): Card {
  return {
    id: 'card-1',
    type: 'number',
    value: 7,
  };
}

describe('runPendingDrawAnimation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('progresses through spawn, flip, travel, then clears before continuing', () => {
    vi.useFakeTimers();

    const updates: Array<string | null> = [];
    const onComplete = vi.fn();

    runPendingDrawAnimation(
      {
        card: makeCard(),
        playerId: 'human',
        phase: 'spawn',
      },
      (animation) => {
        updates.push(animation?.phase ?? null);
      },
      onComplete
    );

    expect(updates).toEqual(['spawn']);
    expect(onComplete).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DRAW_SPAWN_DELAY_MS);
    expect(updates).toEqual(['spawn', 'flip']);
    expect(onComplete).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DRAW_FLIP_DURATION_MS + DRAW_FACE_UP_HOLD_MS);
    expect(updates).toEqual(['spawn', 'flip', 'travel']);
    expect(onComplete).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DRAW_TRAVEL_DURATION_MS);
    expect(updates).toEqual(['spawn', 'flip', 'travel', null]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('waitForNonCardEvent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits 1000ms before continuing non-card events', () => {
    vi.useFakeTimers();

    const onComplete = vi.fn();
    waitForNonCardEvent(onComplete);

    vi.advanceTimersByTime(NON_CARD_EVENT_DELAY_MS - 1);
    expect(onComplete).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
