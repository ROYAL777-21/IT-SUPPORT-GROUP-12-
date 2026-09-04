import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { MIN_TOUCH_SIZE, useTheme } from '@/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Rendered before the label — an icon, usually. */
  leading?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  leading,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { bg: string; pressedBg: string; fg: string; border: string }> = {
    primary: {
      bg: colors.primary,
      pressedBg: colors.primaryPressed,
      fg: colors.onPrimary,
      border: 'transparent',
    },
    secondary: {
      bg: colors.surface,
      pressedBg: colors.surfaceAlt,
      fg: colors.text,
      border: colors.borderStrong,
    },
    ghost: {
      bg: 'transparent',
      pressedBg: colors.surfaceAlt,
      fg: colors.primary,
      border: 'transparent',
    },
    danger: {
      bg: colors.danger,
      pressedBg: colors.danger,
      fg: colors.onPrimary,
      border: 'transparent',
    },
  };

  const { bg, pressedBg, fg, border } = palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? pressedBg : bg,
          borderColor: border,
          borderRadius: radius.button,
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {leading ? <View>{leading}</View> : null}
          <Text variant="bodyStrong" style={{ color: fg }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  fullWidth: { alignSelf: 'stretch' },
});
