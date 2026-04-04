import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { PrimaryButton, TertiaryButton } from '../../components/ui';

export default function JoinRoomScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Join Room' }} />
      <Text style={styles.title}>Join Room</Text>
      <Text style={styles.description}>Scan QR or enter room code</Text>

      <Link href="/multiplayer/lobby" asChild>
        <PrimaryButton label="Join" onPress={() => {}} />
      </Link>

      <Link href="/multiplayer" asChild>
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
