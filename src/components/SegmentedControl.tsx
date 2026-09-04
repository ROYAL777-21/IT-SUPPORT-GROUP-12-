import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH_SIZE, useTheme } from '@/theme';

import { Text } from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Announced to screen readers as the group's purpose. */
  label?: string;
  disabled?: boolean;
}

/**
 * The design's `.seg` control — a row of mutually exclusive options in a
 * rounded track, with the selected one raised onto a surface.
 *
 * Used in four places (login role hint, ticket filter, priority, agent status
 * setter), which is why it is a component rather than four ad-hoc rows.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
}: SegmentedControlProps<T>) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[
        styles.track,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          borderRadius: radius.sm,
          padding: 3,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              {
                backgroundColor: selected ? colors.surface : 'transparent',
                borderRadius: radius.sm - 3,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <Text
              variant={selected ? 'bodyStrong' : 'body'}
              numberOfLines={1}
              style={{
                color: selected ? colors.text : colors.textMuted,
                fontSize: 13,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth },
  option: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE - 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
