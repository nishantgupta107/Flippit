/**
 * FlipThreeOverlay
 *
 * Handles the two-phase Flip Three interaction for the human player:
 *
 *   Phase A — "target_select": shown when gameState has a FLIP_THREE_TARGET
 *   pendingAction and the human is the acting player. A glassmorphic popup
 *   with a blurred backdrop lets the human choose who receives the 3 cards.
 *
 *   Phase B — "revealing" / "sub_action" / "closing": controlled by
 *   flipThreeOverlay in the store. Three face-down card slots appear and the
 *   human taps each one to flip it face-up. Action cards (Freeze, Flip Three,
 *   Second Chance) may trigger an inline sub-target picker before the next
 *   slot can be flipped.
 *
 * The component is always mounted in GameScreen; it manages its own visibility.
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../../constants/theme';
import { rem } from '../../utils/scaling';
import { Card } from '../ui/Card';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import useGameStore, {
  FlipThreeOverlayState,
  FlipThreeSlot,
  FlipThreeCardEffect,
  FlipThreeSubActionType,
} from '../../store/gameStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function effectLabel(effect: FlipThreeCardEffect): string {
  switch (effect) {
    case 'bust':                    return '💥 Bust!';
    case 'shield_save':             return '🛡 Saved!';
    case 'flip7':                   return '🎰 Flip 7!';
    case 'freeze_applied':          return '❄️ Frozen!';
    case 'freeze_pending':          return '❄️ Freeze';
    case 'flip_three_chained':      return '🎴 Chain!';
    case 'flip_three_pending':      return '🎴 Flip 3';
    case 'second_chance_given':     return '🛡 Shield!';
    case 'second_chance_discarded': return '↩ Discarded';
    case 'second_chance_pending':   return '🛡 Pass...';
    default:                        return '';
  }
}

function subActionTitle(type: FlipThreeSubActionType): string {
  switch (type) {
    case 'FREEZE_TARGET':           return '❄️ Who to Freeze?';
    case 'FLIP_THREE_CHAIN_TARGET': return '🎴 Flip Three — pick a target';
    case 'SECOND_CHANCE_TARGET':    return '🛡 Pass shield to…';
    default:                        return 'Choose a target';
  }
}

// ─── Individual card slot ─────────────────────────────────────────────────────

interface CardSlotProps {
  slot: FlipThreeSlot;
  index: number;
  isNextToReveal: boolean;
  locked: boolean;
  onPress: (index: number) => void;
}

function CardSlot({ slot, index, isNextToReveal, locked, onPress }: CardSlotProps) {
  const canReveal = !slot.revealed && isNextToReveal && !locked;
  const isDimmed  = !slot.revealed && !canReveal;

  // Pulse animation on the tappable slot to hint at interaction.
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (canReveal) {
      // Gentle idle pulse: 1 → 1.04 → 1, every 1.4 s
      const interval = setInterval(() => {
        pulseScale.value = withTiming(1.04, { duration: 350 }, () => {
          pulseScale.value = withTiming(1, { duration: 350 });
        });
      }, 1400);
      return () => clearInterval(interval);
    } else {
      pulseScale.value = withTiming(1, { duration: 150 });
      return undefined;
    }
  }, [canReveal, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const isBust   = slot.effect === 'bust';
  const label    = slot.revealed && slot.effect && slot.effect !== 'normal'
    ? effectLabel(slot.effect)
    : null;

  return (
    <View style={[styles.slotWrapper, isDimmed && styles.slotDimmed]}>
      <Pressable
        onPress={canReveal ? () => onPress(index) : undefined}
        accessible={canReveal}
        accessibilityRole="button"
        accessibilityLabel={`Flip card ${index + 1}`}
      >
        <Animated.View style={pulseStyle}>
          <Card
            card={slot.card ?? undefined}
            isFaceDown={!slot.revealed}
            disableIntroAnimation
            isBustCard={isBust}
          />
        </Animated.View>
      </Pressable>

      <View style={styles.slotLabel}>
        {label ? (
          <Text style={[
            styles.effectText,
            isBust              && { color: colors.error },
            slot.effect === 'freeze_applied' && { color: colors.tertiary },
            slot.effect === 'flip7'          && { color: colors.primary },
            slot.effect === 'flip_three_chained' && { color: colors.secondary },
          ]}>
            {label}
          </Text>
        ) : canReveal ? (
          <Text style={styles.tapHint}>tap to reveal</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Phase A: target select ───────────────────────────────────────────────────

interface TargetSelectPhaseProps {
  players: { id: string; name: string; active: boolean }[];
  onSelect: (id: string) => void;
}

function TargetSelectPhase({ players, onSelect }: TargetSelectPhaseProps) {
  const validPlayers = players.filter(p => p.active);
  return (
    <>
      <Text style={styles.title}>🎴 Flip Three</Text>
      <Text style={styles.subtitle}>Choose a player to receive 3 cards</Text>
      <View style={styles.playerRow}>
        {validPlayers.map(p => (
          <PrimaryButton
            key={p.id}
            label={p.name}
            onPress={() => onSelect(p.id)}
            style={{ flex: 1, minWidth: rem(6) }}
          />
        ))}
      </View>
    </>
  );
}

// ─── Phase B: card reveal ─────────────────────────────────────────────────────

interface RevealPhaseProps {
  overlay: FlipThreeOverlayState;
  allPlayers: { id: string; name: string; active: boolean }[];
  onReveal: (index: number) => void;
  onSubTarget: (id: string) => void;
}

function RevealPhase({ overlay, allPlayers, onReveal, onSubTarget }: RevealPhaseProps) {
  const { slots, locked, subAction, targetName } = overlay;
  const nextIndex = slots.findIndex(s => !s.revealed);

  return (
    <>
      <Text style={styles.title}>🎴 Flip Three</Text>
      <Text style={styles.subtitle}>→ {targetName}</Text>

      {/* Card slots */}
      <View style={styles.cardsRow}>
        {slots.map((slot, i) => (
          <CardSlot
            key={i}
            slot={slot}
            index={i}
            isNextToReveal={i === nextIndex}
            locked={locked}
            onPress={onReveal}
          />
        ))}
      </View>

      {/* Sub-action picker (mid-reveal) */}
      {subAction && (
        <Animated.View entering={FadeIn.duration(180)} style={styles.subAction}>
          <Text style={styles.subActionTitle}>
            {subActionTitle(subAction.type)}
          </Text>
          <View style={styles.playerRow}>
            {allPlayers
              .filter(p => subAction.validTargetIds.includes(p.id))
              .map(p => (
                <SecondaryButton
                  key={p.id}
                  label={p.name}
                  onPress={() => onSubTarget(p.id)}
                  style={{ flex: 1, minWidth: rem(6) }}
                />
              ))}
          </View>
        </Animated.View>
      )}
    </>
  );
}

// ─── Root overlay component ───────────────────────────────────────────────────

export function FlipThreeOverlay() {
  const {
    gameState,
    flipThreeOverlay,
    selectFlipThreeTarget,
    revealFlipThreeSlot,
    selectFlipThreeSubTarget,
  } = useGameStore();

  const humanPlayer = gameState?.players.find(p => !p.isBot);

  // Show target-select popup when the engine has a Flip Three pending for the human player
  // and the overlay hasn't moved to the reveal phase yet.
  const isTargetSelectPhase =
    gameState?.pendingAction?.type === 'FLIP_THREE_TARGET' &&
    gameState.pendingAction.actingPlayerId === humanPlayer?.id &&
    !flipThreeOverlay;

  const isVisible = isTargetSelectPhase || (flipThreeOverlay !== null);

  if (!isVisible || !gameState) return null;

  const phase = flipThreeOverlay?.phase ?? 'target_select';
  const isClosing = phase === 'closing';

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={styles.outerContainer}
      // Block all touches from reaching the game screen below,
      // but allow interaction within the popup.
      pointerEvents={isClosing ? 'none' : 'box-none'}
    >
      {/* Full-screen blur backdrop */}
      {Platform.OS !== 'web' ? (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.webBlur]} />
      )}

      {/* Semi-transparent dark tint on top of blur */}
      <View style={styles.tintOverlay} />

      {/* Centered popup card */}
      <View style={styles.centered}>
        <View style={styles.popup}>
          {isTargetSelectPhase ? (
            <TargetSelectPhase
              players={gameState.players}
              onSelect={selectFlipThreeTarget}
            />
          ) : flipThreeOverlay ? (
            <RevealPhase
              overlay={flipThreeOverlay}
              allPlayers={gameState.players}
              onReveal={revealFlipThreeSlot}
              onSubTarget={selectFlipThreeSubTarget}
            />
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
  },
  webBlur: {
    backgroundColor: 'rgba(0, 10, 5, 0.75)',
    backdropFilter: 'blur(12px)',
  } as any,
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 18, 9, 0.45)',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: rem(1.5),
  },
  popup: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    padding: rem(2),
    paddingBottom: rem(1.75),
    width: '100%',
    maxWidth: rem(28),
    gap: rem(1.25),
    // Elevation / shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: rem(0.25) },
    shadowOpacity: 0.45,
    shadowRadius: rem(1.25),
    elevation: 12,
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(1.5),
    color: colors.secondary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(0.875),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: -rem(0.5),
  },
  playerRow: {
    flexDirection: 'row',
    gap: rem(0.75),
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: rem(0.75),
  },
  slotWrapper: {
    alignItems: 'center',
    gap: rem(0.375),
  },
  slotDimmed: {
    opacity: 0.35,
  },
  slotLabel: {
    height: rem(1.25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  effectText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(0.6875),
    color: colors.onSurfaceVariant,
  },
  tapHint: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: rem(0.625),
    color: colors.onSurfaceVariant,
    opacity: 0.7,
  },
  subAction: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    padding: rem(1),
    gap: rem(0.875),
  },
  subActionTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(0.875),
    color: colors.onSurface,
    textAlign: 'center',
  },
});
