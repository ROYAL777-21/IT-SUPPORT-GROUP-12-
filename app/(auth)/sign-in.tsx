import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  BrandMark,
  Button,
  Card,
  MicrosoftButton,
  Screen,
  SegmentedControl,
  Text,
  TextField,
  TextLink,
} from '@/components';
import { isFirebaseConfigured } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme';

/**
 * Which kind of account you are signing in with.
 *
 * This is a label hint and nothing more. Support access comes from the
 * `support` custom claim on the account, which `firestore.rules` enforces and
 * which the app has no way to grant itself — so picking "IT Staff" here cannot
 * and must not make you an agent. The design uses it the same way: in its own
 * logic it drives `loginIdLabel` and nothing else.
 */
type Audience = 'student' | 'staff';

const AUDIENCES = [
  { value: 'student' as const, label: 'Student' },
  { value: 'staff' as const, label: 'IT Staff' },
];

export default function SignInScreen() {
  const { signIn, signInWithMicrosoft, busy } = useAuth();
  const { spacing } = useTheme();
  const router = useRouter();

  const [stage, setStage] = useState<'welcome' | 'credentials'>('welcome');
  const [audience, setAudience] = useState<Audience>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Which button is spinning. `busy` alone would spin both.
  const [method, setMethod] = useState<'password' | 'microsoft' | null>(null);

  async function attempt(next: 'password' | 'microsoft') {
    setError(null);
    setMethod(next);
    try {
      if (next === 'password') {
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

  const unconfigured = !isFirebaseConfigured ? (
    // Said up front rather than after a failed tap: a build without
    // google-services.json has no account server, and the error you would
    // otherwise get — after typing a password — reads like a wrong password.
    <Card>
      <Text variant="bodyStrong" tone="warning">
        This build cannot sign in
      </Text>
      <Text variant="caption" tone="muted">
        It was built without the Firebase configuration, so there is no account
        server to talk to. Install a build without “PLACEHOLDER” in its
        filename — docs/INSTALL.md explains where it comes from.
      </Text>
    </Card>
  ) : null;

  if (stage === 'welcome') {
    return (
      <Screen scroll contentContainerStyle={styles.fill}>
        <View style={[styles.hero, { gap: spacing.lg }]}>
          <BrandMark size={88} />
          <View style={{ gap: spacing.sm }}>
            <Text variant="display" center>
              EDUVOS IT SUPPORT
            </Text>
            <Text tone="muted" center style={styles.tagline}>
              Get help with Wi-Fi, the student portal, labs and software — all in
              one place.
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.md, paddingBottom: spacing.xl }}>
          {unconfigured}

          <MicrosoftButton
            loading={method === 'microsoft'}
            disabled={busy}
            onPress={() => void attempt('microsoft')}
          />

          <View style={[styles.separator, { gap: spacing.md }]}>
            <Rule />
            <Text variant="caption" tone="faint">
              or
            </Text>
            <Rule />
          </View>

          <Button
            title="Continue with your Eduvos email"
            variant="secondary"
            disabled={busy}
            onPress={() => setStage('credentials')}
          />

          {error ? (
            <Text variant="caption" tone="danger" center>
              {error}
            </Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.xl, gap: spacing.xl }}>
        <TextLink label="‹  Back" onPress={() => setStage('welcome')} />

        <View style={{ gap: spacing.xs }}>
          <Text variant="title" center>
            Sign In
          </Text>
          <Text variant="overline" tone="muted" center>
            EDUVOS IT SUPPORT
          </Text>
        </View>

        {unconfigured}

        <SegmentedControl
          label="Account type"
          options={AUDIENCES}
          value={audience}
          onChange={setAudience}
          disabled={busy}
        />

        <View style={{ gap: spacing.lg }}>
          <TextField
            label={audience === 'student' ? 'Student email' : 'Staff email'}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={
              audience === 'student' ? 'you@eduvos.com' : 'you@eduvos.ac.za'
            }
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
            title="Continue"
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

        <View style={[styles.footer, { gap: spacing.xs }]}>
          <Text variant="caption" tone="muted">
            No account yet?
          </Text>
          <TextLink
            label="Register with your student email"
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </View>
      </View>
    </Screen>
  );
}

/** Half of the "or" separator. Flexes, unlike the shared full-width Divider. */
function Rule() {
  const { colors } = useTheme();
  return <View style={[styles.rule, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  fill: { flexGrow: 1, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  tagline: { maxWidth: 280 },
  separator: { flexDirection: 'row', alignItems: 'center' },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
