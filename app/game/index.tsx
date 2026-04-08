import { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import Animated, { FadeIn, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { colors, radius } from '../../constants/theme';
import { PrimaryButton, SecondaryButton, TertiaryButton } from '../../components/ui';
import { PlayerHand } from '../../components/PlayerHand';
import { Card } from '../../components/ui/Card';
import useGameStore from '../../store/gameStore';
import type { PlayerInput } from '../../engine/types';
import { rem } from '../../utils/scaling';

const DEMO_PLAYERS: PlayerInput[] = [
  { id: 'human', name: 'You', avatar: 'Y', isBot: false },
  { id: 'bot-easy', name: 'Easy Bot', avatar: 'E', isBot: true, botDifficulty: 'EASY' },
  { id: 'bot-hard', name: 'Hard Bot', avatar: 'H', isBot: true, botDifficulty: 'HARD' },
];

export default function GameScreen() {
  const { gameState, pendingDrawAnimation, initGame, playerHit, playerStay, selectActionTarget, startNewRound } = useGameStore();

  const deckRef = useRef<View>(null);

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null;
  const humanPlayer = gameState?.players.find(p => !p.isBot);
  const aiPlayers = gameState?.players.filter(p => p.isBot) || [];

  const isHumanTurn = Boolean(currentPlayer && !currentPlayer.isBot);
  const canAct = isHumanTurn && !gameState?.pendingAction && !gameState?.roundOver && !gameState?.gameOver;

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

  // Animation for the floating card
  const isFloatingCardVisible = pendingDrawAnimation !== null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Game', headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Opponents Area */}
        {aiPlayers.length > 0 && (
          <View style={styles.aiGrid}>
            {aiPlayers.map(ai => (
              <View key={ai.id} style={styles.aiPlayerWrapper}>
                <PlayerHand
                  player={ai}
                  isActive={currentPlayer?.id === ai.id && gameState.phase === 'PLAYER_TURN'}
                  pendingDrawAnimation={pendingDrawAnimation}
                  lastEvent={lastEvent}
                />
              </View>
            ))}
          </View>
        )}

        {/* Center Table (Draw Deck & Events) */}
        <View style={styles.centerTable}>
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

            {/* The slot where a card flips */}
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

          {/* Action Target Picker */}
          {gameState.pendingAction && gameState.pendingAction.actingPlayerId === humanPlayer?.id && (
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

        {/* Human Area */}
        {humanPlayer && (
          <View style={styles.humanArea}>
            <PlayerHand
              player={humanPlayer}
              isActive={currentPlayer?.id === humanPlayer.id && gameState.phase === 'PLAYER_TURN'}
              pendingDrawAnimation={pendingDrawAnimation}
              lastEvent={lastEvent}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating Card Animation Overlay */}
      {isFloatingCardVisible && pendingDrawAnimation && (
        <Animated.View
          style={[
            styles.floatingCardContainer,
            {
              // Simple centered animation for RN for now - in a full port we'd measure destinations
              // and interpolate x/y values
              opacity: pendingDrawAnimation.phase === 'fade' ? 0 : 1,
              transform: [
                { scale: pendingDrawAnimation.phase === 'spawn' ? 0.9 : 1 },
                // Just translating it a bit down for travel
                { translateY: pendingDrawAnimation.phase === 'travel' ? 100 : 0 }
              ]
            }
          ]}
        >
          <Card
            card={pendingDrawAnimation.card}
            isFaceDown={pendingDrawAnimation.phase === 'spawn'}
            disableIntroAnimation
            isBustCard={pendingDrawAnimation.eventKind === 'bust' || pendingDrawAnimation.eventKind === 'second_chance_used'}
          />
        </Animated.View>
      )}

      {/* Footer Controls */}
      <View style={styles.footer}>
        {gameState.phase === 'PLAYER_TURN' && !gameState.pendingAction && (
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
        )}
      </View>

      {/* Overlays */}
      {(gameState.roundOver || gameState.gameOver) && (
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
              <PrimaryButton label="Next Round" onPress={startNewRound} />
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
  aiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(1),
  },
  aiPlayerWrapper: {
    flex: 1,
    minWidth: '45%',
  },
  centerTable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: rem(1),
    minHeight: rem(10),
    gap: rem(1.5),
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
  floatingCardContainer: {
    position: 'absolute',
    top: '40%', // simplified starting position
    left: '40%',
    zIndex: 100,
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