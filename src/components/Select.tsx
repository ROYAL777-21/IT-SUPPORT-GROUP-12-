import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MIN_TOUCH_SIZE, useTheme } from '@/theme';

import { Text } from './Text';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Optional second line, e.g. an explanation of a priority level. */
  description?: string;
}

export interface SelectProps<T extends string> {
  label: string;
  value: T | null;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | null;
  required?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * A modal option list rather than a platform picker. RN's <Picker> looks and
 * behaves differently on each platform and cannot be themed to match the rest
 * of this design system, which matters more here than native familiarity.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
  required,
  containerStyle,
}: SelectProps<T>) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);

  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      <Text variant="caption" tone="muted">
        {label}
        {required ? ' *' : ''}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Text tone={selected ? 'default' : 'faint'} numberOfLines={1} style={styles.triggerLabel}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close"
        >
          {/* Stop taps inside the sheet from closing it. */}
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingTop: spacing.lg,
                paddingBottom: spacing.xxl,
              },
            ]}
          >
            <Text variant="heading" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
              {label}
            </Text>

            <FlatList
              data={options}
              keyExtractor={(option) => option.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                        gap: spacing.xs,
                      },
                    ]}
                  >
                    <View style={styles.optionRow}>
                      <Text variant={isSelected ? 'bodyStrong' : 'body'} style={styles.optionLabel}>
                        {item.label}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      ) : null}
                    </View>
                    {item.description ? (
                      <Text variant="caption" tone="muted">
                        {item.description}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: MIN_TOUCH_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  triggerLabel: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '70%' },
  option: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionLabel: { flex: 1 },
});
