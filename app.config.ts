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

const config: ExpoConfig = {
  name: 'Campus IT Help',
  slug: 'campus-it-help',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
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
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
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
