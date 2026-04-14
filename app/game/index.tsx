import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { colors, typography, spacing, radius } from '../../constants/theme';
import { PrimaryButton, SecondaryButton, TertiaryButton } from '../../components/ui';
import useGameStore from '../../store/gameStore';
import type { PendingAction, PlayerInput } from '../../engine/types';

const DEMO_PLAYERS: PlayerInput[] = [
  { id: 'human', name: 'You', avatar: 'Y', isBot: false },
  { id: 'bot-easy', name: 'Easy Bot', avatar: 'E', isBot: true, botDifficulty: 'EASY' },
  { id: 'bot-hard', name: 'Hard Bot', avatar: 'H', isBot: true, botDifficulty: 'HARD' },
];

function getPendingActionLabel(pendingAction: PendingAction | undefined): string {
  if (!pendingAction) {
    return '';
  }

  if (pendingAction.type === 'FREEZE_TARGET') {
    return 'Choose a player to freeze';
  }

  if (pendingAction.type === 'FLIP_THREE_TARGET') {
    return 'Choose a player for Flip Three';
  }

  return 'Choose a player to pass Second Chance to';
}

function getPlayerStatusLabel(
  player: {
    active: boolean;
    outReason?: 'BUSTED' | 'FROZEN' | 'BANKED';
  }
): string {
  if (player.active) {
    return 'Active';
  }

  if (player.outReason === 'BUSTED') {
    return 'Busted';
  }

  if (player.outReason === 'FROZEN') {
    return 'Frozen';
  }

  if (player.outReason === 'BANKED') {
    return 'Banked';
  }

  return 'Out';
}

export default function GameScreen() {
  const { gameState, initGame, playerHit, playerStay, selectActionTarget, startNewRound } =
    useGameStore();

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null;
  const actingPlayer = gameState?.pendingAction
    ? gameState.players.find((player) => player.id === gameState.pendingAction?.actingPlayerId) ?? null
    : null;
  const isHumanTurn = Boolean(currentPlayer && !currentPlayer.isBot);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Game', headerShown: false }} />
      <Text style={styles.title}>Flippit Phase 2</Text>
      <Text style={styles.description}>
        {gameState
          ? `Round ${gameState.roundNumber} • ${gameState.phase}`
          : 'Start a demo match to exercise the engine and target picker.'}
      </Text>
      {gameState?.gameOver ? (
        <Text style={styles.gameOverText}>
          Game over. Winner: {gameState.players.find((player) => player.id === gameState.winner)?.name ?? 'TBD'}
        </Text>
      ) : null}

      {!gameState ? (
        <PrimaryButton label="Start Demo Game" onPress={() => initGame(DEMO_PLAYERS, 42)} />
      ) : (
        <>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Current Turn</Text>
            <Text style={styles.panelBody}>
              {currentPlayer ? `${currentPlayer.name} • Total ${currentPlayer.totalScore}` : 'No active player'}
            </Text>
            <Text style={styles.panelBody}>
              Hand: {currentPlayer?.hand.map((card) => card.id).join(', ') || 'No cards yet'}
            </Text>
            <Text style={styles.panelBody}>Round Score: {currentPlayer?.roundScore ?? 0}</Text>
            <Text style={styles.panelBody}>
              Deck: {gameState.deck.length} • Discard: {gameState.discardPile.length}
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <PrimaryButton
              label="HIT"
              onPress={() => {
                if (currentPlayer) {
                  playerHit(currentPlayer.id);
                }
              }}
              disabled={
                !isHumanTurn ||
                Boolean(gameState.pendingAction) ||
                gameState.roundOver ||
                gameState.gameOver
              }
            />
            <SecondaryButton
              label="STAY"
              onPress={() => {
                if (currentPlayer) {
                  playerStay(currentPlayer.id);
                }
              }}
              disabled={
                !isHumanTurn ||
                Boolean(gameState.pendingAction) ||
                gameState.roundOver ||
                gameState.gameOver
              }
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Players</Text>
            {gameState.players.map((player) => (
              <View key={player.id} style={styles.playerRow}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerMeta}>
                  {getPlayerStatusLabel(player)} • Score {player.totalScore} • Shield {player.hasShield ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.playerCards}>
                  Hand: {player.hand.length > 0 ? player.hand.map((card) => card.id).join(', ') : 'No cards yet'}
                </Text>
              </View>
            ))}
          </View>

          {gameState.pendingAction && actingPlayer && !actingPlayer.isBot ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Action Target</Text>
              <Text style={styles.panelBody}>{getPendingActionLabel(gameState.pendingAction)}</Text>
              {gameState.players.map((player) => {
                const isValid = validTargetIds.has(player.id);
                return (
                  <Pressable
                    key={player.id}
                    onPress={() => {
                      if (isValid) {
                        selectActionTarget(player.id);
                      }
                    }}
                    disabled={!isValid}
                    style={[styles.targetButton, !isValid && styles.targetButtonDisabled]}
                  >
                    <Text style={styles.targetButtonText}>
                      {player.name} • Score {player.totalScore}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {gameState.roundOver && !gameState.gameOver && (
            <TertiaryButton label="Start New Round" onPress={() => startNewRound()} />
          )}
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing[16],
    gap: spacing[12],
    minHeight: '100%',
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  gameOverText: {
    ...typography.titleSm,
    color: colors.secondaryContainer,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  panel: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing[12],
    gap: spacing[8],
  },
  panelTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  panelBody: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  playerRow: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    padding: spacing[8],
    gap: spacing[4],
  },
  playerName: {
    ...typography.titleSm,
    color: colors.onSurface,
  },
  playerMeta: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  playerCards: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  targetButton: {
    backgroundColor: colors.surfaceBright,
    borderRadius: radius.md,
    padding: spacing[10],
  },
  targetButtonDisabled: {
    opacity: 0.4,
  },
  targetButtonText: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
});
