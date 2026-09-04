import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, Screen, Text, TextField, TextLink } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { INSTITUTIONAL_DOMAINS, isInstitutionalEmail } from '@/services/authService';
import { useTheme } from '@/theme';

const MIN_PASSWORD_LENGTH = 6;

export default function SignUpScreen() {
  const { register, busy } = useAuth();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Validation only appears after a submit attempt — flagging an empty field
  // the moment it is focused is hostile.
  const [submitted, setSubmitted] = useState(false);

  const nameError = !name.trim() ? 'Enter your full name.' : null;
  const emailError = !email.trim()
    ? 'Enter your email address.'
    : !isInstitutionalEmail(email)
      ? `Use your Eduvos address (${INSTITUTIONAL_DOMAINS.map((d) => `@${d}`).join(' or ')}).`
      : null;
  const passwordError =
    password.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : null;

  async function submit() {
    setSubmitted(true);
    setError(null);

    if (nameError || emailError || passwordError) {
      return;
    }

    try {
      await register(email, password, name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Registration failed.');
    }
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.xxl, gap: spacing.xs }}>
        <Text variant="title">Create your account</Text>
        <Text tone="muted">
          Registration is limited to Eduvos students and staff.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.lg }}>
        <TextField
          label="Full name"
          required
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          placeholder="Thandi Mokoena"
          error={submitted ? nameError : null}
          editable={!busy}
        />

        <TextField
          label="Email address"
          required
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@eduvos.ac.za"
          error={submitted ? emailError : null}
          editable={!busy}
        />

        <TextField
          label="Password"
          required
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          error={submitted ? passwordError : null}
          editable={!busy}
        />

        {error ? (
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            backgroundColor: colors.infoTint,
            padding: spacing.md,
            borderRadius: 10,
          }}
        >
          <Ionicons name="mail-outline" size={18} color={colors.info} />
          <Text variant="caption" style={{ flex: 1, color: colors.info }}>
            We will email you a link to verify your address. You can start
            logging tickets straight away.
          </Text>
        </View>

        <Button title="Create account" loading={busy} onPress={() => void submit()} />

        <TextLink
          label="Already registered? Sign in"
          align="center"
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </View>
    </Screen>
  );
}
