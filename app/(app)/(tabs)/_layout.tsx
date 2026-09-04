import { Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const router = useRouter();
  const { role } = useAuth();
  const { colors, spacing } = useTheme();
  const isSupport = role === 'support';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        // The design marks the active tab in the logo's sky blue, which is the
        // one place that colour earns its loudness.
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {/*
       * Two different tab bars, as the design specifies: a student gets Home,
       * Tickets, Help and Account; support gets Queue and Account only. An
       * agent has no tickets of their own and no use for the help centre.
       *
       * This is presentation. What actually keeps other students' tickets off a
       * student's device is the pull scope in syncService plus firestore.rules.
       */}
      <Tabs.Protected guard={!isSupport}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
            // The bell in the design's top bar. Header-level rather than in the
            // screen so it does not scroll away.
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                hitSlop={8}
                onPress={() => router.push('/(app)/notifications')}
                style={{ marginRight: spacing.lg }}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="tickets"
          options={{
            title: 'My Tickets',
            tabBarLabel: 'Tickets',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="albums-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="help"
          options={{
            title: 'Help Center',
            tabBarLabel: 'Help',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmark-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={isSupport}>
        <Tabs.Screen
          name="queue"
          options={{
            title: 'Ticket Queue',
            tabBarLabel: 'Queue',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
