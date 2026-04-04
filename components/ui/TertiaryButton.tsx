import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { rem } from '../../utils/scaling';
import { colors, typography } from '../../constants/theme';

interface TertiaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Tertiary button - ghost style, no background
 * Use for: subtle actions, navigation, back buttons
 * @see DEV_PLAN.md §7.3, §4c
 */
export function TertiaryButton({
  label,
  onPress,
  disabled = false,
  style,
  textStyle,
}: TertiaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
      style={[styles.container, disabled && styles.disabled, style]}
    >
      <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: rem(0.75),
    paddingHorizontal: rem(1),
    backgroundColor: 'transparent',
  },
  text: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  disabled: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.6,
  },
});
