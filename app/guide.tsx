import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../constants/theme';
import { TertiaryButton } from '../components/ui';

export default function GuideScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'How to Play' }} />
      <Text style={styles.title}>How to Play</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>The Goal</Text>
        <Text style={styles.text}>
          Be the first player to reach 200 points. Draw cards to build your score,
          but beware of duplicates that will bust your hand!
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Number Cards</Text>
        <Text style={styles.text}>
          Number cards (0-12) add to your score. Drawing a duplicate number
          causes you to bust and lose all points for the round.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modifier Cards</Text>
        <Text style={styles.text}>
          Multipliers (x2) multiply your total score. Bonus cards (+2, +4, +6, +8, +10)
          add directly to your score.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Action Cards</Text>
        <Text style={styles.text}>
          Second Chance protects you from one bust. Freeze banks your score
          and removes a player from the round. Flip Three deals 3 cards to
          another player.
        </Text>
      </View>

      <Link href="/(tabs)" asChild>
        <TertiaryButton label="Back" onPress={() => {}} />
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing[16],
    paddingBottom: spacing[32],
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing[16],
  },
  section: {
    marginBottom: spacing[16],
  },
  sectionTitle: {
    ...typography.titleLg,
    color: colors.primary,
    marginBottom: spacing[6],
  },
  text: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: spacing[12],
  },
});
