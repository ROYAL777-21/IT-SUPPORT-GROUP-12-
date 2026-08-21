import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

/**
 * The entry route. Both groups below are guarded independently, so this only
 * has to pick a starting side; it is not the security boundary.
 */
export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? '/(app)/(tabs)' : '/(auth)/sign-in'} />;
}
