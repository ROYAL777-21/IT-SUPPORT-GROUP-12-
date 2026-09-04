import { StyleSheet, View } from 'react-native';

import {
  STATUS_LABELS,
  type TicketPriority,
  type TicketStatus,
} from '@/models/ticket';
import { useTheme } from '@/theme';

import { Text } from './Text';

/**
 * The design's three tag weights (`tag-accent` / `tag-outline` / `tag-neutral`).
 *
 * They form a deliberate attention ladder rather than a palette: filled draws
 * the eye, outlined is the resting state, quiet recedes. Which status or
 * priority gets which is decided by the design, not by this component — see
 * `statusTag()` and `priorityTag()` below.
 */
export type TagVariant = 'accent' | 'outline' | 'neutral';

export interface TagProps {
  label: string;
  variant?: TagVariant;
}

export function Tag({ label, variant = 'outline' }: TagProps) {
  const { colors, radius, spacing } = useTheme();

  const style = {
    accent: { bg: colors.accent, fg: colors.onPrimary, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.text, border: colors.border },
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted, border: 'transparent' },
  }[variant];

  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: style.bg,
          borderColor: style.border,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
        },
      ]}
    >
      <Text variant="caption" style={{ color: style.fg, fontSize: 11.5 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Status and priority both render as tags, and the design assigns each value a
 * weight directly (`statusTagClass` / `priorityTagClass` in its own logic).
 * Reproduced here so those two mappings live in one place.
 *
 * The logic behind them: what is being worked on right now is what a support
 * agent needs to spot, so 'In Progress' and 'High' are the filled ones. Done
 * work recedes.
 */
export const statusTag = (status: TicketStatus): TagVariant =>
  status === 'in_progress' ? 'accent' : status === 'resolved' ? 'neutral' : 'outline';

export const priorityTag = (priority: TicketPriority): TagVariant =>
  priority === 'high' ? 'accent' : priority === 'medium' ? 'outline' : 'neutral';

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const StatusTag = ({ status }: { status: TicketStatus }) => (
  <Tag label={STATUS_LABELS[status]} variant={statusTag(status)} />
);

export const PriorityTag = ({ priority }: { priority: TicketPriority }) => (
  <Tag label={PRIORITY_LABELS[priority]} variant={priorityTag(priority)} />
);

const styles = StyleSheet.create({
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
});
