import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap the content in a ScrollView. Off for screens that own a FlatList. */
  scroll?: boolean;
  /** Apply the standard horizontal gutter. */
  padded?: boolean;
  /**
   * Which safe-area edges to inset. Android is edge-to-edge unconditionally
   * from SDK 54, so this is not optional decoration — without it content sits
   * under the status and navigation bars.
   */
  edges?: readonly Edge[];
  contentContainerStyle?: ViewStyle;
  /** Pinned to the bottom, outside the scroll area — e.g. a submit button. */
  footer?: ReactNode;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
  footer,
}: ScreenProps) {
  const { colors, spacing } = useTheme();

  const padding: ViewStyle = padded
    ? { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }
    : {};

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={edges}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[padding, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, contentContainerStyle]}>{children}</View>
      )}

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
