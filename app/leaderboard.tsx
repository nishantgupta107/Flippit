import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../constants/theme';
import { TertiaryButton } from '../components/ui';

export default function LeaderboardScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Leaderboard' }} />
      <Text style={styles.title}>Leaderboard</Text>

      <View style={styles.tabs}>
        <Text style={[styles.tab, styles.activeTab]}>Daily</Text>
        <Text style={styles.tab}>All-Time</Text>
      </View>

      <Text style={styles.placeholder}>Leaderboard data will appear here</Text>

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
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing[16],
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing[16],
    marginBottom: spacing[16],
  },
  tab: {
    ...typography.titleSm,
    color: colors.onSurfaceVariant,
  },
  activeTab: {
    color: colors.primary,
  },
  placeholder: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing[32],
  },
});
