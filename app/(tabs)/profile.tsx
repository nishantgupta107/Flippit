import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { PrimaryButton, TertiaryButton } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { getDisplayName, isAuthenticated, signOut, continueAsGuest } = useAuth();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <Text style={styles.title}>Profile</Text>

      <View style={styles.profileSection}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{getDisplayName()}</Text>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>
          {isAuthenticated ? 'Authenticated' : 'Guest'}
        </Text>
      </View>

      {isAuthenticated ? (
        <PrimaryButton label="Sign Out" onPress={signOut} />
      ) : (
        <>
          <PrimaryButton
            label="Continue as Guest"
            onPress={() => continueAsGuest('Guest Player', 0)}
          />
          <View style={{ marginTop: spacing[8] }}>
            <Link href={"/auth" as any} asChild>
              <TertiaryButton label="Sign In / Register" onPress={() => {}} />
            </Link>
          </View>
        </>
      )}

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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[12],
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing[16],
  },
  profileSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  label: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  value: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
