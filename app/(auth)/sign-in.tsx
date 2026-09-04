import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button,
  MicrosoftButton,
  Screen,
  Text,
  TextField,
  TextLink,
} from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme';

export default function SignInScreen() {
  const { signIn, signInWithMicrosoft, busy } = useAuth();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Which button is spinning. `busy` alone would spin both.
  const [method, setMethod] = useState<'password' | 'microsoft' | null>(null);

  async function attempt(method: 'password' | 'microsoft') {
    setError(null);
    setMethod(method);
    try {
      if (method === 'password') {
        if (!email.trim() || !password) {
          setError('Enter your email address and password.');
          return;
        }
        await signIn(email, password);
      } else {
        await signInWithMicrosoft();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setMethod(null);
    }
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.xxxl, gap: spacing.xs }}>
        <Text variant="display">Campus IT Help</Text>
        <Text tone="muted">
          Log a support ticket and track it, on or off campus Wi-Fi.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xxl, gap: spacing.lg }}>
        <TextField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@eduvos.ac.za"
          editable={!busy}
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          editable={!busy}
        />

        {error ? (
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        ) : null}

        <Button
          title="Sign in"
          loading={method === 'password'}
          disabled={busy}
          onPress={() => void attempt('password')}
        />

        <TextLink
          label="Forgot your password?"
          align="center"
          onPress={() => router.push('/(auth)/forgot-password')}
        />
      </View>

      <View style={[styles.separator, { marginVertical: spacing.xl, gap: spacing.md }]}>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
        <Text variant="caption" tone="faint">
          OR
        </Text>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
      </View>

      <MicrosoftButton
        loading={method === 'microsoft'}
        disabled={busy}
        onPress={() => void attempt('microsoft')}
      />

      <View style={[styles.footer, { marginTop: spacing.xxl, gap: spacing.xs }]}>
        <Text variant="caption" tone="muted">
          No account yet?
        </Text>
        <TextLink
          label="Register with your student email"
          onPress={() => router.push('/(auth)/sign-up')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  separator: { flexDirection: 'row', alignItems: 'center' },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
