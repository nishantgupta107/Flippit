import { TouchableOpacity, Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { rem } from '../../utils/scaling';
import { colors, typography, radius } from '../../constants/theme';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Secondary CTA button - flat coral background with rounded corners
 * Use for: STAY action, secondary actions
 * @see DEV_PLAN.md §7.3, §4b
 */
export function SecondaryButton({
  label,
  onPress,
  disabled = false,
  icon,
  style,
  textStyle,
}: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.container, disabled && styles.disabled, style]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    height: rem(3.5),
    paddingHorizontal: rem(2),
  },
  iconContainer: {
    marginRight: rem(0.75),
  },
  text: {
    ...typography.titleSm,
    color: colors.onPrimaryFixed,
    fontSize: rem(1),
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});
