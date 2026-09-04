import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Button,
  PRIORITY_LABELS,
  Screen,
  Select,
  Text,
  TextField,
  useToast,
} from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import {
  CATEGORY_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
} from '@/models/ticket';
import { createTicket } from '@/services/ticketRepository';
import { useTheme } from '@/theme';

const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((category) => ({
  value: category,
  label: CATEGORY_LABELS[category],
}));

/** Explaining what each level means stops everything arriving marked High. */
const PRIORITY_DESCRIPTIONS: Record<TicketPriority, string> = {
  low: 'Annoying, but you can work around it.',
  medium: 'Slowing you down.',
  high: 'You cannot do coursework until it is fixed.',
};

const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
  description: PRIORITY_DESCRIPTIONS[priority],
}));

export default function NewTicketScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { notifyLocalWrite, online } = useSync();
  const { showToast } = useToast();
  const { colors, radius, spacing } = useTheme();

  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryError = !category ? 'Choose what this is about.' : null;
  const subjectError = !subject.trim()
    ? 'Give it a short title.'
    : subject.trim().length < 5
      ? 'A few more words would help support find it.'
      : null;
  const descriptionError = !description.trim()
    ? 'Describe what is happening.'
    : null;

  function reset() {
    setCategory(null);
    setPriority('medium');
    setSubject('');
    setDescription('');
    setLocation('');
    setSubmitted(false);
  }

  async function submit() {
    setSubmitted(true);
    setError(null);

    if (categoryError || subjectError || descriptionError || !category) {
      return;
    }
    if (!user || !profile) {
      setError('You are not signed in.');
      return;
    }

    setSaving(true);
    try {
      // Writes to SQLite and returns. Nothing here waits on the network — that
      // is the whole point of the offline-first design, and it is exactly the
      // case a "the Wi-Fi is down" ticket has to survive.
      const ticket = await createTicket(
        {
          studentNumber: profile.studentNumber ?? '',
          campus: profile.campus ?? '',
          category,
          priority,
          subject: subject.trim(),
          description: description.trim(),
          location: location.trim() || undefined,
        },
        user.uid,
      );

      reset();
      notifyLocalWrite();
      showToast('Ticket logged — IT has been notified');
      // replace, not push: this screen was the way in, and going "back" from
      // the ticket should land on the list, not on an empty form.
      router.replace(`/(app)/ticket/${ticket.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the ticket.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      scroll
      // Pushed route, not a tab — nothing below it absorbs the navigation-bar
      // inset, so the footer button needs 'bottom' itself.
      edges={['left', 'right', 'bottom']}
      footer={<Button title="Submit Ticket" loading={saving} onPress={() => void submit()} />}
    >
      <Stack.Screen options={{ title: 'New Ticket' }} />

      <View style={{ paddingTop: spacing.md, gap: spacing.lg }}>
        {!online ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              backgroundColor: colors.warningTint,
              padding: spacing.md,
              borderRadius: radius.sm,
            }}
          >
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <Text variant="caption" style={{ flex: 1, color: colors.warning }}>
              You are offline. Log it anyway — it saves on your phone and
              uploads by itself once you have signal.
            </Text>
          </View>
        ) : null}

        <Select
          label="What is this about?"
          required
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={setCategory}
          error={submitted ? categoryError : null}
        />

        <Select
          label="How urgent is it?"
          required
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={setPriority}
        />

        <TextField
          label="Title"
          required
          value={subject}
          onChangeText={setSubject}
          placeholder="Cannot connect to campus Wi-Fi in Lab 3"
          maxLength={100}
          error={submitted ? subjectError : null}
          editable={!saving}
        />

        <TextField
          label="What happened?"
          required
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="What you were doing, what you expected, and what happened instead. Include any error message."
          error={submitted ? descriptionError : null}
          editable={!saving}
        />

        <TextField
          label="Where on campus?"
          value={location}
          onChangeText={setLocation}
          placeholder="Lab 3, Library, Residence block B…"
          hint="Optional, but it gets someone to you faster."
          editable={!saving}
        />

        <Text variant="caption" tone="faint">
          Logged as {profile?.displayName}
          {profile?.studentNumber ? ` · ${profile.studentNumber}` : ''}
          {profile?.campus ? ` · ${profile.campus}` : ''}
        </Text>
      </View>
    </Screen>
  );
}
