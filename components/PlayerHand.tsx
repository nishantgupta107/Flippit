import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
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

export function PlayerHand({
  player,
  isActive,
  pendingDrawAnimation,
  lastEvent,
}: PlayerHandProps) {
  const roundScore = player.roundScore;
  const isFrozen = player.outReason === 'FROZEN';
  const isBusted = player.outReason === 'BUSTED';
  const numberCards = player.hand.filter(c => c.type === 'NUMBER');
  const modifierCards = player.hand.filter(c => c.type === 'MODIFIER_MULT' || c.type === 'MODIFIER_BONUS');
  const actionCards = player.hand.filter(c => c.type.startsWith('ACTION_'));

  const shakeTranslateX = useSharedValue(0);
  const shakeTranslateY = useSharedValue(0);

  useEffect(() => {
    if (lastEvent?.kind === 'freeze' && lastEvent.playerId === player.id) {
      shakeTranslateX.value = withSequence(
        withTiming(2, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(2, { duration: 50 }),
        withTiming(-1, { duration: 50 }),
        withTiming(1, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      shakeTranslateY.value = withSequence(
        withTiming(2, { duration: 50 }),
        withTiming(0, { duration: 50 }),
        withTiming(-1, { duration: 50 }),
        withTiming(2, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [lastEvent, player.id, shakeTranslateX, shakeTranslateY]);

  useEffect(() => {
    if (isBusted && lastEvent?.kind === 'bust' && lastEvent.playerId === player.id) {
      // Small delay then shake
      shakeTranslateX.value = withDelay(
        200,
        withSequence(
          withTiming(-10, { duration: 80 }),
          withTiming(10, { duration: 80 }),
          withTiming(-8, { duration: 80 }),
          withTiming(8, { duration: 80 }),
          withTiming(-4, { duration: 80 }),
          withTiming(0, { duration: 80 })
        )
      );
      shakeTranslateY.value = withDelay(
        200,
        withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(-1, { duration: 80 }),
          withTiming(1, { duration: 80 }),
          withTiming(0, { duration: 80 })
        )
      );
    }
  }, [isBusted, lastEvent, player.id, shakeTranslateX, shakeTranslateY]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: shakeTranslateX.value },
        { translateY: shakeTranslateY.value }
      ],
      borderColor: isActive ? colors.primary : colors.outlineVariant,
      borderWidth: isActive ? 2 : 1,
      backgroundColor: isActive ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
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
                  <Card
                    card={c}
                    status={player.active || player.outReason === 'BUSTED' ? undefined : player.outReason?.toLowerCase()}
                    disableIntroAnimation={false} // Let it animate in if it wasn't in pending
                  />
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
  }
});