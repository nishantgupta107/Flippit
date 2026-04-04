import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { vw } from '../../utils/scaling';
import { colors, typography, spacing } from '../../constants/theme';
import { PrimaryButton, SecondaryButton, TertiaryButton } from '../../components/ui';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Flippit</Text>
      <Text style={styles.subtitle}>Press Your Luck</Text>

      <View style={styles.buttonGroup}>
        <Link href="/singleplayer" asChild>
          <PrimaryButton label="Singleplayer" onPress={() => {}} />
        </Link>

        <Link href="/multiplayer" asChild>
          <SecondaryButton label="Multiplayer" onPress={() => {}} />
        </Link>

        <Link href="/guide" asChild>
          <TertiaryButton label="How to Play" onPress={() => {}} />
        </Link>

        <Link href="/settings" asChild>
          <TertiaryButton label="Settings" onPress={() => {}} />
        </Link>

        <Link href="/profile" asChild>
          <TertiaryButton label="Profile" onPress={() => {}} />
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    padding: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.displayLg,
    color: colors.primary,
    marginBottom: spacing[4],
  },
  subtitle: {
    ...typography.headlineSm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing[20],
  },
  buttonGroup: {
    width: vw(80),
    gap: spacing[12],
  },
});
