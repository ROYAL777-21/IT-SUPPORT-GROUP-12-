import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, Screen, Text, TextField, TextLink } from '@/components';
import { sendPasswordReset } from '@/services/authService';
import { useTheme } from '@/theme';

export default function ForgotPasswordScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) {
      setError('Enter the email address on your account.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send the email.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Screen scroll>
        <View style={{ paddingTop: spacing.xxxl, alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="mail-open-outline" size={48} color={colors.success} />
          <Text variant="title" center>
            Check your email
          </Text>
          <Text tone="muted" center>
            If an account exists for {email.trim()}, a password reset link is on
            its way. It expires in an hour.
          </Text>
          <Button
            title="Back to sign in"
            variant="secondary"
            onPress={() => router.replace('/(auth)/sign-in')}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.xxl, gap: spacing.xs }}>
        <Text variant="title">Reset your password</Text>
        <Text tone="muted">
          We will email you a link to set a new one.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.lg }}>
        <TextField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@eduvos.ac.za"
          error={error}
          editable={!sending}
        />

        <Button title="Send reset link" loading={sending} onPress={() => void submit()} />

        <TextLink label="Back to sign in" align="center" onPress={() => router.replace('/(auth)/sign-in')} />
      </View>
    </Screen>
  );
}
