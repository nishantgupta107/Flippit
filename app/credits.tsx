import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../constants/theme';
import { TertiaryButton } from '../components/ui';

export default function CreditsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Credits' }} />
      <Text style={styles.title}>Credits</Text>

      <Text style={styles.text}>Flippit - A digital adaptation of Flip 7</Text>
      <Text style={styles.text}>© 2026 Nishant G.</Text>

      <View style={styles.spacer} />

      <Text style={styles.subtitle}>Special Thanks</Text>
      <Text style={styles.text}>The Op Games for the original Flip 7</Text>

      <Link href="/(tabs)" asChild>
        <TertiaryButton label="Back" onPress={() => {}} />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing[16],
  },
  subtitle: {
    ...typography.titleMd,
    color: colors.primary,
    marginTop: spacing[16],
    marginBottom: spacing[8],
  },
  text: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  spacer: {
    height: spacing[20],
  },
});
