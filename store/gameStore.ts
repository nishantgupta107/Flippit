import { create } from 'zustand';
import { getBotActionTarget, easyBotDecide, hardBotDecide, mediumBotDecide } from '@/engine/aiPlayer';
import {
  drawForPlayer,
  initGame as initEngineGame,
  playerStay as applyPlayerStay,
  resolvePendingAction,
  startNewRound as startEngineRound,
  resolveCard,
  advanceToNextPlayer,
  applyFreezeEffect,
  resolveSecondChanceEffect,
} from '@/engine/gameEngine';
import { shuffleDeck } from '@/engine/deck';
import type { Card, GameState, PlayerInput } from '@/engine/types';
import { PendingDrawAnimation, getPendingDrawAnimation, runPendingDrawAnimation, waitForNonCardEvent } from './drawAnimation';

// ─── Flip Three Overlay Types ─────────────────────────────────────────────────

export type FlipThreeCardEffect =
  | 'normal'
  | 'bust'
  | 'shield_save'
  | 'flip7'
  | 'freeze_applied'        // solo freeze: target auto-frozen, no more reveals
  | 'freeze_pending'        // multi freeze: sub-action picker shown
  | 'flip_three_chained'    // nested Flip Three (solo): chain after close, continue
  | 'flip_three_pending'    // nested Flip Three (multi): sub-action to pick chain target
  | 'second_chance_given'   // SC given to the target (no prior shield)
  | 'second_chance_discarded' // SC discarded (everyone has a shield)
  | 'second_chance_pending'; // SC needs to be passed; sub-action picker shown

export interface FlipThreeSlot {
  /** The actual card in this slot. null means the card is beyond the visible deck
   *  (deck recycled mid-reveal) and will be drawn live when the user taps. */
  card: Card | null;
  revealed: boolean;
  effect: FlipThreeCardEffect | null;
}

export type FlipThreeSubActionType =
  | 'FREEZE_TARGET'
  | 'FLIP_THREE_CHAIN_TARGET'
  | 'SECOND_CHANCE_TARGET';

export interface FlipThreeSubAction {
  type: FlipThreeSubActionType;
  slotIndex: number;
  validTargetIds: string[];
}

export interface FlipThreeOverlayState {
  /** 'revealing' = cards being flipped; 'sub_action' = waiting for mid-reveal target
   *  pick; 'closing' = 300 ms grace before finalizeFlipThree is called. */
  phase: 'revealing' | 'sub_action' | 'closing';
  actingPlayerId: string;
  targetPlayerId: string;
  targetName: string;
  slots: FlipThreeSlot[];
  /** Advancing engine state updated after each card is resolved. */
  checkpointState: GameState;
  /** When true, no more card slots can be tapped. */
  locked: boolean;
  /** Set when a mid-reveal card requires the human to pick an additional target. */
  subAction: FlipThreeSubAction | null;
  /** When set, a chained Flip Three is opened for this player after the overlay closes. */
  chainTargetId: string | null;
}

// ─── Track which card events have already been animated ──────────────────────

const animatedEventIds = new Set<string>();

// ─── Store interface ──────────────────────────────────────────────────────────

interface GameStoreState {
  gameState: GameState | null;
  pendingDrawAnimation: PendingDrawAnimation | null;
  displayedActivePlayerId: string | null;
  isLoading: boolean;
  /** Non-null while the Flip Three card-reveal overlay is active. */
  flipThreeOverlay: FlipThreeOverlayState | null;
  initGame: (players: PlayerInput[], seed?: number) => void;
  dealCard: (playerId: string) => void;
  playerHit: (playerId: string) => void;
  playerStay: (playerId: string) => void;
  /** For FREEZE/SC: resolves normally. For FLIP_THREE + human: starts the overlay. */
  selectActionTarget: (targetPlayerId: string) => void;
  /** Called after the human taps a target in the Flip Three overlay target-select popup. */
  selectFlipThreeTarget: (targetPlayerId: string) => void;
  /** Called when the human taps a face-down card slot in the overlay to reveal it. */
  revealFlipThreeSlot: (index: number) => void;
  /** Called when the human picks a target for a mid-reveal sub-action
   *  (Freeze target, Flip Three chain target, or Second Chance pass target). */
  selectFlipThreeSubTarget: (targetId: string) => void;
  startNewRound: () => void;
}

const BOT_DELAY_MS = 600;

function getCurrentPlayer(state: GameState) {
  return state.players[state.currentPlayerIndex] ?? null;
}

function getDisplayedActivePlayerId(state: GameState): string | null {
  if (state.pendingAction) {
    return state.pendingAction.actingPlayerId;
  }
  return getCurrentPlayer(state)?.id ?? null;
}

function isHumanPendingAction(state: GameState): boolean {
  if (!state.pendingAction) return false;
  const actingPlayer = state.players.find(
    (player) => player.id === state.pendingAction?.actingPlayerId
  );
  return Boolean(actingPlayer && !actingPlayer.isBot);
}

function getBotDecision(state: GameState, playerId: string): 'HIT' | 'STAY' {
  const bot = state.players.find((player) => player.id === playerId);
  if (!bot) throw new Error(`Bot not found: ${playerId}`);
  if (bot.botDifficulty === 'HARD') return hardBotDecide(state, playerId);
  if (bot.botDifficulty === 'MEDIUM') return mediumBotDecide(state, playerId);
  return easyBotDecide(state, playerId);
}

function shouldRunBots(state: GameState | null): state is GameState {
  if (!state || state.gameOver || state.roundOver) return false;
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

  if (pendingDrawAnimation && animatedEventIds.has(pendingDrawAnimation.card.id)) {
    set({ gameState: state, pendingDrawAnimation: null });
    onComplete();
    return;
  }

  if (pendingDrawAnimation) {
    animatedEventIds.add(pendingDrawAnimation.card.id);
    set({ gameState: state, pendingDrawAnimation });

    const pendingCardId = pendingDrawAnimation.card.id;
    const setPendingDrawAnimationIfCurrent = (nextAnimation: PendingDrawAnimation | null) => {
      const currentAnimation = get().pendingDrawAnimation;
      if (currentAnimation?.card.id !== pendingCardId) return;
      set({ pendingDrawAnimation: nextAnimation });
    };

    runPendingDrawAnimation(
      pendingDrawAnimation,
      setPendingDrawAnimationIfCurrent,
      () => {
        const currentState = get().gameState;
        if (!currentState) { onComplete(); return; }
        const latestDrawAnimation = get().pendingDrawAnimation;
        if (latestDrawAnimation && latestDrawAnimation.card.id !== pendingCardId) {
          onComplete(); return;
        }
        set({
          pendingDrawAnimation: null,
          displayedActivePlayerId: getDisplayedActivePlayerId(currentState),
        });
        onComplete();
      }
    );
    return;
  }

  set({ gameState: state, pendingDrawAnimation: null });

  const hasEvent = !!state.lastEvent;
  const hasPendingAction = !!state.pendingAction;

  if (hasEvent || hasPendingAction) {
    waitForNonCardEvent(() => {
      const currentState = get().gameState;
      set({
        displayedActivePlayerId: currentState ? getDisplayedActivePlayerId(currentState) : null,
      });
      onComplete();
    });
  } else {
    set({ displayedActivePlayerId: getDisplayedActivePlayerId(state) });
    onComplete();
  }
}

function scheduleBotTurn(
  set: (partial: Partial<GameStoreState> | ((state: GameStoreState) => Partial<GameStoreState>)) => void,
  get: () => GameStoreState
): void {
  // Never run bots while the human is interacting with the Flip Three overlay.
  if (get().flipThreeOverlay) return;

  const currentState = get().gameState;
  if (!shouldRunBots(currentState)) return;

  setTimeout(() => {
    // Re-check after the delay in case overlay appeared.
    if (get().flipThreeOverlay) return;

    const latestState = get().gameState;
    if (!shouldRunBots(latestState)) return;

    if (latestState.pendingAction) {
      const target = getBotActionTarget(latestState, latestState.pendingAction.actingPlayerId);
      if (!target) return;
      const nextState = resolvePendingAction(latestState, target);
      handleGameStateTransition(nextState, set, get, () => scheduleBotTurn(set, get));
      return;
    }

    const currentPlayer = getCurrentPlayer(latestState);
    if (!currentPlayer || !currentPlayer.isBot) return;

    const decision = getBotDecision(latestState, currentPlayer.id);
    const nextState =
      decision === 'HIT'
        ? drawForPlayer(latestState, currentPlayer.id)
        : applyPlayerStay(latestState, currentPlayer.id);

    handleGameStateTransition(nextState, set, get, () => scheduleBotTurn(set, get));
  }, BOT_DELAY_MS);
}

// ─── Peek helpers ─────────────────────────────────────────────────────────────

/**
 * Non-destructively reads the next `count` cards from the deck.
 * If the deck has fewer cards, `null` entries are appended for the remaining
 * slots (those will be drawn live when the user taps them after deck recycling).
 */
function peekFlipThreeCards(deck: Card[], count: number): (Card | null)[] {
  const peeked: (Card | null)[] = [];
  for (let i = 0; i < count; i++) {
    peeked.push(i < deck.length ? deck[i] : null);
  }
  return peeked;
}

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useGameStore = create<GameStoreState>((set, get) => {

  // ── Internal: finalise the Flip Three overlay ───────────────────────────────
  const finalizeFlipThree = () => {
    const overlay = get().flipThreeOverlay;
    if (!overlay) return;

    const { slots, checkpointState, chainTargetId, actingPlayerId } = overlay;

    let finalState = checkpointState;

    // Discard any pre-peeked cards that were never revealed (stayed face-down).
    // Those cards are still at the front of finalState.deck in the same order
    // they were peeked, since we consume cards from deck[0] on each reveal.
    const unrevealedKnown = slots.filter(s => !s.revealed && s.card !== null);
    if (unrevealedKnown.length > 0) {
      const unrevealedCards = unrevealedKnown.map(s => s.card as Card);
      finalState = {
        ...finalState,
        deck: finalState.deck.slice(unrevealedKnown.length),
        discardPile: [...finalState.discardPile, ...unrevealedCards],
      };
    }

    // Ensure any transient pendingAction from the checkpoint is cleared.
    finalState = { ...finalState, pendingAction: undefined, pendingActionPassCount: undefined };

    if (chainTargetId) {
      // Start the inner (chained) Flip Three overlay directly — skip target_select.
      const chainTarget = finalState.players.find(p => p.id === chainTargetId);
      const innerPeeked = peekFlipThreeCards(finalState.deck, 3);
      const innerSlots: FlipThreeSlot[] = innerPeeked.map(card => ({
        card,
        revealed: false,
        effect: null,
      }));

      const innerOverlay: FlipThreeOverlayState = {
        phase: 'revealing',
        actingPlayerId,
        targetPlayerId: chainTargetId,
        targetName: chainTarget?.name ?? chainTargetId,
        slots: innerSlots,
        checkpointState: finalState,
        locked: false,
        subAction: null,
        chainTargetId: null,
      };

      set({
        gameState: finalState,
        flipThreeOverlay: innerOverlay,
        displayedActivePlayerId: actingPlayerId,
      });
      return;
    }

    // No chain: advance to the next player and resume normal flow.
    const advancedState = advanceToNextPlayer(finalState);

    set({
      gameState: advancedState,
      flipThreeOverlay: null,
      displayedActivePlayerId: getDisplayedActivePlayerId(advancedState),
    });

    scheduleBotTurn(set, get);
  };

  // ── scheduleFinalise helper (used internally after lock) ────────────────────
  const scheduleFinalise = () => {
    setTimeout(() => {
      const current = get().flipThreeOverlay;
      if (current?.phase === 'closing') {
        finalizeFlipThree();
      }
    }, 300);
  };

  return {
    gameState: null,
    pendingDrawAnimation: null,
    displayedActivePlayerId: null,
    isLoading: false,
    flipThreeOverlay: null,

    // ── initGame ──────────────────────────────────────────────────────────────
    initGame: (players, seed) => {
      animatedEventIds.clear();
      const nextState = {
        ...initEngineGame(players, seed),
        phase: 'PLAYER_TURN' as const,
      };
      set({
        gameState: nextState,
        pendingDrawAnimation: null,
        displayedActivePlayerId: getDisplayedActivePlayerId(nextState),
        isLoading: false,
        flipThreeOverlay: null,
      });
      scheduleBotTurn(set, get);
    },

    // ── dealCard ──────────────────────────────────────────────────────────────
    dealCard: (playerId) => {
      const gameState = get().gameState;
      if (!gameState || gameState.pendingAction || gameState.gameOver || gameState.roundOver) return;
      const nextState = drawForPlayer(gameState, playerId);
      handleGameStateTransition(nextState, set, get, () => {});
    },

    // ── playerHit ─────────────────────────────────────────────────────────────
    playerHit: (playerId) => {
      const gameState = get().gameState;
      if (!gameState || gameState.pendingAction || gameState.gameOver || gameState.roundOver) return;
      const currentPlayer = getCurrentPlayer(gameState);
      if (!currentPlayer || currentPlayer.id !== playerId || !currentPlayer.active) return;
      const nextState = drawForPlayer(gameState, playerId);
      handleGameStateTransition(nextState, set, get, () => scheduleBotTurn(set, get));
    },

    // ── playerStay ────────────────────────────────────────────────────────────
    playerStay: (playerId) => {
      const gameState = get().gameState;
      if (!gameState || gameState.pendingAction || gameState.gameOver || gameState.roundOver) return;
      const currentPlayer = getCurrentPlayer(gameState);
      if (!currentPlayer || currentPlayer.id !== playerId || !currentPlayer.active) return;
      const nextState = applyPlayerStay(gameState, playerId);
      handleGameStateTransition(nextState, set, get, () => scheduleBotTurn(set, get));
    },

    // ── selectActionTarget ────────────────────────────────────────────────────
    selectActionTarget: (targetPlayerId) => {
      const gameState = get().gameState;
      if (!gameState?.pendingAction) return;

      // Intercept Flip Three for the human acting player — hand off to overlay.
      if (
        gameState.pendingAction.type === 'FLIP_THREE_TARGET' &&
        isHumanPendingAction(gameState)
      ) {
        get().selectFlipThreeTarget(targetPlayerId);
        return;
      }

      const nextState = resolvePendingAction(gameState, targetPlayerId);
      handleGameStateTransition(nextState, set, get, () => {
        if (!isHumanPendingAction(nextState)) {
          scheduleBotTurn(set, get);
        }
      });
    },

    // ── selectFlipThreeTarget ─────────────────────────────────────────────────
    selectFlipThreeTarget: (targetPlayerId) => {
      const { gameState } = get();
      if (!gameState?.pendingAction || gameState.pendingAction.type !== 'FLIP_THREE_TARGET') return;

      const { actingPlayerId } = gameState.pendingAction;
      const target = gameState.players.find(p => p.id === targetPlayerId);
      if (!target?.active) return;

      // Pre-peek up to 3 cards from the deck (null for any beyond deck length).
      const peeked = peekFlipThreeCards(gameState.deck, 3);
      const slots: FlipThreeSlot[] = peeked.map(card => ({
        card,
        revealed: false,
        effect: null,
      }));

      // Build checkpoint with the pending action cleared — we take over from here.
      const checkpointState: GameState = {
        ...gameState,
        pendingAction: undefined,
        pendingActionPassCount: undefined,
      };

      set({
        flipThreeOverlay: {
          phase: 'revealing',
          actingPlayerId,
          targetPlayerId,
          targetName: target.name,
          slots,
          checkpointState,
          locked: false,
          subAction: null,
          chainTargetId: null,
        },
      });
    },

    // ── revealFlipThreeSlot ───────────────────────────────────────────────────
    revealFlipThreeSlot: (index) => {
      const overlay = get().flipThreeOverlay;
      if (!overlay || overlay.phase !== 'revealing' || overlay.locked) return;

      const { slots, checkpointState, targetPlayerId } = overlay;
      const slot = slots[index];
      if (!slot || slot.revealed) return;
      // Enforce sequential left-to-right reveal.
      if (index > 0 && !slots[index - 1].revealed) return;

      // ── Determine the actual card (pre-peeked or live draw) ────────────────
      let card: Card;
      let deckAfter: Card[];

      if (slot.card !== null) {
        card = slot.card;
        deckAfter = checkpointState.deck.slice(1);
      } else {
        // Deck was exhausted when we peeked; recycle now.
        let deck = checkpointState.deck;
        if (deck.length === 0) {
          if (checkpointState.discardPile.length === 0) return; // Can't draw
          deck = shuffleDeck(checkpointState.discardPile);
        }
        card = deck[0];
        deckAfter = deck.slice(1);
      }

      const stateConsumed: GameState = { ...checkpointState, deck: deckAfter };
      const activePlayers = stateConsumed.players.filter(p => p.active);

      let newCheckpoint = stateConsumed;
      let effect: FlipThreeCardEffect = 'normal';
      let shouldLock = false;
      let subAction: FlipThreeSubAction | null = null;
      let chainTargetId = overlay.chainTargetId;

      // ── Resolve card ───────────────────────────────────────────────────────
      if (card.type === 'ACTION_FLIP_THREE') {
        // Discard manually — calling resolveCard would recurse into the engine.
        newCheckpoint = {
          ...stateConsumed,
          discardPile: [...stateConsumed.discardPile, card],
        };

        if (activePlayers.length <= 1) {
          // Case 3: solo — chain to the same target, continue to next slot.
          effect = 'flip_three_chained';
          chainTargetId = targetPlayerId;
        } else {
          // Case 4: multi — prompt for a chain target, continue after selection.
          effect = 'flip_three_pending';
          subAction = {
            type: 'FLIP_THREE_CHAIN_TARGET',
            slotIndex: index,
            validTargetIds: activePlayers.map(p => p.id),
          };
        }
      } else if (card.type === 'ACTION_FREEZE') {
        // resolveCard handles auto-freeze (solo) and FREEZE_TARGET pendingAction (multi).
        newCheckpoint = resolveCard(stateConsumed, targetPlayerId, card);

        if (newCheckpoint.pendingAction?.type === 'FREEZE_TARGET') {
          // Cases 2: multi — show sub-action picker, block next slot until resolved.
          effect = 'freeze_pending';
          subAction = {
            type: 'FREEZE_TARGET',
            slotIndex: index,
            validTargetIds: activePlayers.map(p => p.id),
          };
        } else {
          // Case 1: solo — engine auto-froze the only active player, lock remaining.
          effect = 'freeze_applied';
          shouldLock = true;
        }
      } else if (card.type === 'ACTION_SECOND_CHANCE') {
        const targetBefore = stateConsumed.players.find(p => p.id === targetPlayerId);
        newCheckpoint = resolveCard(stateConsumed, targetPlayerId, card);
        const targetAfter = newCheckpoint.players.find(p => p.id === targetPlayerId);

        if (newCheckpoint.pendingAction?.type === 'SECOND_CHANCE_TARGET') {
          // Case 7: multi — shield must be passed to another player.
          effect = 'second_chance_pending';
          const validIds = activePlayers
            .filter(p => !p.hasShield && p.id !== targetPlayerId)
            .map(p => p.id);
          if (validIds.length === 0) {
            // All remaining active players already have shields — treat as discard.
            effect = 'second_chance_discarded';
            newCheckpoint = { ...newCheckpoint, pendingAction: undefined };
          } else {
            subAction = {
              type: 'SECOND_CHANCE_TARGET',
              slotIndex: index,
              validTargetIds: validIds,
            };
          }
        } else if (!targetBefore?.hasShield && targetAfter?.hasShield) {
          // Case 5: target had no shield — shield granted directly.
          effect = 'second_chance_given';
        } else {
          // Case 6: target already had shield, SC discarded.
          effect = 'second_chance_discarded';
        }
      } else {
        // NUMBER or MODIFIER: use the engine directly.
        newCheckpoint = resolveCard(stateConsumed, targetPlayerId, card);

        if (newCheckpoint.lastEvent?.kind === 'bust') {
          effect = 'bust';
          shouldLock = true;
        } else if (newCheckpoint.lastEvent?.kind === 'second_chance_used') {
          effect = 'shield_save';
        } else {
          // Check for Flip 7 — Case 8.
          const updatedTarget = newCheckpoint.players.find(p => p.id === targetPlayerId);
          const numberCount = updatedTarget?.hand.filter(c => c.type === 'NUMBER').length ?? 0;
          if (numberCount >= 7) {
            effect = 'flip7';
            shouldLock = true;
          }
        }
      }

      // ── Update slots ───────────────────────────────────────────────────────
      const newSlots: FlipThreeSlot[] = slots.map((s, i) =>
        i === index ? { ...s, card, revealed: true, effect } : s
      );
      const allRevealed = newSlots.every(s => s.revealed);
      // Lock when: explicit shouldLock (bust/freeze_applied/flip7) OR all revealed with no pending sub-action.
      const isNowLocked = shouldLock || (allRevealed && !subAction);

      const updatedOverlay: FlipThreeOverlayState = {
        ...overlay,
        slots: newSlots,
        checkpointState: newCheckpoint,
        locked: isNowLocked,
        subAction,
        chainTargetId,
        phase: subAction ? 'sub_action' : (isNowLocked ? 'closing' : 'revealing'),
      };

      set({ flipThreeOverlay: updatedOverlay });

      if (isNowLocked) {
        scheduleFinalise();
      }
    },

    // ── selectFlipThreeSubTarget ──────────────────────────────────────────────
    selectFlipThreeSubTarget: (targetId) => {
      const overlay = get().flipThreeOverlay;
      if (!overlay || overlay.phase !== 'sub_action' || !overlay.subAction) return;

      const { subAction, checkpointState, slots, targetPlayerId, actingPlayerId } = overlay;
      const { type } = subAction;

      let newCheckpoint = checkpointState;
      let newChainTarget = overlay.chainTargetId;
      let shouldLock = false;

      if (type === 'FREEZE_TARGET') {
        // Apply the freeze to the chosen target without advancing the turn.
        newCheckpoint = applyFreezeEffect(checkpointState, targetId);
        // If the target froze themselves (Case 2 → Case 1 path), lock remaining slots.
        if (targetId === targetPlayerId) {
          shouldLock = true;
        }
        // Otherwise the target was someone else and we continue to the next card.
      } else if (type === 'FLIP_THREE_CHAIN_TARGET') {
        // Record who the chained Flip Three will target after the overlay closes.
        newChainTarget = targetId;
        // Remove the FLIP_THREE_TARGET pendingAction the engine may have set.
        newCheckpoint = { ...checkpointState, pendingAction: undefined, pendingActionPassCount: undefined };
      } else if (type === 'SECOND_CHANCE_TARGET') {
        // Pass the shield to the chosen player.
        newCheckpoint = resolveSecondChanceEffect(checkpointState, targetId);
      }

      const allRevealed = slots.every(s => s.revealed);
      const isNowLocked = shouldLock || allRevealed;

      const updatedOverlay: FlipThreeOverlayState = {
        ...overlay,
        checkpointState: newCheckpoint,
        subAction: null,
        chainTargetId: newChainTarget,
        locked: isNowLocked,
        phase: isNowLocked ? 'closing' : 'revealing',
        actingPlayerId,
      };

      set({ flipThreeOverlay: updatedOverlay });

      if (isNowLocked) {
        scheduleFinalise();
      }
    },

    // ── startNewRound ─────────────────────────────────────────────────────────
    startNewRound: () => {
      const gameState = get().gameState;
      if (!gameState || gameState.gameOver) return;

      animatedEventIds.clear();

      const nextState = {
        ...startEngineRound(gameState),
        phase: 'PLAYER_TURN' as const,
      };
      set({
        gameState: nextState,
        pendingDrawAnimation: null,
        displayedActivePlayerId: getDisplayedActivePlayerId(nextState),
        isLoading: false,
        flipThreeOverlay: null,
      });
      scheduleBotTurn(set, get);
    },
  };
});

export default useGameStore;
