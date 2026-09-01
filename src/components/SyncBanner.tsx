import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface SyncBannerProps {
  /** Local writes not yet accepted by Firestore. */
  pending: number;
  syncing: boolean;
  online: boolean;
  onRetry?: () => void;
}

/**
 * Surfaces the offline-first behaviour instead of hiding it. A student who has
 * just logged a ticket with no signal needs to know it is saved and queued —
 * silence there reads as data loss.
 */
export function SyncBanner({ pending, syncing, online, onRetry }: SyncBannerProps) {
  const { colors, radius, spacing } = useTheme();

  // Everything is up to date and we are connected: say nothing.
  if (online && pending === 0 && !syncing) {
    return null;
  }

  const { bg, fg, icon, message } = !online
    ? {
        bg: colors.warningTint,
        fg: colors.warning,
        icon: 'cloud-offline-outline' as const,
        message:
          pending > 0
            ? `Offline — ${pending} ${pending === 1 ? 'change' : 'changes'} will upload when you reconnect`
            : 'Offline — showing your saved tickets',
      }
    : syncing
      ? {
          bg: colors.infoTint,
          fg: colors.info,
          icon: 'sync-outline' as const,
          message: 'Syncing…',
        }
      : {
          bg: colors.infoTint,
          fg: colors.info,
          icon: 'cloud-upload-outline' as const,
          message: `${pending} ${pending === 1 ? 'change' : 'changes'} waiting to upload`,
        };

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        },
      ]}
    >
      {syncing ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Ionicons name={icon} size={18} color={fg} />
      )}

      <Text variant="caption" style={[styles.message, { color: fg }]}>
        {message}
      </Text>

      {onRetry && online && !syncing ? (
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text variant="caption" style={{ color: fg, textDecorationLine: 'underline' }}>
            Retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center' },
  message: { flex: 1 },
});
