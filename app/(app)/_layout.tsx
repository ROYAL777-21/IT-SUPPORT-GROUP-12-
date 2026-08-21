import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const { user, profileComplete } = useAuth();
  const { colors } = useTheme();

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/*
       * Onboarding is a route rather than a modal so it survives a reload with
       * the same guard: a profile without a student number cannot reach the
       * tabs, and the ticket form can therefore assume it has one.
       */}
      <Stack.Protected guard={!profileComplete}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={profileComplete}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="ticket/[id]"
          options={{ title: 'Ticket', headerBackTitle: 'Back' }}
        />
      </Stack.Protected>
    </Stack>
  );
}
