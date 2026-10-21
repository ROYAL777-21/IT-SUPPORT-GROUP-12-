import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const { user, verified, profileComplete } = useAuth();
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
       * the same guard: a requester without an institutional number cannot reach the
       * tabs, and the ticket form can therefore assume it has one.
       */}
      <Stack.Protected guard={!verified}>
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={verified && !profileComplete}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={verified && profileComplete}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="ticket/[id]"
          options={{ title: 'Ticket', headerBackTitle: 'Back' }}
        />
        <Stack.Screen name="edit-profile" options={{ title: 'Edit profile' }} />
        <Stack.Screen name="ticket/edit/[id]" options={{ title: 'Edit ticket' }} />
      </Stack.Protected>
    </Stack>
  );
}
