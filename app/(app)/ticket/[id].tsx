import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Button,
  Card,
  ChatBubble,
  PriorityTag,
  Screen,
  SegmentedControl,
  StatusTag,
  Tag,
  Text,
  TextField,
  useToast,
} from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useComments, useTicket } from '@/hooks/useTickets';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  TICKET_STATUSES,
  allowedTransitions,
} from '@/models/ticket';
import {
  addComment,
  assignTicket,
  updateTicketStatus,
} from '@/services/ticketRepository';
import { useTheme } from '@/theme';
import { fullTimestamp, relativeTime } from '@/utils/format';

const STATUS_SEGMENTS = TICKET_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, role } = useAuth();
  const { notifyLocalWrite } = useSync();
  const { showToast } = useToast();
  const { colors, radius, spacing } = useTheme();

  const { data: ticket, loading } = useTicket(id);
  const { data: comments } = useComments(id);

  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupport = role === 'support';
  const mine = ticket?.assignedTo === user?.uid;

  if (loading) {
    return (
      <Screen>
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (!ticket) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Ticket' }} />
        <Text variant="heading">Ticket not found</Text>
        <Text tone="muted">
          It may have been deleted, or it belongs to someone else.
        </Text>
      </Screen>
    );
  }

  const transitions = allowedTransitions(ticket.status, isSupport ? 'support' : 'student');

  async function act<T>(action: () => Promise<T>, confirmation?: string) {
    setError(null);
    setWorking(true);
    try {
      await action();
      notifyLocalWrite();
      if (confirmation) showToast(confirmation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work.');
    } finally {
      setWorking(false);
    }
  }

  async function postReply() {
    if (!reply.trim() || !user || !profile || !ticket) {
      return;
    }
    setPosting(true);
    setError(null);
    try {
      await addComment(ticket.id, reply.trim(), {
        id: user.uid,
        name: profile.displayName,
        fromSupport: isSupport,
      });
      setReply('');
      notifyLocalWrite();
      showToast('Message sent');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not post your message.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <Screen
      padded={false}
      // No 'top' — the Stack header already covers it. 'bottom' because this
      // screen is outside the tab navigator, so nothing below it absorbs the
      // navigation-bar inset and the Send button would sit behind the gesture
      // bar.
      edges={['left', 'right', 'bottom']}
      footer={
        // No KeyboardAvoidingView here: Screen wraps the footer in one.
        // The design puts the composer on one line with a send icon beside it,
        // which is what makes a ticket read as a conversation rather than a
        // form you submit to.
        <View style={[styles.composer, { gap: spacing.sm }]}>
          <View style={styles.grow}>
            <TextField
              label={isSupport ? 'Reply to the student' : 'Add a message'}
              value={reply}
              onChangeText={setReply}
              multiline
              placeholder="Type a message"
              editable={!posting}
              containerStyle={styles.replyField}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !reply.trim() || posting }}
            disabled={!reply.trim() || posting}
            onPress={() => void postReply()}
            style={({ pressed }) => [
              styles.send,
              {
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                borderRadius: radius.button,
                opacity: !reply.trim() || posting ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="send" size={17} color={colors.onPrimary} />
          </Pressable>
        </View>
      }
    >
      <Stack.Screen options={{ title: ticket.reference }} />

      <FlatList
        data={comments}
        keyExtractor={(comment) => comment.id}
        // With the reply keyboard up, a tap first dismisses it and is otherwise
        // swallowed — "handled" lets the assign/status controls in the header
        // fire on that same first tap instead of needing a second one.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Text variant="subheading">{ticket.subject}</Text>

                <View style={[styles.tagRow, { gap: spacing.xs }]}>
                  <Tag label={CATEGORY_LABELS[ticket.category]} />
                  <PriorityTag priority={ticket.priority} />
                  <StatusTag status={ticket.status} />
                </View>

                <Text tone="muted">{ticket.description}</Text>

                <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                  {ticket.location ? <Detail label="Where" value={ticket.location} /> : null}
                  <Detail label="Campus" value={ticket.campus || '—'} />
                  {isSupport ? (
                    <Detail label="Student number" value={ticket.studentNumber || '—'} />
                  ) : null}
                  <Detail label="Logged" value={fullTimestamp(ticket.createdAt)} />
                  <Detail label="Assigned to" value={ticket.assignedToName ?? 'Nobody yet'} />
                </View>
              </View>
            </Card>

            {isSupport && user && profile ? (
              <View style={{ gap: spacing.md }}>
                {/*
                  The design sets status with a segmented control rather than a
                  picker — three states, always visible, one tap to change. The
                  assign button is ours: the design has no queue to assign from,
                  but a shared queue is unworkable without it.
                */}
                <SegmentedControl
                  label="Set ticket status"
                  options={STATUS_SEGMENTS}
                  value={ticket.status}
                  disabled={working}
                  onChange={(status) =>
                    void act(
                      () => updateTicketStatus(ticket.id, status),
                      `Status set to ${STATUS_LABELS[status]}`,
                    )
                  }
                />

                <Button
                  title={mine ? 'Hand this back' : 'Assign to me'}
                  variant="secondary"
                  loading={working}
                  onPress={() =>
                    void act(
                      () =>
                        assignTicket(
                          ticket.id,
                          mine ? null : { id: user.uid, name: profile.displayName },
                        ),
                      mine ? 'Handed back to the queue' : 'Assigned to you',
                    )
                  }
                />
              </View>
            ) : transitions.length > 0 ? (
              <Card>
                <View style={{ gap: spacing.md }}>
                  <Text variant="bodyStrong">Is this still happening?</Text>
                  <Button
                    title="Reopen this ticket"
                    variant="secondary"
                    loading={working}
                    onPress={() =>
                      void act(
                        () => updateTicketStatus(ticket.id, 'open'),
                        'Ticket reopened',
                      )
                    }
                  />
                </View>
              </Card>
            ) : null}

            {error ? (
              <Text variant="caption" tone="danger">
                {error}
              </Text>
            ) : null}

            <Text variant="overline" tone="muted">
              CONVERSATION
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text variant="caption" tone="faint">
            No messages yet.
            {isSupport ? '' : ' Support will reply here.'}
          </Text>
        }
        renderItem={({ item }) => (
          <ChatBubble
            body={item.body}
            author={
              item.authorId === user?.uid
                ? 'You'
                : item.fromSupport
                  ? `${item.authorName} · IT Support`
                  : item.authorName
            }
            timestamp={relativeTime(item.createdAt)}
            mine={item.authorId === user?.uid}
          />
        )}
      />
    </Screen>
  );
}

/**
 * At module scope on purpose. A component defined inside another component is a
 * *new* component type on every render, so React unmounts and remounts the
 * whole subtree each time the parent updates — which for a comment list means
 * losing scroll position on every sync tick.
 */
function Detail({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      <Text variant="caption" tone="muted" style={styles.detailLabel}>
        {label}
      </Text>
      <Text variant="caption" style={styles.grow}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap' },
  grow: { flex: 1 },
  detailLabel: { width: 110 },
  replyField: { flex: 0 },
  composer: { flexDirection: 'row', alignItems: 'flex-end' },
  send: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
});
