import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CATEGORY_LABELS, type Ticket } from '@/models/ticket';
import { useTheme } from '@/theme';
import { relativeTime } from '@/utils/format';

import { Card } from './Card';
import { PriorityDot } from './PriorityDot';
import { StatusBadge } from './StatusBadge';
import { Text } from './Text';

export interface TicketCardProps {
  ticket: Ticket;
  onPress: () => void;
  /** Show who it is assigned to — useful in the queue, noise in a student's list. */
  showAssignee?: boolean;
  /** True when this row has local changes still waiting to upload. */
  pendingUpload?: boolean;
}

export function TicketCard({
  ticket,
  onPress,
  showAssignee = false,
  pendingUpload = false,
}: TicketCardProps) {
  const { colors, spacing } = useTheme();

  return (
    <Card onPress={onPress}>
      <View style={{ gap: spacing.sm }}>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <StatusBadge status={ticket.status} />
          <View style={styles.spacer} />
          <PriorityDot priority={ticket.priority} showLabel />
        </View>

        <Text variant="bodyStrong" numberOfLines={2}>
          {ticket.subject}
        </Text>

        <View style={[styles.row, { gap: spacing.sm }]}>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.meta}>
            {ticket.reference} · {CATEGORY_LABELS[ticket.category]}
          </Text>
          <Text variant="caption" tone="faint">
            {relativeTime(ticket.updatedAt)}
          </Text>
        </View>

        {showAssignee || pendingUpload ? (
          <View style={[styles.row, { gap: spacing.md }]}>
            {showAssignee ? (
              <View style={[styles.row, { gap: spacing.xs }]}>
                <Ionicons
                  name={ticket.assignedToName ? 'person-outline' : 'person-add-outline'}
                  size={14}
                  color={ticket.assignedToName ? colors.textMuted : colors.warning}
                />
                <Text
                  variant="caption"
                  style={{ color: ticket.assignedToName ? colors.textMuted : colors.warning }}
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
  row: { flexDirection: 'row', alignItems: 'center' },
  spacer: { flex: 1 },
  meta: { flex: 1 },
});
