import { useEffect, useRef, forwardRef } from 'react';
import { LayoutChangeEvent, View, Text, StyleSheet, Platform } from 'react-native';
import { useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Layout,
  FadeIn,
  useDerivedValue,
  interpolate,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PlayerState } from '../engine/types';
import { Card, Chip, ScoreHUD } from './ui';
import { colors, radius } from '../constants/theme';
import { rem, vw, vh } from '../utils/scaling';

export interface PlayerHandProps {
  player: PlayerState;
  isActive: boolean;
  isMobile: boolean;
  pendingDrawAnimation?: any;
  lastEvent?: { kind: string; playerId: string; card?: { id: string } };
  onGhostPositionMeasured?: (position: { x: number; y: number } | null) => void;
}

const FREEZE_STAGGER_MS = 60;
const FREEZE_ROTATION_DURATION_MS = 400;
const FREEZE_ICE_DURATION_MS = 1000;
const FREEZE_SHINE_DURATION_MS = 600;
const FREEZE_SHAKE_DURATION_MS = 1000;
const BUST_WAVE_STEP_MS = 120;
const BUST_CARD_TINT_DURATION_MS = 220;
const BUST_SHAKE_DURATION_MS = 520;

interface AnimatedCardWrapperProps {
  card: any;
  index: number;
  hasSeenCard: boolean;
  isBusted: boolean;
  duplicateCardIndex: number;
  hasBustWaveStarted: boolean;
  player: PlayerState;
  overlapOffset?: number;
  isFrozen?: boolean;
  freezeProgress: Animated.SharedValue<number>;
  isFlip7: boolean;
}

function AnimatedCardWrapper({
  card,
  index,
  hasSeenCard,
  isBusted,
  duplicateCardIndex,
  hasBustWaveStarted,
  player,
  overlapOffset,
  isFrozen,
  freezeProgress,
  isFlip7,
}: AnimatedCardWrapperProps) {
  const flip7TranslateY = useSharedValue(0);

  useEffect(() => {
    if (isFlip7) {
      flip7TranslateY.value = withDelay(
        index * 120, // Staggered delay for Mexican wave
        withRepeat(
          withSequence(
            withTiming(-20, { duration: 250 }),
            withTiming(0, { duration: 250 }),
            withTiming(0, { duration: 500 })
          ),
          -1,
          false
        )
      );
    } else {
      flip7TranslateY.value = withTiming(0);
    }
  }, [isFlip7, index, flip7TranslateY]);
  const rotation = useDerivedValue(() => {
    if (!isFrozen) return 0;
    // Sequential domino effect: cards start rotating one by one
    // We map freezeProgress (0-1) to card rotation (0-90)
    const start = (index * FREEZE_STAGGER_MS) / (FREEZE_ICE_DURATION_MS + (player.hand.length * FREEZE_STAGGER_MS));
    const end = start + (FREEZE_ROTATION_DURATION_MS / (FREEZE_ICE_DURATION_MS + (player.hand.length * FREEZE_STAGGER_MS)));
    
    return interpolate(
      freezeProgress.value,
      [start, Math.min(1, end)],
      [0, 90],
      'clamp'
    );
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotateZ: `${rotation.value}deg` },
        { translateY: flip7TranslateY.value }
      ]
    };
  });

  return (
    <Animated.View
      layout={Layout.springify().damping(16).stiffness(200)}
      entering={hasSeenCard ? undefined : FadeIn}
      style={[
        styles.cardWrapper,
        animatedStyle,
        {
          marginLeft: overlapOffset ?? (index === 0 ? 0 : overlapOffset),
          zIndex: index,
        }
      ]}
    >
      <View style={styles.cardContent}>
        {isBusted && duplicateCardIndex !== -1 && hasBustWaveStarted && (
          <Animated.View
            entering={FadeIn.delay(Math.abs(index - duplicateCardIndex) * BUST_WAVE_STEP_MS).duration(BUST_CARD_TINT_DURATION_MS)}
            style={styles.bustTint}
          />
        )}
        <Card
          card={card}
          status={player.active || player.outReason === 'BUSTED' ? undefined : player.outReason?.toLowerCase()}
          disableIntroAnimation={hasSeenCard}
        />
      </View>
    </Animated.View>
  );
}

export const PlayerHand = forwardRef<View, PlayerHandProps>(function PlayerHand({
  player,
  isActive,
  isMobile,
  pendingDrawAnimation,
  lastEvent,
  onGhostPositionMeasured,
}, ref) {
  const [isFreezeBurstActive, setIsFreezeBurstActive] = useState(false);
  const [hasBustWaveStarted, setHasBustWaveStarted] = useState(false);
  const [isBustShakeActive, setIsBustShakeActive] = useState(false);
  const [isFreezeShakeActive, setIsFreezeShakeActive] = useState(false);
  const [isSecondChanceExitActive, setIsSecondChanceExitActive] = useState(false);
  const [numberLaneWidth, setNumberLaneWidth] = useState(0);
  const [modifierLaneHeight, setModifierLaneHeight] = useState(0);
  const seenNumberCardIdsRef = useRef<Set<string>>(
    new Set(player.hand.filter((card) => card.type === 'NUMBER').map((card) => card.id))
  );

  const roundScore = player.roundScore;
  const isFrozen = player.outReason === 'FROZEN';
  const isBusted = player.outReason === 'BUSTED';
  const numberCards = player.hand
    .filter(c => c.type === 'NUMBER')
    .sort((a, b) => a.value - b.value || a.id.localeCompare(b.id));
  const modifierCards = player.hand
    .filter(c => c.type === 'MODIFIER_MULT' || c.type === 'MODIFIER_BONUS')
    .sort((a, b) => a.value - b.value || a.id.localeCompare(b.id));
  const actionCards = player.hand.filter(c => c.type.startsWith('ACTION_'));

  const hasSecondChance = player.hasShield;
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
  const shouldShowSecondChanceBorder = (hasSecondChance || isSecondChanceExitActive) && !isFrozen && player.outReason !== 'BANKED';

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
  const borderPulse = useSharedValue(0);
  const freezeProgress = useSharedValue(0); // 0 to 1
  const shineProgress = useSharedValue(0); // 0 to 1

  useEffect(() => {
    if (isFrozen && freezeProgress.value < 1) {
      setIsFreezeShakeActive(true);
      // Start sequential domino and ice build-up
      freezeProgress.value = withTiming(1, { duration: FREEZE_ICE_DURATION_MS + (numberCards.length * FREEZE_STAGGER_MS) }, () => {
        // Once ice is solid, stop shaking and run shine sweep
        require('react-native-reanimated').runOnJS(setIsFreezeShakeActive)(false);
        shineProgress.value = withTiming(1, { duration: FREEZE_SHINE_DURATION_MS });
      });
    } else if (!isFrozen) {
      freezeProgress.value = 0;
      shineProgress.value = 0;
      setIsFreezeShakeActive(false);
    }
  }, [isFrozen, numberCards.length, freezeProgress, shineProgress]);

  useEffect(() => {
    if (isFreezeBurstActive || isFreezeShakeActive) {
      shakeTranslateX.value = withSequence(
        withTiming(2, { duration: 100 }),
        withTiming(-2, { duration: 100 }),
        withRepeat(
          withSequence(
            withTiming(2, { duration: 100 }),
            withTiming(-2, { duration: 100 })
          ),
          -1,
          true
        )
      );
      shakeTranslateY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(-1, { duration: 80 })
        ),
        -1,
        true
      );
    } else {
      shakeTranslateX.value = withTiming(0);
      shakeTranslateY.value = withTiming(0);
    }
  }, [isFreezeBurstActive, isFreezeShakeActive, shakeTranslateX, shakeTranslateY]);

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
    let borderColor: string = isActive ? colors.primary : colors.outlineVariant;
    let borderWidth = isActive ? 2 : 1;

    // Simulate glowing teal border when shield is active
    if (shouldShowSecondChanceBorder) {
      borderColor = '#86efac';
      borderWidth = 2;
    }

    return {
      transform: [
        { translateX: shakeTranslateX.value },
        { translateY: shakeTranslateY.value }
      ],
      borderColor,
      borderWidth,
      backgroundColor: isActive ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
    };
  });

  const secondChanceBorderStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(borderPulse.value, [0, 1], [0.3, 1]),
      borderWidth: 2,
      borderColor: '#86efac',
      shadowColor: '#86efac',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 4,
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.lg,
    };
  });

  const iceOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(freezeProgress.value, [0, 1], [0, 1]),
    };
  });

  const shineStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: interpolate(shineProgress.value, [0, 1], [-vw(50), vw(100)]) },
        { skewX: '-20deg' }
      ],
      opacity: interpolate(shineProgress.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
    };
  });

  const statusEmoji =
    player.active ? '🟢' :
    player.outReason === 'BANKED' ? '🏦' :
    player.outReason === 'BUSTED' ? '💥' :
    player.outReason === 'FROZEN' ? '❄️' : '⚪';

  const shouldOmitPendingCard = pendingDrawAnimation?.playerId === player.id;
  const incomingCardId = pendingDrawAnimation?.card.id;
  // Note: incomingCardValue can be used for debugging or future animations
  void pendingDrawAnimation?.card.value;
  
  // Find where the card WILL be inserted in the sorted list
  const insertIndex = (() => {
    if (!shouldOmitPendingCard) return -1;
    
    const cardIdx = numberCards.findIndex(c => c.id === incomingCardId);
    if (cardIdx !== -1) return cardIdx;
    
    // If it's not a number card (modifier/action), target the end of the number row
    return numberCards.length;
  })();



  const displayedNumberCards = shouldOmitPendingCard
    ? numberCards.filter(c => c.id !== incomingCardId)
    : numberCards;

  const displayedModifierCards = shouldOmitPendingCard
    ? modifierCards.filter(c => c.id !== pendingDrawAnimation.card.id)
    : modifierCards;

  const displayedActionCards = shouldOmitPendingCard
    ? actionCards.filter(c => c.id !== pendingDrawAnimation.card.id)
    : actionCards;

  const cardWidth = rem(5);
  const cardHeight = rem(7);
  const handGap = rem(0.2);
  const minCascadeStep = rem(1.15);
  
  // Ghost card ref for measuring target position
  const ghostCardRef = useRef<View>(null);
  
  // Measure ghost position and report to parent
  useEffect(() => {
    if (!shouldOmitPendingCard || insertIndex === -1) {
      onGhostPositionMeasured?.(null);
      return;
    }
    
    // Small delay to allow layout to settle
    const timeoutId = setTimeout(() => {
      if (Platform.OS === 'web') {
        const element = ghostCardRef.current as any;
        if (element?.getBoundingClientRect) {
          const rect = element.getBoundingClientRect();
          onGhostPositionMeasured?.({ 
            x: rect.left + rect.width / 2, 
            y: rect.top + rect.height / 2 
          });
        }
      } else {
        const ghostNode = require('react-native').findNodeHandle(ghostCardRef.current);
        if (ghostNode) {
          const { UIManager } = require('react-native');
          UIManager.measure(ghostNode, (_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
            onGhostPositionMeasured?.({ 
              x: pageX + width / 2, 
              y: pageY + height / 2 
            });
          });
        }
      }
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [shouldOmitPendingCard, insertIndex, onGhostPositionMeasured]);
  
  const chipHeightEstimate = rem(1.75);
  const modifierLaneWidth = rem(2.7);
  const modifierBaseGap = rem(0);
  const modifierCascadeOffset = rem(1.05);

  const cardSpacing = (() => {
    const cardCount = displayedNumberCards.length;

    if (cardCount <= 1) {
      return 0;
    }

    const fullWidth = cardCount * cardWidth + (cardCount - 1) * handGap;
    if (!numberLaneWidth || fullWidth <= numberLaneWidth) {
      return handGap;
    }

    const availableStep = (numberLaneWidth - cardWidth) / (cardCount - 1);
    const clampedStep = Math.max(minCascadeStep, Math.min(cardWidth + handGap, availableStep));

    return clampedStep - cardWidth;
  })();

  const modifierSpacing = (() => {
    const chipCount = displayedModifierCards.length;

    if (chipCount <= 3) {
      return modifierBaseGap;
    }

    const fullHeight = chipCount * chipHeightEstimate + (chipCount - 1) * modifierBaseGap;
    if (!modifierLaneHeight || fullHeight <= modifierLaneHeight) {
      return modifierBaseGap;
    }

    const availableStep = (modifierLaneHeight - chipHeightEstimate) / (chipCount - 1);
    return availableStep >= chipHeightEstimate ? modifierBaseGap : Math.max(modifierCascadeOffset, availableStep);
  })();

  const handleNumberLaneLayout = (event: LayoutChangeEvent) => {
    setNumberLaneWidth(event.nativeEvent.layout.width);
  };

  const handleModifierLaneLayout = (event: LayoutChangeEvent) => {
    setModifierLaneHeight(event.nativeEvent.layout.height);
  };

  useEffect(() => {
    displayedNumberCards.forEach((card) => {
      seenNumberCardIdsRef.current.add(card.id);
    });
  }, [displayedNumberCards]);

  // Reset seen cards when hand is cleared (new round started)
  useEffect(() => {
    if (player.hand.length === 0) {
      seenNumberCardIdsRef.current.clear();
    }
  }, [player.hand.length]);

  return (
    <Animated.View ref={ref} style={[styles.container, containerAnimatedStyle]}>
      {shouldShowSecondChanceBorder && (
        <Animated.View style={secondChanceBorderStyle} />
      )}

      {isFrozen && (
        <Animated.View style={[styles.frozenOverlay, iceOverlayStyle]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(104, 211, 255, 0.4)', 'rgba(255, 255, 255, 0.6)', 'rgba(104, 211, 255, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.shineSweep, shineStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.8)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
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
        {isMobile ? (
          <>
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

            <View style={styles.numberRow}>
              {displayedNumberCards.length === 0 && insertIndex === -1 ? (
                <Text style={styles.emptyText}>No cards drawn.</Text>
              ) : (
                <>
                  {/* Render cards before ghost position */}
                  {displayedNumberCards.slice(0, insertIndex === -1 ? displayedNumberCards.length : insertIndex).map((c, i) => {
                    const hasSeenCard = seenNumberCardIdsRef.current.has(c.id);
                    return (
                      <AnimatedCardWrapper
                        key={c.id}
                        card={c}
                        index={i}
                        hasSeenCard={hasSeenCard}
                        isBusted={isBusted}
                        duplicateCardIndex={duplicateCardIndex}
                        hasBustWaveStarted={hasBustWaveStarted}
                        player={player}
                        overlapOffset={i === 0 ? 0 : -rem(2)}
                        isFrozen={isFrozen}
                        freezeProgress={freezeProgress}
                        isFlip7={isFlip7}
                      />
                    );
                  })}
                  
                  {/* Ghost card at insert position */}
                  {insertIndex !== -1 && (
                    <View 
                      ref={ghostCardRef}
                      style={[
                        styles.ghostCard,
                        { 
                          width: cardWidth, 
                          height: cardHeight,
                          marginLeft: insertIndex === 0 ? 0 : -rem(2),
                        }
                      ]} 
                    />
                  )}
                  
                  {/* Render cards after ghost position */}
                  {insertIndex !== -1 && displayedNumberCards.slice(insertIndex).map((c, i) => {
                    const actualIndex = insertIndex + i;
                    const hasSeenCard = seenNumberCardIdsRef.current.has(c.id);
                    return (
                      <AnimatedCardWrapper
                        key={c.id}
                        card={c}
                        index={actualIndex}
                        hasSeenCard={hasSeenCard}
                        isBusted={isBusted}
                        duplicateCardIndex={duplicateCardIndex}
                        hasBustWaveStarted={hasBustWaveStarted}
                        player={player}
                        overlapOffset={actualIndex === 0 ? 0 : -rem(2)}
                        isFrozen={isFrozen}
                        freezeProgress={freezeProgress}
                        isFlip7={isFlip7}
                      />
                    );
                  })}
                </>
              )}
            </View>
          </>
        ) : (
          <View style={styles.desktopCardsLayout}>
            <View
              style={[styles.modifierLane, { width: modifierLaneWidth }]}
              onLayout={handleModifierLaneLayout}
            >
              <View style={styles.modifierLaneInner}>
                {displayedModifierCards.map((c, index) => (
                  <Animated.View
                    key={c.id}
                    layout={Layout.springify().damping(18).stiffness(220)}
                    entering={FadeIn}
                    style={{
                      marginTop: index === 0 ? 0 : displayedModifierCards.length > 3 ? -(chipHeightEstimate - modifierSpacing) / 2 : rem(0.5),
                      zIndex: index,
                    }}
                  >
                    <Chip
                      label={c.type === 'MODIFIER_MULT' ? `x${c.value}` : `+${c.value}`}
                      variant="multiplier"
                      style={styles.modifierChip}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>

            <View style={styles.desktopNumberLane} onLayout={handleNumberLaneLayout}>
              <View style={styles.numberRow}>
                {displayedNumberCards.length === 0 && insertIndex === -1 ? (
                  <Text style={styles.emptyText}>No cards drawn.</Text>
                ) : (
                  <>
                    {/* Render cards before ghost position */}
                    {displayedNumberCards.slice(0, insertIndex === -1 ? displayedNumberCards.length : insertIndex).map((c, i) => {
                      const hasSeenCard = seenNumberCardIdsRef.current.has(c.id);
                      return (
                        <AnimatedCardWrapper
                          key={c.id}
                          card={c}
                          index={i}
                          hasSeenCard={hasSeenCard}
                          isBusted={isBusted}
                          duplicateCardIndex={duplicateCardIndex}
                          hasBustWaveStarted={hasBustWaveStarted}
                          player={player}
                          overlapOffset={i === 0 ? 0 : cardSpacing}
                          isFrozen={isFrozen}
                          freezeProgress={freezeProgress}
                          isFlip7={isFlip7}
                        />
                      );
                    })}
                    
                    {/* Ghost card at insert position */}
                    {insertIndex !== -1 && (
                      <View 
                        ref={ghostCardRef}
                        style={[
                          styles.ghostCard,
                          { 
                            width: cardWidth, 
                            height: cardHeight,
                            marginLeft: insertIndex === 0 ? 0 : cardSpacing,
                          }
                        ]} 
                      />
                    )}
                    
                    {/* Render cards after ghost position */}
                    {insertIndex !== -1 && displayedNumberCards.slice(insertIndex).map((c, i) => {
                      const actualIndex = insertIndex + i;
                      const hasSeenCard = seenNumberCardIdsRef.current.has(c.id);
                      return (
                        <AnimatedCardWrapper
                          key={c.id}
                          card={c}
                          index={actualIndex}
                          hasSeenCard={hasSeenCard}
                          isBusted={isBusted}
                          duplicateCardIndex={duplicateCardIndex}
                          hasBustWaveStarted={hasBustWaveStarted}
                          player={player}
                          overlapOffset={actualIndex === 0 ? 0 : cardSpacing}
                          isFrozen={isFrozen}
                          freezeProgress={freezeProgress}
                          isFlip7={isFlip7}
                        />
                      );
                    })}
                  </>
                )}
              </View>
            </View>
          </View>
        )}
        {!isMobile && displayedActionCards.length > 0 && (
          <View style={styles.desktopActionRow}>
            {displayedActionCards.map(c => (
              <Chip key={c.id} label={
                c.type === 'ACTION_FREEZE' ? 'Freeze' :
                c.type === 'ACTION_FLIP_THREE' ? 'Flip 3' : '2nd Chance'
              } variant="action" />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

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
    zIndex: 20,
    overflow: 'hidden',
  },
  shineSweep: {
    position: 'absolute',
    top: -vh(20),
    bottom: -vh(20),
    width: rem(8),
    backgroundColor: 'transparent',
    zIndex: 21,
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
  desktopCardsLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: rem(0.65),
    minHeight: rem(7),
  },
  modifierLane: {
    minHeight: rem(7),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: rem(0.2),
    paddingVertical: rem(0.35),
  },
  modifierLaneInner: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  modifierChip: {
    alignSelf: 'center',
    minWidth: '100%',
    paddingHorizontal: rem(0.35),
  },
  desktopNumberLane: {
    flex: 1,
    minWidth: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(0.5),
  },
  desktopActionRow: {
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
  cardContent: {
    position: 'relative',
  },
  bustTint: {
    position: 'absolute',
    inset: 0,
    borderRadius: radius.md,
    backgroundColor: 'rgba(215, 56, 59, 0.4)',
    zIndex: 2,
  },
  ghostCard: {
    // Invisible placeholder that occupies the exact space the flying card will land in
    opacity: 0,
    pointerEvents: 'none',
  },
});
