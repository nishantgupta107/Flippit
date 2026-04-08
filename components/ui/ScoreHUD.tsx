import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { colors, radius } from '../../constants/theme';
import { rem } from '../../utils/scaling';

interface ScoreHUDProps {
  score: number;
  delta?: number;
  label?: string;
  style?: ViewStyle;
}

export function ScoreHUD({ score, delta, label = 'Total', style }: ScoreHUDProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.inner}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>{score}</Text>
          {delta !== undefined && delta !== 0 && (
            <Animated.Text
              entering={FadeInUp}
              exiting={FadeOutDown}
              style={[styles.deltaText, { color: delta > 0 ? colors.primary : colors.error }]}
            >
              {delta > 0 ? '+' : ''}{delta}
            </Animated.Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.xl,
    paddingVertical: rem(0.75),
    paddingHorizontal: rem(1.5),
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignSelf: 'flex-start',
  },
  inner: {
    flexDirection: 'column',
  },
  label: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(0.6875),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: rem(0.5),
  },
  scoreText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(1.5),
    color: colors.primary,
    lineHeight: rem(1.5),
  },
  deltaText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: rem(0.875),
  },
});