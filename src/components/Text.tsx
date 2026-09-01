import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { TypographyVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  /** Semantic colour role. Defaults to the primary text colour. */
  tone?: 'default' | 'muted' | 'faint' | 'primary' | 'danger' | 'success' | 'onPrimary';
  center?: boolean;
}

/**
 * Every string in the app goes through here rather than through RN's <Text>,
 * so type scale and colour stay in the tokens instead of leaking into screens.
 */
export function Text({
  variant = 'body',
  tone = 'default',
  center,
  style,
  ...rest
}: TextProps) {
  const { colors, typography } = useTheme();

  const toneColor: Record<NonNullable<TextProps['tone']>, string> = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    primary: colors.primary,
    danger: colors.danger,
    success: colors.success,
    onPrimary: colors.onPrimary,
  };

  return (
    <RNText
      style={[
        typography[variant] as TextStyle,
        { color: toneColor[tone] },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
