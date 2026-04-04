import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { rem } from '../../utils/scaling';
import { colors, radius } from '../../constants/theme';

interface ChipProps {
  label: string;
  style?: ViewStyle;
}

/**
 * Circular chip - used for multiplier display (e.g., "x2")
 * Cyan background with NotoSerif-Bold text
 * @see DEV_PLAN.md §7.3, §4d
 */
export function Chip({ label, style }: ChipProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: rem(3.5),
    height: rem(3.5),
    borderRadius: radius.full,
    backgroundColor: colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: rem(0.875),
    color: colors.onTertiary,
    lineHeight: rem(1.25),
  },
});
