import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { TertiaryButton } from '../../components/ui';

export default function GamesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Games</Text>
      <Text style={styles.description}>Game history and ongoing matches</Text>

      <Link href="/singleplayer/quickplay" asChild>
        <TertiaryButton label="Quick Play" onPress={() => {}} />
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
