import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { MIN_TOUCH_SIZE, useTheme } from '@/theme';

import { Text } from './Text';

/** The Microsoft four-square mark, at the sizes the brand guidelines allow. */
function MicrosoftLogo({ size = 18 }: { size?: number }) {
  const half = size / 2;
  const gap = size * 0.06;
  const tile = half - gap / 2;

  return (
    <Svg width={size} height={size} accessibilityRole="image">
      <Rect x={0} y={0} width={tile} height={tile} fill="#f25022" />
      <Rect x={half + gap / 2} y={0} width={tile} height={tile} fill="#7fba00" />
      <Rect x={0} y={half + gap / 2} width={tile} height={tile} fill="#00a4ef" />
      <Rect x={half + gap / 2} y={half + gap / 2} width={tile} height={tile} fill="#ffb900" />
    </Svg>
  );
}

export interface MicrosoftButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function MicrosoftButton({ onPress, loading = false, disabled }: MicrosoftButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Microsoft"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
          borderColor: colors.borderStrong,
          borderRadius: radius.button,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <View>
            <MicrosoftLogo />
          </View>
          <Text variant="bodyStrong">Continue with Microsoft</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_SIZE,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
