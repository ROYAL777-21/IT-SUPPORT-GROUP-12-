import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { role } = useAuth();
  const { colors } = useTheme();
  const isSupport = role === 'support';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My tickets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="new"
        options={{
          title: 'Log a ticket',
          tabBarLabel: 'New',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/*
       * Hiding the queue from students is presentation only. What actually
       * keeps other people's tickets off their device is the pull scope in
       * syncService plus firestore.rules — a student's SQLite never holds them.
       */}
      <Tabs.Protected guard={isSupport}>
        <Tabs.Screen
          name="queue"
          options={{
            title: 'Support queue',
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
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
