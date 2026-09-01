import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme';

/** Signed-in users never see these screens. */
export default function AuthLayout() {
  const { user } = useAuth();
  const { colors } = useTheme();

  if (user) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
