import { TouchableOpacity, Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { rem } from '../../utils/scaling';
import { colors, typography } from '../../constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Primary CTA button - pill shape with gold gradient
 * Use for: HIT action, primary actions
 * @see DEV_PLAN.md §7.3, §4a
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon,
  style,
  textStyle,
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryContainer]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, disabled && styles.disabled]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999, // Pill shape
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: rem(3.5),
    paddingHorizontal: rem(2),
  },
  iconContainer: {
    marginRight: rem(0.75),
  },
  text: {
    ...typography.titleSm,
    color: colors.onPrimaryFixed,
    fontSize: rem(1), // Slightly larger for CTAs
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});
