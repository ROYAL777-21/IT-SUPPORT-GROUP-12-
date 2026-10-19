import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Screen, Select, Text, TextField, PRIORITY_LABELS } from '@/components';
import { useTicket } from '@/hooks/useTickets';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORY_LABELS, TICKET_CATEGORIES, TICKET_PRIORITIES, type Ticket } from '@/models/ticket';
import { updateTicketDetails } from '@/services/ticketRepository';
import { useTheme } from '@/theme';

export default function EditTicketScreen() {
  const { id } = useLocalSearchParams<{id: string}>();
  const { user } = useAuth();
  const { data, loading, error } = useTicket(id);
  if (loading) return <Screen><Text>Loading ticket…</Text></Screen>;
  if (!data || data.createdBy !== user?.uid) return <Screen><Text>{error ?? 'This ticket cannot be edited by your account.'}</Text></Screen>;
  return <TicketForm key={data.id} ticket={data} />;
}

function TicketForm({ticket}: {ticket: Ticket}) {
  const [subject, setSubject] = useState(ticket.subject);
  const [description, setDescription] = useState(ticket.description);
  const [location, setLocation] = useState(ticket.location ?? '');
  const [category, setCategory] = useState(ticket.category);
  const [priority, setPriority] = useState(ticket.priority);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { notifyLocalWrite } = useSync();
  const { spacing } = useTheme();
  const router = useRouter();
  async function save() {
    if (saving) return;
    setSaving(true); setError('');
    try {
      await updateTicketDetails(ticket.id, {...ticket, subject, description, location, category, priority});
      notifyLocalWrite(); router.back();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save ticket.'); }
    finally { setSaving(false); }
  }
  return <Screen scroll footer={<Button title="Save changes" loading={saving} onPress={() => void save()} />}>
    <View style={{gap:spacing.lg}}>
      <Text variant="heading">{ticket.reference}</Text>
      <TextField label="Title" value={subject} onChangeText={setSubject} required maxLength={100} editable={!saving} />
      <TextField label="Description" value={description} onChangeText={setDescription} required multiline maxLength={5000} editable={!saving} />
      <Select label="Category" value={category} onChange={setCategory}
        options={TICKET_CATEGORIES.map((value) => ({value, label:CATEGORY_LABELS[value]}))} />
      <Select label="Priority" value={priority} onChange={setPriority}
        options={TICKET_PRIORITIES.map((value) => ({value, label:PRIORITY_LABELS[value]}))} />
      <TextField label="Location" value={location} onChangeText={setLocation} maxLength={200} editable={!saving} />
      {error ? <Text tone="danger" accessibilityRole="alert">{error}</Text> : null}
    </View>
  </Screen>;
}
