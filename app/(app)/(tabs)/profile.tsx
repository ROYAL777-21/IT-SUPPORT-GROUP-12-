import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  Button,
  Card,
  Divider,
  ListItem,
  Screen,
  SyncBanner,
  Text,
} from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { initialsOf, type AuthProviderId } from '@/models/user';
import { providerOf, resendEmailVerification } from '@/services/authService';
import { useTheme } from '@/theme';
import { relativeTime } from '@/utils/format';

const PROVIDER_LABELS: Record<AuthProviderId, string> = {
  password: 'Email and password',
  'microsoft.com': 'Microsoft account',
  unknown: 'Unknown',
};

export default function ProfileScreen() {
  const { user, profile, role, signOut } = useAuth();
  const { pending, syncing, online, lastResult, refresh } = useSync();
  const { colors, spacing } = useTheme();

  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const verified = user?.emailVerified ?? false;

  async function resendVerification() {
    setSending(true);
    setNotice(null);
    try {
      await resendEmailVerification();
      setNotice('Verification email sent. Check your inbox.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Could not send the email.');
    } finally {
      setSending(false);
    }
  }

  function confirmSignOut() {
    Alert.alert(
      'Sign out?',
      // Worth spelling out: sign-out wipes the local cache, so anything that
      // has not uploaded yet is genuinely gone, not just hidden.
      pending > 0
        ? `You have ${pending} ${pending === 1 ? 'change' : 'changes'} that have not uploaded yet. Signing out will discard them.`
        : 'Your tickets stay on the server. This device will clear its offline copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ],
    );
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.md, gap: spacing.lg }}>
        <View style={[styles.header, { gap: spacing.md }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryTint }]}>
            <Text variant="title" style={{ color: colors.primary }}>
              {initialsOf(profile?.displayName ?? '')}
            </Text>
          </View>

          <View style={styles.headerText}>
            <Text variant="heading">{profile?.displayName ?? 'Your profile'}</Text>
            <Text variant="caption" tone="muted">
              {profile?.email ?? user?.email ?? ''}
            </Text>
            {role === 'support' ? (
              <View style={[styles.row, { gap: spacing.xs, marginTop: spacing.xs }]}>
                <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                <Text variant="caption" style={{ color: colors.success }}>
                  IT Support
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <SyncBanner
          pending={pending}
          syncing={syncing}
          online={online}
          onRetry={() => void refresh()}
        />

        {user && !verified && providerOf(user) === 'password' ? (
          <Card>
            <View style={{ gap: spacing.sm }}>
              <View style={[styles.row, { gap: spacing.sm }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                <Text variant="bodyStrong" style={{ color: colors.warning }}>
                  Email not verified
                </Text>
              </View>
              <Text variant="caption" tone="muted">
                You can still log tickets. Verifying just confirms support is
                talking to the right person.
              </Text>
              <Button
                title="Resend verification email"
                variant="secondary"
                loading={sending}
                onPress={() => void resendVerification()}
              />
            </View>
          </Card>
        ) : null}

        {notice ? (
          <Text variant="caption" tone="muted">
            {notice}
          </Text>
        ) : null}

        <Card flush>
          <ListItem
            title="Student number"
            subtitle={profile?.studentNumber ?? 'Not set'}
            leading={<Ionicons name="card-outline" size={20} color={colors.textMuted} />}
          />
          <Divider inset={spacing.lg} />
          <ListItem
            title="Campus"
            subtitle={profile?.campus ?? 'Not set'}
            leading={<Ionicons name="business-outline" size={20} color={colors.textMuted} />}
          />
          <Divider inset={spacing.lg} />
          <ListItem
            title="Signed in with"
            subtitle={user ? PROVIDER_LABELS[providerOf(user)] : '—'}
            leading={<Ionicons name="key-outline" size={20} color={colors.textMuted} />}
          />
        </Card>

        <Card flush>
          <ListItem
            title="Sync"
            subtitle={
              syncing
                ? 'Syncing now…'
                : lastResult?.skipped === 'unconfigured'
                  ? 'Firebase is not configured on this build'
                  : pending > 0
                    ? `${pending} ${pending === 1 ? 'change' : 'changes'} waiting to upload`
                    : 'Everything is up to date'
            }
            leading={<Ionicons name="sync-outline" size={20} color={colors.textMuted} />}
            onPress={() => void refresh()}
          />
        </Card>

        <Button title="Sign out" variant="secondary" onPress={confirmSignOut} />

        <Text variant="caption" tone="faint" center>
          Campus IT Help · Group 12
          {profile?.updatedAt ? ` · profile updated ${relativeTime(profile.updatedAt)}` : ''}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
