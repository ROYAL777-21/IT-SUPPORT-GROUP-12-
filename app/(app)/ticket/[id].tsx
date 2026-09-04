import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Button,
  Card,
  PriorityDot,
  Screen,
  Select,
  StatusBadge,
  Text,
  TextField,
} from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useComments, useTicket } from '@/hooks/useTickets';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  allowedTransitions,
  type TicketComment,
  type TicketStatus,
} from '@/models/ticket';
import { initialsOf } from '@/models/user';
import {
  addComment,
  assignTicket,
  updateTicketStatus,
} from '@/services/ticketRepository';
import { useTheme } from '@/theme';
import { fullTimestamp, relativeTime } from '@/utils/format';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, role } = useAuth();
  const { notifyLocalWrite } = useSync();
  const { colors, spacing } = useTheme();

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

  async function act<T>(action: () => Promise<T>) {
    setError(null);
    setWorking(true);
    try {
      await action();
      notifyLocalWrite();
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
        // No KeyboardAvoidingView here: Screen wraps the footer in one. This
        // composer is the reason that had to move — a footer nested inside the
        // old per-screen KAV sat *below* it, so on Android the keyboard covered
        // the reply box and the Send button outright.
        <View style={{ gap: spacing.sm }}>
          <TextField
            label={isSupport ? 'Reply to the student' : 'Add a message'}
            value={reply}
            onChangeText={setReply}
            multiline
            placeholder={
              isSupport
                ? 'What you found, what you did, or what you need from them.'
                : 'Anything else that might help support.'
            }
            editable={!posting}
            containerStyle={styles.replyField}
          />
          <Button
            title="Send"
            loading={posting}
            disabled={!reply.trim()}
            onPress={() => void postReply()}
          />
        </View>
      }
    >
      <Stack.Screen options={{ title: ticket.reference }} />

      <FlatList
        data={comments}
        keyExtractor={(comment) => comment.id}
        // With the reply keyboard up, a tap first dismisses it and is otherwise
        // swallowed — "handled" lets the assign/status buttons in the header
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
                <View style={[styles.row, { gap: spacing.sm }]}>
                  <StatusBadge status={ticket.status} />
                  <View style={styles.spacer} />
                  <PriorityDot priority={ticket.priority} showLabel />
                </View>

                <Text variant="heading">{ticket.subject}</Text>
                <Text>{ticket.description}</Text>

                <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                  <Detail label="Category" value={CATEGORY_LABELS[ticket.category]} />
                  {ticket.location ? <Detail label="Where" value={ticket.location} /> : null}
                  <Detail label="Campus" value={ticket.campus || '—'} />
                  {isSupport ? (
                    <Detail label="Student number" value={ticket.studentNumber || '—'} />
                  ) : null}
                  <Detail label="Logged" value={fullTimestamp(ticket.createdAt)} />
                  <Detail
                    label="Assigned to"
                    value={ticket.assignedToName ?? 'Nobody yet'}
                  />
                </View>
              </View>
            </Card>

            {isSupport && user && profile ? (
              <Card>
                <View style={{ gap: spacing.md }}>
                  <Text variant="overline" tone="muted">
                    SUPPORT ACTIONS
                  </Text>

                  <Button
                    title={mine ? 'Hand this back' : 'Assign to me'}
                    variant="secondary"
                    loading={working}
                    onPress={() =>
                      void act(() =>
                        assignTicket(
                          ticket.id,
                          mine ? null : { id: user.uid, name: profile.displayName },
                        ),
                      )
                    }
                  />

                  <Select
                    label="Change status"
                    value={ticket.status}
                    options={transitions.map((status) => ({
                      value: status,
                      label: STATUS_LABELS[status],
                    }))}
                    onChange={(status) =>
                      void act(() => updateTicketStatus(ticket.id, status as TicketStatus))
                    }
                  />
                </View>
              </Card>
            ) : transitions.length > 0 ? (
              <Card>
                <View style={{ gap: spacing.md }}>
                  <Text variant="bodyStrong">
                    {ticket.status === 'resolved'
                      ? 'Did that fix it?'
                      : 'Is this happening again?'}
                  </Text>
                  <View style={[styles.row, { gap: spacing.sm }]}>
                    {transitions.map((status) => (
                      <Button
                        key={status}
                        title={status === 'closed' ? 'Yes, close it' : 'No, reopen'}
                        variant={status === 'closed' ? 'primary' : 'secondary'}
                        fullWidth={false}
                        loading={working}
                        style={styles.flexButton}
                        onPress={() => void act(() => updateTicketStatus(ticket.id, status))}
                      />
                    ))}
                  </View>
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
        renderItem={({ item }) => <CommentBubble comment={item} isMine={item.authorId === user?.uid} />}
      />
    </Screen>
  );
}

/**
 * Both of these live at module scope on purpose. A component defined inside
 * another component is a *new* component type on every render, so React
 * unmounts and remounts the whole subtree each time the parent updates —
 * which for a comment list means losing scroll position on every sync tick.
 */
function Detail({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      <Text variant="caption" tone="muted" style={styles.detailLabel}>
        {label}
      </Text>
      <Text variant="caption" style={styles.spacer}>
        {value}
      </Text>
    </View>
  );
}

function CommentBubble({
  comment,
  isMine,
}: {
  comment: TicketComment;
  isMine: boolean;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.row, styles.bubbleRow, { gap: spacing.sm }]}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: comment.fromSupport ? colors.primaryTint : colors.surfaceAlt },
        ]}
      >
        <Text
          variant="caption"
          style={{ color: comment.fromSupport ? colors.primary : colors.textMuted }}
        >
          {initialsOf(comment.authorName)}
        </Text>
      </View>

      <View
        style={[
          styles.spacer,
          styles.bubble,
          {
            backgroundColor: comment.fromSupport ? colors.primaryTint : colors.surface,
            borderColor: colors.border,
            borderRadius: 12,
            padding: spacing.md,
            gap: spacing.xs,
          },
        ]}
      >
        <View style={[styles.row, { gap: spacing.sm }]}>
          <Text variant="caption" tone={comment.fromSupport ? 'primary' : 'muted'}>
            {isMine ? 'You' : comment.authorName}
            {comment.fromSupport ? ' · IT Support' : ''}
          </Text>
          <View style={styles.spacer} />
          <Text variant="caption" tone="faint">
            {relativeTime(comment.createdAt)}
          </Text>
        </View>
        <Text>{comment.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  bubbleRow: { alignItems: 'flex-start' },
  spacer: { flex: 1 },
  detailLabel: { width: 110 },
  flexButton: { flex: 1 },
  replyField: { flex: 0 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderWidth: StyleSheet.hairlineWidth },
});
