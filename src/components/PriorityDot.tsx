import { StyleSheet, View } from 'react-native';

import type { TicketPriority } from '@/models/ticket';
import { useTheme } from '@/theme';

import { Text } from './Text';

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function PriorityDot({
  priority,
  showLabel = false,
}: {
  priority: TicketPriority;
  showLabel?: boolean;
}) {
  const { colors, spacing } = useTheme();

  const color: Record<TicketPriority, string> = {
    low: colors.textMuted,
    medium: colors.info,
    high: colors.warning,
    urgent: colors.danger,
  };

  return (
    <View style={[styles.row, { gap: spacing.xs }]}>
      <View style={[styles.dot, { backgroundColor: color[priority] }]} />
      {showLabel ? (
        <Text variant="caption" style={{ color: color[priority] }}>
          {PRIORITY_LABELS[priority]}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
