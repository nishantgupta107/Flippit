import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../constants/theme';
import { TertiaryButton } from '../components/ui';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Text style={styles.title}>Settings</Text>

      <View style={styles.setting}>
        <Text style={styles.settingLabel}>Sound</Text>
        <Text style={styles.settingValue}>On</Text>
      </View>

      <View style={styles.setting}>
        <Text style={styles.settingLabel}>Haptics</Text>
        <Text style={styles.settingValue}>On</Text>
      </View>

      <View style={styles.setting}>
        <Text style={styles.settingLabel}>Display Name</Text>
        <Text style={styles.settingValue}>Player</Text>
      </View>

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
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  settingLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  settingValue: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
