import { Image, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * The Eduvos mark.
 *
 * Every place the logo appears goes through here, so swapping the asset is one
 * file rather than a hunt through screens.
 *
 * The tile is light in both themes rather than following `colors.surface`. The
 * mark is navy, so on a dark surface it would all but disappear — a light plate
 * behind a dark logo is the usual answer and is what the brand's own material
 * does. The design draws this tile in navy, but it was drawn that way as an
 * empty container before there was a logo to put in it; filling it with a navy
 * crest would render the crest invisible.
 */
export function BrandMark({ size = 88 }: { size?: number }) {
  const { radius } = useTheme();

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Eduvos"
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: radius.md },
      ]}
    >
      <Image
        source={require('../../assets/eduvos-logo.png')}
        style={{ width: size * 0.68, height: size * 0.82 }}
        resizeMode="contain"
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    // The design's --color-bg. Fixed rather than themed, for the reason above.
    backgroundColor: '#F5F7F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
