import type { ExpoConfig } from 'expo/config';

/**
 * Expo config as TypeScript rather than app.json so it can read the
 * environment. `google-services.json` is not committed, and EAS build servers
 * never see the working tree, so the path has to come from an EAS file-type
 * environment variable at build time — see README.md.
 */

const GOOGLE_SERVICES_JSON =
  process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
const GOOGLE_SERVICES_PLIST =
  process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist';

/**
 * The design's --color-bg, and the ground every brand asset is built on.
 *
 * The Eduvos crest is navy, so it needs a light ground: on a brand-navy tile it
 * would simply disappear. That is why the launcher icon is light rather than
 * brand-coloured.
 */
const BRAND_GROUND = '#F5F7F9';

const config: ExpoConfig = {
  name: 'Campus IT Help',
  slug: 'campus-it-help',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  // Required for the OAuth redirect back into the app after Microsoft sign-in.
  scheme: 'campusithelp',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'za.ac.eduvos.campusithelp',
    googleServicesFile: GOOGLE_SERVICES_PLIST,
  },
  android: {
    package: 'za.ac.eduvos.campusithelp',
    googleServicesFile: GOOGLE_SERVICES_JSON,
    adaptiveIcon: {
      // Transparent foreground, drawn smaller than the icon: Android masks
      // adaptive icons to roughly the middle 66%, and a full-bleed crest would
      // be clipped by a round or squircle mask.
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: BRAND_GROUND,
    },
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: BRAND_GROUND,
      },
    ],
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    [
      'expo-build-properties',
      {
        ios: {
          // React Native Firebase resolves the Firebase Apple SDK with Swift
          // Package Manager on RN 0.75+, and SPM requires *dynamic* frameworks.
          // The `static` value most older guides show is for the CocoaPods
          // route and fails to link here.
          useFrameworks: 'dynamic',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
