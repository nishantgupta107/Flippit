import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, findNodeHandle, Platform } from 'react-native';
import { Stack } from 'expo-router';
import Animated, { FadeIn, SlideInUp, SlideOutUp, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, radius } from '../../constants/theme';
import { PrimaryButton, SecondaryButton, TertiaryButton } from '../../components/ui';
import { PlayerHand } from '../../components/PlayerHand';
import { Card } from '../../components/ui/Card';
import { Flip7Celebration } from '../../components/Flip7Celebration';
import { OpponentConciseCard } from '../../components/game/OpponentConciseCard';
import { FlipThreeOverlay } from '../../components/game/FlipThreeOverlay';
import useGameStore from '../../store/gameStore';
import type { PlayerInput } from '../../engine/types';
import { rem } from '../../utils/scaling';

const DEMO_PLAYERS: PlayerInput[] = [
  { id: 'human', name: 'You', avatar: 'Y', isBot: false },
  { id: 'bot-easy', name: 'Easy Bot', avatar: 'E', isBot: true, botDifficulty: 'EASY' },
  { id: 'bot-hard', name: 'Hard Bot', avatar: 'H', isBot: true, botDifficulty: 'HARD' },
];

export default function GameScreen() {
  const {
    gameState,
    pendingDrawAnimation,
    displayedActivePlayerId,
    initGame,
    playerHit,
    playerStay,
    selectActionTarget,
    startNewRound,
  } = useGameStore();

  const deckRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isRoundSummaryOpen, setIsRoundSummaryOpen] = useState(false);

  // Card flight measurement state
  const [cardFlight, setCardFlight] = useState<{
    visible: boolean;
    card: any;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    phase: 'spawn' | 'flip' | 'travel' | 'fade';
    isBustCard: boolean;
  }>({
    visible: false,
    card: null,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    phase: 'spawn',
    isBustCard: false,
  });

  // Refs to measure target hand positions keyed by playerId
  const handRefs = useRef<Map<string, View>>(new Map());

  const setHandRef = useCallback((playerId: string, ref: View | null) => {
    if (ref) {
      handRefs.current.set(playerId, ref);
    } else {
      handRefs.current.delete(playerId);
    }
  }, []);

  // Ghost positions for precise card flight targeting (keyed by playerId)
  // Using ref to avoid infinite re-render loop - we only need latest value in measurement effect
  const ghostPositionsRef = useRef<Map<string, { x: number; y: number } | null>>(new Map());

  const handleGhostPositionMeasured = useCallback((playerId: string, position: { x: number; y: number } | null) => {
    if (position) {
      ghostPositionsRef.current.set(playerId, position);
    } else {
      ghostPositionsRef.current.delete(playerId);
    }
  }, []);

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null;
  const humanPlayer = gameState?.players.find(p => !p.isBot);
  const aiPlayers = gameState?.players.filter(p => p.isBot) || [];

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const isHumanTurn = Boolean(currentPlayer && !currentPlayer.isBot);
  const canAct = isHumanTurn && !gameState?.pendingAction && !gameState?.roundOver && !gameState?.gameOver;
  const showEndRoundButton = Boolean(gameState?.roundOver && !gameState?.gameOver);
  const showRoundSummaryOverlay = Boolean(gameState?.gameOver || (gameState?.roundOver && isRoundSummaryOpen));

  const validTargetIds = new Set(
    (gameState?.players ?? [])
      .filter((player) => {
        if (!player.active || !gameState?.pendingAction) {
          return false;
        }

        if (gameState.pendingAction.type === 'SECOND_CHANCE_TARGET') {
          return player.id !== gameState.pendingAction.actingPlayerId;
        }

        return true;
      })
      .map((player) => player.id)
  );

  const drawPileLength = gameState ? gameState.deck.length : 0;
  const lastEvent = gameState?.lastEvent;

  const hasFlip7 = gameState?.players.some(p => {
    return new Set(p.hand.filter(c => c.type === 'NUMBER').map(c => c.value)).size >= 7;
  }) ?? false;

  useEffect(() => {
    if (!gameState?.roundOver) {
      setIsRoundSummaryOpen(false);
    }
  }, [gameState?.roundOver, gameState?.roundNumber]);

  // Reset card flight when new round starts (hands are cleared)
  useEffect(() => {
    if (gameState && gameState.roundNumber > 0) {
      setCardFlight(prev => ({ ...prev, visible: false }));
      // Reset the flight progress shared value so the next round's first card
      // doesn't snap to position 1 (the end of the previous flight).
      flightProgress.value = 0;
      handRefs.current.clear();
      ghostPositionsRef.current.clear();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.roundNumber]);

  // Card flight animation values
  const flightProgress = useSharedValue(0);
  const flightPhase = useSharedValue<'spawn' | 'flip' | 'travel' | 'fade'>('spawn');

  // Measure positions and start card flight animation
  useEffect(() => {
    if (!pendingDrawAnimation || !gameState) return;

    if (pendingDrawAnimation.phase === 'spawn') {
      flightProgress.value = 0;
      setCardFlight(prev => ({ ...prev, visible: false }));
    }

    const measureAndAnimate = async () => {
      // Small delay to allow ghost card to render and be measured
      await new Promise(resolve => setTimeout(resolve, 60));

      const targetHandRef = handRefs.current.get(pendingDrawAnimation.playerId);

      // Measure deck position live. getBoundingClientRect on web is synchronous
      // and reliable after the 60ms settle delay — no cached value is needed.
      let deckPos: { x: number; y: number };

      if (Platform.OS === 'web') {
        const element = deckRef.current as any;
        if (element?.getBoundingClientRect) {
          const rect = element.getBoundingClientRect();
          deckPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        } else {
          deckPos = { x: 0, y: 0 };
        }
      } else {
        const deckNode = findNodeHandle(deckRef.current);
        if (!deckNode) return;
        const { UIManager } = require('react-native');
        deckPos = await new Promise<{ x: number; y: number }>((resolve) => {
          UIManager.measure(deckNode, (_x: number, _y: number, w: number, h: number, pageX: number, pageY: number) => {
            resolve({ x: pageX + w / 2, y: pageY + h / 2 });
          });
        });
      }

      // Get ghost position for precise targeting, or fall back to hand center
      const ghostPos = ghostPositionsRef.current.get(pendingDrawAnimation.playerId);
      let targetPos: { x: number; y: number };

      if (ghostPos) {
        // Use ghost position for precise slot targeting
        targetPos = ghostPos;
      } else {
        // Fall back to estimating based on deck position
        targetPos = { x: deckPos.x, y: deckPos.y + (humanPlayer?.id === pendingDrawAnimation.playerId ? 200 : -200) };

        // Try measuring hand center as fallback
        if (targetHandRef) {
          if (Platform.OS === 'web') {
            const element = targetHandRef as any;
            if (element?.getBoundingClientRect) {
              const rect = element.getBoundingClientRect();
              targetPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
          } else {
            const targetNode = findNodeHandle(targetHandRef);
            if (targetNode) {
              const { UIManager } = require('react-native');
              targetPos = await new Promise<{ x: number; y: number }>((resolve) => {
                UIManager.measure(targetNode, (_x: number, _y: number, w: number, h: number, pageX: number, pageY: number) => {
                  resolve({ x: pageX + w / 2, y: pageY + h / 2 });
                });
              });
            }
          }
        }
      }

      // Start the card flight
      setCardFlight({
        visible: true,
        card: pendingDrawAnimation.card,
        startX: deckPos.x,
        startY: deckPos.y,
        endX: targetPos.x,
        endY: targetPos.y,
        phase: pendingDrawAnimation.phase,
        isBustCard: pendingDrawAnimation.eventKind === 'bust' || pendingDrawAnimation.eventKind === 'second_chance_used',
      });
    };

    measureAndAnimate();
  }, [pendingDrawAnimation, gameState, humanPlayer?.id]);

  // Update flight phase and progress when pendingDrawAnimation changes
  useEffect(() => {
    if (!pendingDrawAnimation || !cardFlight.visible) return;

    flightPhase.value = pendingDrawAnimation.phase;

    if (pendingDrawAnimation.phase === 'travel') {
      const isSecondChance = pendingDrawAnimation.eventKind === 'second_chance_used';
      flightProgress.value = withTiming(isSecondChance ? 0.6 : 1, { duration: isSecondChance ? 390 : 650 });
    } else if (pendingDrawAnimation.phase === 'spawn') {
      flightProgress.value = 0;
    }

    // Hide flight card when animation completes
    if (pendingDrawAnimation.phase === 'fade' || !pendingDrawAnimation) {
      setTimeout(() => {
        setCardFlight(prev => ({ ...prev, visible: false }));
      }, 500);
    }
  }, [pendingDrawAnimation, cardFlight.visible, flightPhase, flightProgress]);

  // Global card flight style (positioned absolutely on screen)
  const cardFlightStyle = useAnimatedStyle(() => {
    if (!cardFlight.visible) return { opacity: 0 };

    const progress = flightProgress.value;
    const phase = flightPhase.value;

    // Calculate position with arc
    const startX = cardFlight.startX;
    const startY = cardFlight.startY;
    const endX = cardFlight.endX;
    const endY = cardFlight.endY;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Linear interpolation
    const x = startX + deltaX * progress;
    const y = startY + deltaY * progress;

    // Add arc offset (parabolic path)
    const arcHeight = Math.min(Math.abs(deltaX), Math.abs(deltaY)) * 0.3;
    const arcOffset = Math.sin(progress * Math.PI) * -arcHeight;

    return {
      position: 'absolute',
      left: x - rem(2.5), // Center the card (half width)
      top: y - rem(3.5) + arcOffset, // Center the card (half height) + arc
      opacity: phase === 'fade' ? 1 - progress : 1,
      zIndex: 10000,
      transform: [
        { scale: phase === 'spawn' ? 0.9 : 1 },
      ],
    };
  });

  // Render start screen if game not initialized
  if (!gameState) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Game', headerShown: false }} />
        <View style={styles.startContainer}>
          <Text style={styles.title}>Flippit Phase 2</Text>
          <PrimaryButton label="Start Demo Game" onPress={() => initGame(DEMO_PLAYERS, 42)} />
        </View>
      </View>
    );
  }

  // Note: card flight animation is now handled via cardFlight state and measure() API

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Game', headerShown: false }} />

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {/* Opponents Area */}
        {aiPlayers.length > 0 && (
          isMobile ? (() => {
            // Mobile 3-area layout: Top shows active opponent hand, edges show other opponents
            // Find the opponent to show in top area: currently active player, or the player whose turn just ended
            const activeOpponent = aiPlayers.find(p => p.id === displayedActivePlayerId && p.active);
            // If displayed player is no longer active (just banked/busted), they are still the "last active"
            const lastActiveOpponent = aiPlayers.find(p => p.id === displayedActivePlayerId) || aiPlayers.filter(p => p.active).pop() || aiPlayers[aiPlayers.length - 1];
            const topOpponent = activeOpponent || lastActiveOpponent;

            return (
              <View style={styles.mobileOpponentsContainer}>
                {/* Top Area: Active opponent hand - changes based on whose turn it is */}
                {topOpponent && (
                  <View style={styles.mobileTopOpponent}>
                    <PlayerHand
                      ref={(ref) => setHandRef(topOpponent.id, ref)}
                      player={topOpponent}
                      isActive={displayedActivePlayerId === topOpponent.id && gameState.phase === 'PLAYER_TURN'}
                      isMobile={isMobile}
                      pendingDrawAnimation={pendingDrawAnimation}
                      lastEvent={lastEvent}
                      onGhostPositionMeasured={(pos) => handleGhostPositionMeasured(topOpponent.id, pos)}
                    />
                  </View>
                )}
              </View>
            );
          })() : (
            <View style={styles.aiGrid}>
              {aiPlayers.map(ai => (
                <View key={ai.id} style={styles.aiPlayerWrapper}>
                  <PlayerHand
                    ref={(ref) => setHandRef(ai.id, ref)}
                    player={ai}
                    isActive={displayedActivePlayerId === ai.id && gameState.phase === 'PLAYER_TURN'}
                    isMobile={isMobile}
                    pendingDrawAnimation={pendingDrawAnimation}
                    lastEvent={lastEvent}
                    onGhostPositionMeasured={(pos) => handleGhostPositionMeasured(ai.id, pos)}
                  />
                </View>
              ))}
            </View>
          )
        )}

        {/* Center Table (Draw Deck & Events) */}
        <View style={[styles.centerTable, isMobile && styles.mobileCenterTable]}>
          {/* Mobile: Left edge opponent (if 3+ players) */}
          {isMobile && (() => {
            const activeOpponent = aiPlayers.find(p => p.id === displayedActivePlayerId && p.active);
            const lastActiveOpponent = aiPlayers.find(p => p.id === displayedActivePlayerId) || aiPlayers.filter(p => p.active).pop() || aiPlayers[aiPlayers.length - 1];
            const topOpponent = activeOpponent || lastActiveOpponent;
            const otherOpponents = aiPlayers.filter(p => p.id !== topOpponent?.id);
            return otherOpponents[0] ? (
              <View style={styles.mobileLeftEdge}>
                <OpponentConciseCard player={otherOpponents[0]} />
              </View>
            ) : null;
          })()}

          <View style={styles.deckSection}>
            <View style={styles.deckContainer}>
              <View
                ref={deckRef}
                style={styles.deckStack}
              >
                {drawPileLength > 0 ? (
                  Array.from({ length: Math.min(5, Math.max(1, Math.ceil(drawPileLength / 10))) }).map((_, i) => (
                    <View key={i} style={[styles.deckCardWrapper, { top: -i * 2, left: -i * 2, zIndex: i }]}>
                      <Card isFaceDown disableIntroAnimation />
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyDeck}>
                    <Text style={styles.emptyDeckText}>Empty</Text>
                  </View>
                )}
                <Text style={styles.deckCount}>{drawPileLength} CARDS</Text>
              </View>

              <View style={styles.deckFlipSlot} />
            </View>

            {/* Event Toast */}
            {lastEvent && lastEvent.kind !== 'round_end' && lastEvent.kind !== 'game_over' && (
              <Animated.View
                entering={SlideInUp.springify().damping(20)}
                exiting={SlideOutUp}
                style={styles.eventToast}
              >
                <Text style={styles.eventToastText}>
                  <Text style={styles.eventToastBold}>
                    {gameState.players.find((p) => p.id === lastEvent.playerId)?.name}:
                  </Text>
                  {' '}
                  {lastEvent.message || (lastEvent.kind === 'card_drawn' ? `Drew ${lastEvent.card?.value || lastEvent.card?.type}` : lastEvent.kind.replace('_', ' '))}
                </Text>
              </Animated.View>
            )}

            {/* Action Target Picker — Freeze & Second Chance only.
                 Flip Three is handled by the dedicated FlipThreeOverlay. */}
            {gameState.pendingAction &&
             gameState.pendingAction.type !== 'FLIP_THREE_TARGET' &&
             gameState.pendingAction.actingPlayerId === humanPlayer?.id && (
              <View style={styles.actionPicker}>
                <Text style={styles.actionPickerTitle}>Select Target</Text>
                <View style={styles.targetGrid}>
                  {gameState.players.map((player) => {
                    const isValid = validTargetIds.has(player.id);
                    return (
                      <TertiaryButton
                        key={player.id}
                        label={player.name}
                        onPress={() => isValid && selectActionTarget(player.id)}
                        disabled={!isValid}
                        style={{ opacity: isValid ? 1 : 0.5, flex: 1 }}
                      />
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Mobile: Right edge opponent (if 4 players) */}
          {isMobile && (() => {
            const activeOpponent = aiPlayers.find(p => p.id === displayedActivePlayerId && p.active);
            const lastActiveOpponent = aiPlayers.find(p => p.id === displayedActivePlayerId) || aiPlayers.filter(p => p.active).pop() || aiPlayers[aiPlayers.length - 1];
            const topOpponent = activeOpponent || lastActiveOpponent;
            const otherOpponents = aiPlayers.filter(p => p.id !== topOpponent?.id);
            return otherOpponents[1] ? (
              <View style={styles.mobileRightEdge}>
                <OpponentConciseCard player={otherOpponents[1]} />
              </View>
            ) : null;
          })()}
        </View>

        {/* Human Area */}
        {humanPlayer && (
          <View style={styles.humanArea}>
            <PlayerHand
              ref={(ref) => setHandRef(humanPlayer.id, ref)}
              player={humanPlayer}
              isActive={displayedActivePlayerId === humanPlayer.id && gameState.phase === 'PLAYER_TURN'}
              isMobile={isMobile}
              pendingDrawAnimation={pendingDrawAnimation}
              lastEvent={lastEvent}
              onGhostPositionMeasured={(pos) => handleGhostPositionMeasured(humanPlayer.id, pos)}
            />
          </View>
        )}

      </ScrollView>

      {/* Global Card Flight Overlay - Rendered at root level for cross-container animation */}
      {cardFlight.visible && (
        <Animated.View style={cardFlightStyle} pointerEvents="none">
          <Card
            key={cardFlight.card?.id || 'flight-card'}
            card={cardFlight.card}
            isFaceDown={cardFlight.phase === 'spawn'}
            disableIntroAnimation
            isBustCard={cardFlight.isBustCard}
          />
        </Animated.View>
      )}

      {/* Flip Three card-reveal overlay — self-contained, manages own visibility */}
      <FlipThreeOverlay />

      {/* Flip 7 Celebration Overlay */}
      {hasFlip7 && <Flip7Celebration />}

      {/* Footer Controls */}
      <View style={styles.footer}>
        {showEndRoundButton ? (
          <PrimaryButton label="End Round" onPress={() => setIsRoundSummaryOpen(true)} />
        ) : gameState.phase === 'PLAYER_TURN' && !gameState.pendingAction ? (
          <View style={styles.controlsRow}>
            <PrimaryButton
              label="HIT"
              onPress={() => humanPlayer && playerHit(humanPlayer.id)}
              disabled={!canAct}
              style={{ flex: 1 }}
            />
            <SecondaryButton
              label="STAY"
              onPress={() => humanPlayer && playerStay(humanPlayer.id)}
              disabled={!canAct}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
      </View>

      {/* Overlays */}
      {showRoundSummaryOverlay && (
        <Animated.View entering={FadeIn} style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {gameState.gameOver ? '🏆 Game Over' : `Round ${gameState.roundNumber - 1} Summary`}
            </Text>

            {gameState.gameOver && (
              <Text style={styles.modalSubtitle}>
                {gameState.players.find(p => p.id === gameState.winner)?.name} wins!
              </Text>
            )}

            <View style={styles.scoreboard}>
              {[...gameState.players].sort((a, b) => b.totalScore - a.totalScore).map(p => (
                <View key={p.id} style={styles.scoreRow}>
                  <Text style={styles.scoreName}>
                    {p.name} {p.id === gameState.winner && gameState.gameOver ? '👑' : ''}
                  </Text>
                  <Text style={[
                    styles.scoreTotal,
                    p.roundScore > 0 ? { color: colors.primary } : {}
                  ]}>
                    {gameState.roundOver && !gameState.gameOver && `(+${p.roundScore}) `}
                    {p.totalScore}
                  </Text>
                </View>
              ))}
            </View>

            {gameState.roundOver && !gameState.gameOver ? (
              <PrimaryButton
                label="Next Round"
                onPress={() => {
                  setIsRoundSummaryOpen(false);
                  startNewRound();
                }}
              />
            ) : (
              <PrimaryButton label="Play Again" onPress={() => initGame(DEMO_PLAYERS, Date.now())} />
            )}
          </View>
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  startContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: rem(2),
    gap: rem(1.5),
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(2),
    color: colors.primary,
  },
  scrollContent: {
    padding: rem(1),
    paddingBottom: rem(8), // Room for footer
    gap: rem(1.5),
  },
  // Mobile 3-area layout styles
  mobileOpponentsContainer: {
    width: '100%',
  },
  mobileTopOpponent: {
    width: '100%',
  },
  mobileCenterTable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: rem(0.5),
    marginVertical: rem(1),
    minHeight: rem(12),
    zIndex: 999,
  },
  mobileLeftEdge: {
    flexShrink: 0,
  },
  mobileRightEdge: {
    flexShrink: 0,
  },
  deckSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(2),
  },
  aiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(1),
  },
  aiPlayerWrapper: {
    flex: 1,
    minWidth: '45%',
  },
  miniOpponentsContainer: {
    flexDirection: 'row',
    gap: rem(0.5),
    paddingBottom: rem(0.5),
  },
  miniOpponent: {
    backgroundColor: colors.surfaceContainerLow,
    padding: rem(0.5),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    minWidth: rem(6),
    alignItems: 'center',
  },
  miniOpponentInactive: {
    opacity: 0.6,
  },
  miniOpponentName: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(0.875),
    color: colors.onSurface,
  },
  miniOpponentScore: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: rem(0.75),
    color: colors.onSurfaceVariant,
  },
  miniOpponentStatus: {
    fontSize: rem(1),
    marginTop: rem(0.25),
  },
  centerTable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: rem(1),
    minHeight: rem(10),
    gap: rem(2),
    zIndex: 999, // Elevation for the flying card
  },
  deckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: rem(12),
    height: rem(7),
  },
  deckStack: {
    width: rem(5),
    height: rem(7),
    position: 'relative',
  },
  deckCardWrapper: {
    position: 'absolute',
  },
  emptyDeck: {
    width: rem(5),
    height: rem(7),
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.outline,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDeckText: {
    color: colors.onSurfaceVariant,
    fontSize: rem(0.75),
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  deckCount: {
    position: 'absolute',
    bottom: -rem(1.5),
    left: -rem(1),
    right: -rem(1),
    textAlign: 'center',
    fontSize: rem(0.75),
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.onSurfaceVariant,
  },
  deckFlipSlot: {
    width: rem(5),
    height: rem(7),
    marginLeft: rem(1.5),
  },
  eventToast: {
    backgroundColor: colors.surfaceVariant,
    paddingVertical: rem(0.5),
    paddingHorizontal: rem(1),
    marginTop: rem(0.5),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  eventToastText: {
    color: colors.onSurface,
    fontSize: rem(0.875),
    fontFamily: 'PlusJakartaSans-Regular',
  },
  eventToastBold: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.primary,
  },
  actionPicker: {
    width: '100%',
    padding: rem(1),
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: rem(1),
  },
  actionPickerTitle: {
    textAlign: 'center',
    color: colors.onSurface,
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(1.25),
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(0.5),
  },
  humanArea: {
    marginTop: 'auto',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: rem(1),
    paddingBottom: rem(2), // Safe area approx
    backgroundColor: colors.surfaceContainerHighest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: rem(1),
  },
  cardFlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    pointerEvents: 'none',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,18,9,0.85)',
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: rem(1.5),
  },
  modal: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    padding: rem(2),
    width: '100%',
    maxWidth: rem(25),
    gap: rem(1.5),
  },
  modalTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(2),
    color: colors.primary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(1.25),
    color: colors.onSurface,
    textAlign: 'center',
  },
  scoreboard: {
    gap: rem(0.5),
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: rem(0.5),
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
  },
  scoreName: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.onSurface,
  },
  scoreTotal: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.onSurfaceVariant,
  },
});
