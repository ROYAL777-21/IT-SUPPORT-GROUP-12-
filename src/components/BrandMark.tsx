import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

/**
 * The Eduvos mark.
 *
 * Every place the logo appears goes through here, so when `assets/eduvos-logo.jpg`
 * lands it is one import rather than a hunt through screens.
 *
 * Until then this renders the navy tile the design puts the logo on, with the
 * wordmark set in type. That is a deliberate stand-in rather than a redrawn
 * crest: an approximated logo looks finished and is wrong, which is worse than
 * one that plainly is not the mark yet.
 */
export function BrandMark({ size = 88 }: { size?: number }) {
  const { colors, radius } = useTheme();

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Eduvos"
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: colors.primaryPressed,
          borderRadius: radius.md,
        },
      ]}
    >
      <Text
        variant="bodyStrong"
        style={{ color: '#ffffff', fontSize: size * 0.2, letterSpacing: 0.5 }}
      >
        Eduvos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
