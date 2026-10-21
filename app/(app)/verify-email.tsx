import { useState } from 'react';
import { View } from 'react-native';
import { Button, Screen, Text } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { resendEmailVerification } from '@/services/authService';
import { useTheme } from '@/theme';

export default function VerifyEmailScreen() {
  const { user, refreshRole, signOut } = useAuth();
  const { spacing } = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setMessage('');
    try { await action(); if (success) setMessage(success); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <Screen scroll>
    <View style={{ paddingTop: spacing.xxxl, gap: spacing.lg }}>
      <Text variant="title">Verify your email</Text>
      <Text>Open the verification link sent to {user?.email}, then return here to continue.</Text>
      <Text tone="muted">Tickets are available after your institution email address is verified.</Text>
      <Button title="I have verified my email" loading={busy} onPress={() => void run(refreshRole, 'If you are still here, open the latest verification link and try again.')} />
      <Button title="Resend verification email" variant="secondary" disabled={busy} onPress={() => void run(resendEmailVerification, 'Verification email sent. Check your inbox and spam folder.')} />
      {message ? <Text accessibilityRole="alert">{message}</Text> : null}
      <Button title="Sign out" variant="ghost" disabled={busy} onPress={() => void run(signOut)} />
    </View>
  </Screen>;
}
