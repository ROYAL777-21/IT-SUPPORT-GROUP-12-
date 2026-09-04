import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';

import { Button, Card, Screen, Text, TextField, useToast } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { changePassword, providerOf } from '@/services/authService';
import { useTheme } from '@/theme';

export default function AccountSettingsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { spacing } = useTheme();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPasswordAccount = user ? providerOf(user) === 'password' : false;

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      showToast('Password updated');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Account Settings' }} />

      <View style={{ paddingTop: spacing.md, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="muted">
            SECURITY
          </Text>

          {isPasswordAccount ? (
            <View style={{ gap: spacing.md }}>
              <TextField
                label="Current password"
                value={current}
                onChangeText={setCurrent}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                editable={!saving}
              />
              <TextField
                label="New password"
                value={next}
                onChangeText={setNext}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                hint="At least 8 characters."
                editable={!saving}
              />

              {error ? (
                <Text variant="caption" tone="danger">
                  {error}
                </Text>
              ) : null}

              <Button
                title="Update Password"
                variant="secondary"
                loading={saving}
                disabled={!current || !next}
                onPress={() => void submit()}
              />
            </View>
          ) : (
            <Card>
              <Text tone="muted">
                You sign in with Microsoft, so your password is managed by Eduvos
                rather than by this app. Change it wherever you sign in to your
                student account.
              </Text>
            </Card>
          )}
        </View>

        {/*
          The design also shows push/email notification switches and a Face ID
          toggle. They are left out rather than drawn as dead controls: this
          build has no push registration and no biometric prompt behind them, so
          every one of those switches would be a lie about what the app does.
        */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="muted">
            NOTIFICATIONS
          </Text>
          <Card>
            <Text tone="muted">
              Replies from IT support appear in the app under Notifications.
              Push and email alerts are not part of this release.
            </Text>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
