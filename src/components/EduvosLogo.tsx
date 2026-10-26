import { Image, StyleSheet, View } from 'react-native';

/** Keep the official wordmark's colours and proportions on a white backing. */
export function EduvosLogo() {
  return (
    <View style={styles.backing}>
      <Image
        source={require('../../assets/branding/eduvos-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Eduvos. Your Education. Your Future."
        accessible
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backing: { width: 272, maxWidth: '100%', padding: 16, borderRadius: 12, backgroundColor: '#ffffff' },
  // Override both intrinsic image dimensions; aspectRatio alone retains the
  // source bitmap's native height in React Native's Image layout.
  logo: { width: '100%', height: 90 },
});
