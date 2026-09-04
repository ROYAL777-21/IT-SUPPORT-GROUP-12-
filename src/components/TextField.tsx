import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Validation message. Its presence is what puts the field in the error state. */
  error?: string | null;
  /** Guidance shown under the field when there is no error. */
  hint?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

export function TextField({
  label,
  error,
  hint,
  required,
  containerStyle,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.danger
    : focused
      ? colors.primary
      : colors.border;

  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      <Text variant="caption" tone="muted">
        {label}
        {required ? ' *' : ''}
      </Text>

      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          typography.body,
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderRadius: radius.sm,
            color: colors.text,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
          multiline && styles.multiline,
        ]}
        {...rest}
      />

      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, minHeight: 48 },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
