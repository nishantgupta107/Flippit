import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { PrimaryButton, TertiaryButton } from '../../components/ui';

export default function SingleplayerScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Singleplayer' }} />
      <Text style={styles.title}>Singleplayer</Text>

      <Link href="/singleplayer/quickplay" asChild>
        <PrimaryButton label="Quick Play" onPress={() => {}} />
      </Link>

      <Link href="/singleplayer/dailydeck" asChild>
        <PrimaryButton label="Daily Deck" onPress={() => {}} />
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
