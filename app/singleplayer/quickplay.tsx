import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { PrimaryButton, TertiaryButton } from '../../components/ui';

export default function QuickPlayScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Quick Play' }} />
      <Text style={styles.title}>Quick Play</Text>
      <Text style={styles.description}>Bot count and difficulty selection</Text>

      <Link href="/game" asChild>
        <PrimaryButton label="Start Game" onPress={() => {}} />
      </Link>

      <Link href="/singleplayer" asChild>
        <TertiaryButton label="Back" onPress={() => {}} />
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
