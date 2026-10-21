import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button,
  EduvosLogo,
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
  const [error, setError] = useState<{ method: 'password' | 'microsoft'; message: string } | null>(null);
  // Which button is spinning. `busy` alone would spin both.
  const [method, setMethod] = useState<'password' | 'microsoft' | null>(null);

  async function attempt(method: 'password' | 'microsoft') {
    setError(null);
    setMethod(method);
    try {
      if (method === 'password') {
        if (!email.trim() || !password) {
          setError({method, message:'Enter your email address and password.'});
          return;
        }
        await signIn(email, password);
      } else {
        await signInWithMicrosoft();
      }
    } catch (cause) {
      setError({method, message:cause instanceof Error ? cause.message : 'Sign-in failed.'});
    } finally {
      setMethod(null);
    }
  }

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: spacing.xxxl, gap: spacing.xs }}>
          <View style={{ marginBottom: spacing.lg }}><EduvosLogo /></View>
          <Text variant="display">IT SUPPORT</Text>
          <Text tone="muted">
            Sign in with your Eduvos student or staff Microsoft account.
          </Text>
        </View>

        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <MicrosoftButton
            loading={method === 'microsoft'}
            disabled={busy}
            onPress={() => void attempt('microsoft')}
          />
          {error?.method === 'microsoft' ? (
            <Text variant="caption" tone="danger">{error.message}</Text>
          ) : null}
          <Text variant="caption" tone="muted" center>
            Students: studentnumber@vossie.net · Staff: name@eduvos.com
          </Text>
        </View>

        <View style={[styles.separator, { marginVertical: spacing.xl, gap: spacing.md }]}>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          <Text variant="caption" tone="faint">OR</Text>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
        </View>

        <View style={{ gap: spacing.lg }}>
          <Text variant="caption" tone="muted">
            Already registered in IT SUPPORT? Use your app password below.
          </Text>
          <TextField
            label="Eduvos email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="studentnumber@vossie.net"
            editable={!busy}
          />

          <TextField
            label="IT SUPPORT password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            editable={!busy}
          />

          {error?.method === 'password' ? (
            <Text variant="caption" tone="danger">
              {error.message}
            </Text>
          ) : null}

          <Button
            title="Sign in"
            loading={method === 'password'}
            disabled={busy}
            onPress={() => void attempt('password')}
          />

          <TextLink
            label="Forgot your app password?"
            align="center"
            onPress={() => router.push('/(auth)/forgot-password')}
          />
        </View>

        <View style={[styles.footer, { marginTop: spacing.xxl, gap: spacing.xs }]}>
          <Text variant="caption" tone="muted">
            No account yet?
          </Text>
          <TextLink
            label="Register with Eduvos email"
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  separator: { flexDirection: 'row', alignItems: 'center' },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  footer: { alignItems: 'center' },
});
