import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../constants/theme';
import { PrimaryButton, TertiaryButton } from '../components/ui';

export default function ResultsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Results' }} />
      <Text style={styles.title}>Results</Text>
      <Text style={styles.description}>Round summary and cumulative scores</Text>

      <Link href="/(tabs)" asChild>
        <PrimaryButton label="Home" onPress={() => {}} />
      </Link>

      <Link href="/game" asChild>
        <TertiaryButton label="Play Again" onPress={() => {}} />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[16],
    gap: spacing[12],
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing[8],
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing[16],
  },
});
