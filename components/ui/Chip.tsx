import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { rem } from '../../utils/scaling';
import { colors, radius } from '../../constants/theme';

type ChipVariant = 'multiplier' | 'action' | 'outline';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  style?: ViewStyle;
}

export function Chip({ label, variant = 'multiplier', style }: ChipProps) {
  let bg = colors.tertiary as string;
  let color = '#001f33'; // Deep contrast for the cyan
  let borderWidth = 0;
  let borderColor = 'transparent';

  if (variant === 'action') {
    bg = colors.secondary;
    color = '#fff';
  } else if (variant === 'outline') {
    bg = 'transparent';
    color = colors.onSurfaceVariant;
    borderWidth = 1;
    borderColor = colors.outlineVariant;
  }

  return (
    <View style={[styles.container, { backgroundColor: bg, borderWidth, borderColor }, style]}>
      <Text style={[
        styles.text,
        {
          color,
          fontFamily: variant === 'multiplier' ? 'NotoSerif-Bold' : 'PlusJakartaSans-SemiBold',
        }
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.full,
    paddingVertical: rem(0.25),
    paddingHorizontal: rem(0.75),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: rem(0.875),
  },
});