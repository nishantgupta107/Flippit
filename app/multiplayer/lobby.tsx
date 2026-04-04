import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { PrimaryButton, SecondaryButton, TertiaryButton } from '../../components/ui';

export default function LobbyScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Lobby' }} />
      <Text style={styles.title}>Lobby</Text>
      <Text style={styles.description}>Waiting room with player list</Text>

      <Link href="/game" asChild>
        <PrimaryButton label="Start Game" onPress={() => {}} />
      </Link>

      <Link href="/multiplayer" asChild>
        <SecondaryButton label="Leave Room" onPress={() => {}} />
      </Link>

      <Link href="/(tabs)" asChild>
        <TertiaryButton label="Home" onPress={() => {}} />
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
