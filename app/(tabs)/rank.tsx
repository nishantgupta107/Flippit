import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { TertiaryButton } from '../../components/ui';

export default function RankScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rank</Text>
      <Text style={styles.description}>Leaderboards and achievements</Text>

      <Link href="/leaderboard" asChild>
        <TertiaryButton label="Leaderboard" onPress={() => {}} />
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
