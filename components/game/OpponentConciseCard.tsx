import { View, Text, StyleSheet } from 'react-native';
import { PlayerState } from '../../engine/types';
import { colors, radius } from '../../constants/theme';
import { rem } from '../../utils/scaling';

interface OpponentConciseCardProps {
  player: PlayerState;
}

export function OpponentConciseCard({ player }: OpponentConciseCardProps) {
  const statusEmoji = player.active
    ? '🟢'
    : player.outReason === 'BANKED'
    ? '🏦'
    : player.outReason === 'BUSTED'
    ? '💥'
    : player.outReason === 'FROZEN'
    ? '❄️'
    : '⚪';

  const hasSecondChance = player.hand.some(
    (c) => c.type === 'ACTION_SECOND_CHANCE'
  );

  return (
    <View
      style={[
        styles.container,
        player.active && styles.activeContainer,
      ]}
    >
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {player.name}
      </Text>

      <View style={styles.scoreRow}>
        <Text style={styles.score}>{player.totalScore}</Text>
        <Text style={styles.status}>{statusEmoji}</Text>
      </View>

      {hasSecondChance && (
        <View style={styles.shieldBadge}>
          <Text style={styles.shieldIcon}>🛡️</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: rem(0.75),
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    minWidth: rem(6),
    maxWidth: rem(8),
    alignItems: 'center',
    gap: rem(0.25),
  },
  activeContainer: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surfaceContainerHigh,
  },
  name: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(0.75),
    color: colors.onSurface,
    textAlign: 'center',
    width: '100%',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(0.5),
  },
  score: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(1),
    color: colors.primary,
  },
  status: {
    fontSize: rem(0.875),
  },
  shieldBadge: {
    position: 'absolute',
    top: -rem(0.5),
    right: -rem(0.5),
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.full,
    width: rem(1.25),
    height: rem(1.25),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  shieldIcon: {
    fontSize: rem(0.625),
  },
});
