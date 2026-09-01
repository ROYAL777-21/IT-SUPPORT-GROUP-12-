import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Screen, Select, Text, TextField } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { CAMPUSES, isPlausibleStudentNumber } from '@/models/user';
import { useTheme } from '@/theme';

const CAMPUS_OPTIONS = CAMPUSES.map((campus) => ({ value: campus, label: campus }));

/**
 * Collects the two facts Firebase cannot tell us: which campus the student is
 * at and their student number.
 *
 * Asking once here rather than on every ticket is the point. The (app) layout
 * guard means the ticket form can then assume both are present.
 */
export default function OnboardingScreen() {
  const { profile, saveProfile, role } = useAuth();
  const { spacing } = useTheme();

  const [name, setName] = useState(profile?.displayName ?? '');
  const [studentNumber, setStudentNumber] = useState(profile?.studentNumber ?? '');
  const [campus, setCampus] = useState<string | null>(profile?.campus ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupport = role === 'support';

  const nameError = !name.trim() ? 'Enter your full name.' : null;
  const studentNumberError = isSupport
    ? null
    : !studentNumber.trim()
      ? 'Enter your student number.'
      : !isPlausibleStudentNumber(studentNumber)
        ? 'That does not look like a student number.'
        : null;
  const campusError = isSupport ? null : !campus ? 'Choose your campus.' : null;

  async function submit() {
    setSubmitted(true);
    setError(null);

    if (nameError || studentNumberError || campusError) {
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        displayName: name,
        studentNumber: isSupport ? undefined : studentNumber,
        campus: isSupport ? undefined : (campus ?? undefined),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      scroll
      footer={
        <Button
          title="Continue"
          loading={saving}
          onPress={() => void submit()}
        />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: spacing.xxl, gap: spacing.xs }}>
          <Text variant="title">A few details</Text>
          <Text tone="muted">
            {isSupport
              ? 'Confirm how your name should appear to students on the tickets you pick up.'
              : 'We ask once, so you never have to type them on a ticket again.'}
          </Text>
        </View>

        <View style={{ marginTop: spacing.xl, gap: spacing.lg }}>
          <TextField
            label="Full name"
            required
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            error={submitted ? nameError : null}
            editable={!saving}
          />

          {!isSupport ? (
            <>
              <TextField
                label="Student number"
                required
                value={studentNumber}
                onChangeText={setStudentNumber}
                autoCapitalize="characters"
                autoCorrect={false}
                error={submitted ? studentNumberError : null}
                editable={!saving}
              />

              <Select
                label="Campus"
                required
                value={campus}
                options={CAMPUS_OPTIONS}
                onChange={setCampus}
                placeholder="Choose your campus"
                error={submitted ? campusError : null}
              />
            </>
          ) : null}

          {error ? (
            <Text variant="caption" tone="danger">
              {error}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
