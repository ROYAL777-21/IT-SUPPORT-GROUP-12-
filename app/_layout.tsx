import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { SyncProvider } from '@/hooks/useSync';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SyncProvider>
              {/*
                Inside SafeAreaProvider because the toast positions itself off
                the bottom inset, and outside the navigator so it survives a
                route change — a confirmation for an action that navigates
                away is exactly the case it exists for.
              */}
              <ToastProvider>
                <RootNavigator />
              </ToastProvider>
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
  const { initialising } = useAuth();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (!initialising) {
      void SplashScreen.hideAsync();
    }
  }, [initialising]);

  if (initialising) {
    return null;
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
