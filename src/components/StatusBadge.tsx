import { StyleSheet, View } from 'react-native';

import { STATUS_LABELS, type TicketStatus } from '@/models/ticket';
import { useTheme } from '@/theme';

import { Text } from './Text';

/**
 * Maps each status onto a semantic colour role. The labels themselves come
 * from STATUS_LABELS so there is exactly one place a status is named.
 */
const TONE: Record<TicketStatus, 'info' | 'warning' | 'success' | 'muted'> = {
  open: 'info',
  in_progress: 'warning',
  awaiting_student: 'warning',
  resolved: 'success',
  closed: 'muted',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const { colors, radius, spacing } = useTheme();

  const palette = {
    info: { fg: colors.info, bg: colors.infoTint },
    warning: { fg: colors.warning, bg: colors.warningTint },
    success: { fg: colors.success, bg: colors.successTint },
    muted: { fg: colors.textMuted, bg: colors.surfaceAlt },
  }[TONE[status]];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.bg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
        },
      ]}
    >
      <Text variant="overline" style={{ color: palette.fg }}>
        {STATUS_LABELS[status].toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start' },
});
