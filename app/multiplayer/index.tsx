import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { PrimaryButton, SecondaryButton, TertiaryButton } from '../../components/ui';

export default function MultiplayerScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Multiplayer' }} />
      <Text style={styles.title}>Multiplayer</Text>

      <Link href="/multiplayer/host" asChild>
        <PrimaryButton label="Host Room" onPress={() => {}} />
      </Link>

      <Link href="/multiplayer/join" asChild>
        <SecondaryButton label="Join Room" onPress={() => {}} />
      </Link>

      <Link href="/(tabs)" asChild>
        <TertiaryButton label="Back to Home" onPress={() => {}} />
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
    marginBottom: spacing[16],
  },
});
