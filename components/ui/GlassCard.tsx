import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { rem } from '../../utils/scaling';
import { colors, radius } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

/**
 * Glass morphism card component
 * Surface variant at 60% opacity with blur effect
 * Use for: HUDs, overlays, modal backgrounds
 * @see DEV_PLAN.md §7.3, §4e
 */
export function GlassCard({ children, style, intensity }: GlassCardProps) {
  const blurIntensity = intensity ?? rem(1.25);

  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={blurIntensity}
        style={StyleSheet.absoluteFill}
        tint="dark"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${colors.surfaceVariant}99`, // 60% opacity
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  content: {
    padding: rem(4),
  },
});
