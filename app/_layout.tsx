import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { SyncProvider } from '@/hooks/useSync';
import { ThemeProvider, useTheme } from '@/theme';
import { Button, Screen, Text } from '@/components';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SyncProvider>
              <RootNavigator />
            </SyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Holds the splash screen until we know who is signed in.
 *
 * Without this the app renders the sign-in screen for a frame or two before
 * the persisted session resolves, which looks like being signed out.
 */
function RootNavigator() {
  const { initialising, initialisationError, retrySession, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialising) {
      void SplashScreen.hideAsync();
    }
  }, [initialising]);

  if (initialising) {
    return null;
  }
  if (initialisationError) {
    return <Screen>
      <Text variant="heading">Could not load your account</Text>
      <Text accessibilityRole="alert">{initialisationError}</Text>
      {signOutError ? <Text accessibilityRole="alert" tone="danger">{signOutError}</Text> : null}
      <Button title="Retry" onPress={() => void retrySession()} />
      <Button title="Back to sign in" variant="secondary" onPress={() => {
        setSignOutError(null);
        void signOut().catch(() => setSignOutError('Could not sign out. Please retry.'));
      }} />
    </Screen>;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
