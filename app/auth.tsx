import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, radius } from '../constants/theme';
import { PrimaryButton, SecondaryButton } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Auth Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isLogin ? 'Sign In' : 'Sign Up' }} />
      <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.onSurfaceVariant}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.onSurfaceVariant}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <View style={styles.buttonContainer}>
          <PrimaryButton 
            label={loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'} 
            onPress={handleAuth} 
          />
        </View>

        <SecondaryButton 
          label={isLogin ? 'Need an account? Sign Up' : 'Have an account? Sign In'} 
          onPress={() => setIsLogin(!isLogin)} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing[16],
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing[24],
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: spacing[16],
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    color: colors.onSurface,
    ...typography.bodyMd,
    padding: spacing[12],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  buttonContainer: {
    marginTop: spacing[8],
    marginBottom: spacing[16],
  },
});
