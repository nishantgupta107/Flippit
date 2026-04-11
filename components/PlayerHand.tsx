import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Layout,
  FadeIn
} from 'react-native-reanimated';
import { PlayerState } from '../engine/types';
import { Card, Chip, ScoreHUD } from './ui';
import { colors, radius } from '../constants/theme';
import { rem } from '../utils/scaling';

interface PlayerHandProps {
  player: PlayerState;
  isActive: boolean;
  pendingDrawAnimation?: any;
  lastEvent?: { kind: string; playerId: string; card?: { id: string } };
}

const FREEZE_SHAKE_DURATION_MS = 500;
const BUST_WAVE_STEP_MS = 120;
const BUST_CARD_TINT_DURATION_MS = 220;
const BUST_SHAKE_DURATION_MS = 520;

export function PlayerHand({
  player,
  isActive,
  pendingDrawAnimation,
  lastEvent,
}: PlayerHandProps) {
  const [isFreezeBurstActive, setIsFreezeBurstActive] = useState(false);
  const [hasBustWaveStarted, setHasBustWaveStarted] = useState(false);
  const [isBustShakeActive, setIsBustShakeActive] = useState(false);
  const [isSecondChanceExitActive, setIsSecondChanceExitActive] = useState(false);

  const roundScore = player.roundScore;
  const isFrozen = player.outReason === 'FROZEN';
  const isBusted = player.outReason === 'BUSTED';
  const numberCards = player.hand.filter(c => c.type === 'NUMBER');
  const modifierCards = player.hand.filter(c => c.type === 'MODIFIER_MULT' || c.type === 'MODIFIER_BONUS');
  const actionCards = player.hand.filter(c => c.type.startsWith('ACTION_'));

  const hasSecondChance = actionCards.some(c => c.type === 'ACTION_SECOND_CHANCE');
  const isFlip7 = new Set(numberCards.map(c => c.value)).size >= 7;

  const isNewBustEvent = lastEvent?.kind === 'bust' && lastEvent.playerId === player.id;
  const duplicateCardIndex = isNewBustEvent
    ? numberCards.findIndex((card) => card.id === lastEvent.card?.id)
    : -1;
  const maxBustDistance = duplicateCardIndex >= 0
    ? Math.max(...numberCards.map((_, index) => Math.abs(index - duplicateCardIndex)))
    : 0;
  const bustSpreadDurationMs = maxBustDistance * BUST_WAVE_STEP_MS + BUST_CARD_TINT_DURATION_MS;

  const isPendingBustArrival =
    pendingDrawAnimation?.playerId === player.id && pendingDrawAnimation.eventKind === 'bust';
  const isPendingSecondChanceExit =
    pendingDrawAnimation?.playerId === player.id && pendingDrawAnimation.eventKind === 'second_chance_used';
  const shouldShowSecondChanceBorder = hasSecondChance || isSecondChanceExitActive;

  useEffect(() => {
    if (isPendingSecondChanceExit) {
      setIsSecondChanceExitActive(true);
      return;
    }

    if (!hasSecondChance) {
      setIsSecondChanceExitActive(false);
    }
  }, [hasSecondChance, isPendingSecondChanceExit]);

  useEffect(() => {
    if (lastEvent?.kind !== 'freeze' || lastEvent.playerId !== player.id) {
      return;
    }

    setIsFreezeBurstActive(true);
    const timeoutId = setTimeout(() => {
      setIsFreezeBurstActive(false);
    }, FREEZE_SHAKE_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [lastEvent?.kind, lastEvent?.playerId, player.id]);

  useEffect(() => {
    if (!isBusted) {
      setHasBustWaveStarted(false);
      setIsBustShakeActive(false);
      return;
    }

    if (!isNewBustEvent) {
      setHasBustWaveStarted(true);
      setIsBustShakeActive(false);
      return;
    }

    if (isPendingBustArrival) {
      setHasBustWaveStarted(false);
      setIsBustShakeActive(false);
      return;
    }

    setHasBustWaveStarted(true);
    setIsBustShakeActive(false);

    const shakeTimeoutId = setTimeout(() => {
      setIsBustShakeActive(true);
    }, bustSpreadDurationMs);

    const cleanupTimeoutId = setTimeout(() => {
      setIsBustShakeActive(false);
    }, bustSpreadDurationMs + BUST_SHAKE_DURATION_MS);

    return () => {
      clearTimeout(shakeTimeoutId);
      clearTimeout(cleanupTimeoutId);
    };
  }, [bustSpreadDurationMs, isBusted, isNewBustEvent, isPendingBustArrival]);

  const shakeTranslateX = useSharedValue(0);
  const shakeTranslateY = useSharedValue(0);
  const flip7Scale = useSharedValue(1);
  const borderPulse = useSharedValue(0);

  useEffect(() => {
    if (isFreezeBurstActive) {
      shakeTranslateX.value = withSequence(
        withTiming(2, { duration: FREEZE_SHAKE_DURATION_MS / 6 }),
        withTiming(-2, { duration: FREEZE_SHAKE_DURATION_MS / 6 }),
        withTiming(2, { duration: FREEZE_SHAKE_DURATION_MS / 6 }),
        withTiming(-1, { duration: FREEZE_SHAKE_DURATION_MS / 6 }),
        withTiming(1, { duration: FREEZE_SHAKE_DURATION_MS / 6 }),
        withTiming(0, { duration: FREEZE_SHAKE_DURATION_MS / 6 })
      );
      shakeTranslateY.value = withSequence(
        withTiming(2, { duration: FREEZE_SHAKE_DURATION_MS / 5 }),
        withTiming(0, { duration: FREEZE_SHAKE_DURATION_MS / 5 }),
        withTiming(-1, { duration: FREEZE_SHAKE_DURATION_MS / 5 }),
        withTiming(2, { duration: FREEZE_SHAKE_DURATION_MS / 5 }),
        withTiming(0, { duration: FREEZE_SHAKE_DURATION_MS / 5 })
      );
    }
  }, [isFreezeBurstActive, shakeTranslateX, shakeTranslateY]);

  useEffect(() => {
    if (isBustShakeActive) {
      shakeTranslateX.value = withSequence(
        withTiming(-10, { duration: BUST_SHAKE_DURATION_MS / 6 }),
        withTiming(10, { duration: BUST_SHAKE_DURATION_MS / 6 }),
        withTiming(-8, { duration: BUST_SHAKE_DURATION_MS / 6 }),
        withTiming(8, { duration: BUST_SHAKE_DURATION_MS / 6 }),
        withTiming(-4, { duration: BUST_SHAKE_DURATION_MS / 6 }),
        withTiming(0, { duration: BUST_SHAKE_DURATION_MS / 6 })
      );
      shakeTranslateY.value = withSequence(
        withTiming(1, { duration: BUST_SHAKE_DURATION_MS / 4 }),
        withTiming(-1, { duration: BUST_SHAKE_DURATION_MS / 4 }),
        withTiming(1, { duration: BUST_SHAKE_DURATION_MS / 4 }),
        withTiming(0, { duration: BUST_SHAKE_DURATION_MS / 4 })
      );
    }
  }, [isBustShakeActive, shakeTranslateX, shakeTranslateY]);

  useEffect(() => {
    if (isFlip7) {
      flip7Scale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1, // infinite
        true
      );
    } else {
      flip7Scale.value = withTiming(1);
    }
  }, [isFlip7, flip7Scale]);

  useEffect(() => {
    if (shouldShowSecondChanceBorder) {
      borderPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 950 }),
          withTiming(0, { duration: 950 })
        ),
        -1,
        true
      );
    } else {
      borderPulse.value = withTiming(0);
    }
  }, [shouldShowSecondChanceBorder, borderPulse]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    let borderColor = isActive ? colors.primary : colors.outlineVariant;
    let borderWidth = isActive ? 2 : 1;

    // Reanimated doesn't support complex box-shadow interpolation well in RN natively via useAnimatedStyle simply,
    // so we interpolate the border color and width instead.
    if (shouldShowSecondChanceBorder) {
      // Simulate glowing #86efac
      borderWidth = 2;
    }

    return {
      transform: [
        { translateX: shakeTranslateX.value },
        { translateY: shakeTranslateY.value },
        { scale: flip7Scale.value }
      ],
      borderColor,
      borderWidth,
      backgroundColor: isActive ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
    };
  });

  const secondChanceBorderStyle = useAnimatedStyle(() => {
    return {
      opacity: borderPulse.value,
      borderWidth: 2,
      borderColor: '#86efac',
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.lg,
    };
  });

  const statusEmoji =
    player.active ? '🟢' :
    player.outReason === 'BANKED' ? '🏦' :
    player.outReason === 'BUSTED' ? '💥' :
    player.outReason === 'FROZEN' ? '❄️' : '⚪';

  // Omit the pending card from the base rendering so we can animate it floating in later
  const shouldOmitPendingCard = pendingDrawAnimation?.playerId === player.id;

  const displayedNumberCards = shouldOmitPendingCard
    ? numberCards.filter(c => c.id !== pendingDrawAnimation.card.id)
    : numberCards;

  const displayedModifierCards = shouldOmitPendingCard
    ? modifierCards.filter(c => c.id !== pendingDrawAnimation.card.id)
    : modifierCards;

  const displayedActionCards = shouldOmitPendingCard
    ? actionCards.filter(c => c.id !== pendingDrawAnimation.card.id)
    : actionCards;

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {shouldShowSecondChanceBorder && (
        <Animated.View style={secondChanceBorderStyle} />
      )}

      {isFrozen && (
        <View style={styles.frozenOverlay}>
          {/* Simple blue tint for frozen state instead of complex SVG filter */}
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <Text style={styles.statusEmoji}>{statusEmoji}</Text>
          <Text style={styles.playerName}>{player.name}</Text>
          {player.isBot && <Chip label="CPU" variant="outline" />}
        </View>
        <ScoreHUD score={roundScore} label="Round" />
      </View>

      {/* Cards Area */}
      <View style={styles.cardsArea}>
        {(displayedModifierCards.length > 0 || displayedActionCards.length > 0) && (
          <View style={styles.chipsRow}>
            {displayedModifierCards.map(c => (
              <Chip key={c.id} label={c.type === 'MODIFIER_MULT' ? `x${c.value}` : `+${c.value}`} variant="multiplier" />
            ))}
            {displayedActionCards.map(c => (
              <Chip key={c.id} label={
                c.type === 'ACTION_FREEZE' ? 'Freeze' :
                c.type === 'ACTION_FLIP_THREE' ? 'Flip 3' : '2nd Chance'
              } variant="action" />
            ))}
          </View>
        )}

        {/* Number Cards Row (Overlapping) */}
        <View style={styles.numberRow}>
          {displayedNumberCards.length === 0 ? (
            <Text style={styles.emptyText}>No cards drawn.</Text>
          ) : (
            displayedNumberCards.map((c, i, arr) => {
              const N = arr.length;
              const overlap = N > 1 ? -rem(2) : 0;

              return (
                <Animated.View
                  key={c.id}
                  layout={Layout.springify().damping(16).stiffness(200)}
                  entering={FadeIn}
                  style={[
                    styles.cardWrapper,
                    {
                      marginLeft: i === 0 ? 0 : overlap,
                      zIndex: i,
                    }
                  ]}
                >
                  <View style={{ position: 'relative' }}>
                    {isBusted && duplicateCardIndex !== -1 && hasBustWaveStarted && (
                      <Animated.View
                        entering={FadeIn.delay(Math.abs(i - duplicateCardIndex) * BUST_WAVE_STEP_MS).duration(BUST_CARD_TINT_DURATION_MS)}
                        style={styles.bustTint}
                      />
                    )}
                    <Card
                      card={c}
                      status={player.active || player.outReason === 'BUSTED' ? undefined : player.outReason?.toLowerCase()}
                      disableIntroAnimation={false} // Let it animate in if it wasn't in pending
                    />
                  </View>
                </Animated.View>
              );
            })
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: rem(1),
    display: 'flex',
    flexDirection: 'column',
    gap: rem(0.75),
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  frozenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(104, 211, 255, 0.2)',
    zIndex: 20,
    pointerEvents: 'none',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 11,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(0.5),
  },
  statusEmoji: {
    fontSize: rem(1.25),
  },
  playerName: {
    fontFamily: 'NotoSerif-Bold',
    fontWeight: 'bold',
    fontSize: rem(1.125),
    color: colors.onSurface,
  },
  cardsArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: rem(0.5),
    minHeight: rem(7.5), // ~120px
    zIndex: 11,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(0.5),
  },
  numberRow: {
    flexDirection: 'row',
    width: '100%',
    height: rem(7), // ~112px
    alignItems: 'center',
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    fontSize: rem(0.875),
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: rem(1),
  },
  cardWrapper: {
    // Wrapper for any layout animations
  },
  bustTint: {
    position: 'absolute',
    inset: 0,
    borderRadius: radius.md,
    backgroundColor: 'rgba(215, 56, 59, 0.4)',
    zIndex: 2,
  },
});