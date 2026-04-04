import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { PrimaryButton, SecondaryButton, TertiaryButton } from '../../components/ui';

export default function GameScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Game', headerShown: false }} />
      <Text style={styles.title}>Game Screen</Text>
      <Text style={styles.description}>Card game in progress (shared for single + multi)</Text>

      <View style={styles.buttonGroup}>
        <PrimaryButton label="HIT" onPress={() => {}} />
        <SecondaryButton label="STAY" onPress={() => {}} />
      </View>

      <Link href="/results" asChild>
        <TertiaryButton label="End Game (Dev)" onPress={() => {}} />
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
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing[12],
  },
});
