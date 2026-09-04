import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CATEGORY_LABELS, type Ticket } from '@/models/ticket';
import { useTheme } from '@/theme';
import { relativeTime } from '@/utils/format';

import { Card } from './Card';
import { PriorityTag, StatusTag } from './Tag';
import { Text } from './Text';

export interface TicketCardProps {
  ticket: Ticket;
  onPress: () => void;
  /** Show who logged it — useful in the queue, noise in a student's own list. */
  showReporter?: boolean;
  /** Show who it is assigned to — useful in the queue, noise elsewhere. */
  showAssignee?: boolean;
  /** True when this row has local changes still waiting to upload. */
  pendingUpload?: boolean;
}

/**
 * Ticket row, laid out as the design specifies: category kicker above the
 * subject, status on the right, and priority plus age on a footer line.
 *
 * The ordering is doing work. Subject is what you scan for, so it is the
 * largest thing and sits second; status is what you filter by, so it is pinned
 * right where the eye lands after the title.
 */
export function TicketCard({
  ticket,
  onPress,
  showReporter = false,
  showAssignee = false,
  pendingUpload = false,
}: TicketCardProps) {
  const { colors, spacing } = useTheme();

  return (
    <Card onPress={onPress}>
      <View style={{ gap: spacing.sm }}>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <View style={styles.grow}>
            <Text variant="overline" tone="muted">
              {CATEGORY_LABELS[ticket.category].toUpperCase()}
            </Text>
            <Text variant="bodyStrong" numberOfLines={2}>
              {ticket.subject}
            </Text>
            {showReporter ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {ticket.studentNumber}
              </Text>
            ) : null}
          </View>
          <StatusTag status={ticket.status} />
        </View>

        <View style={[styles.row, styles.footer, { gap: spacing.sm }]}>
          <PriorityTag priority={ticket.priority} />
          <Text variant="caption" tone="faint" numberOfLines={1} style={styles.grow}>
            {ticket.reference} · {relativeTime(ticket.updatedAt)}
          </Text>
        </View>

        {showAssignee || pendingUpload ? (
          <View style={[styles.row, { gap: spacing.md }]}>
            {showAssignee ? (
              <View style={[styles.row, { gap: spacing.xs }]}>
                <Ionicons
                  name={ticket.assignedToName ? 'person-outline' : 'person-add-outline'}
                  size={14}
                  color={ticket.assignedToName ? colors.textMuted : colors.accent}
                />
                <Text
                  variant="caption"
                  style={{ color: ticket.assignedToName ? colors.textMuted : colors.accent }}
                >
                  {ticket.assignedToName ?? 'Unassigned'}
                </Text>
              </View>
            ) : null}

            {pendingUpload ? (
              <View style={[styles.row, { gap: spacing.xs }]}>
                <Ionicons name="cloud-upload-outline" size={14} color={colors.info} />
                <Text variant="caption" style={{ color: colors.info }}>
                  Waiting to upload
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  footer: { alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
});
