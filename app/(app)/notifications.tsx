import { FlatList, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Card, EmptyState, Screen, Text } from '@/components';
import { useSupportActivity } from '@/hooks/useTickets';
import { useTheme } from '@/theme';
import { relativeTime } from '@/utils/format';

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: activity, loading } = useSupportActivity();
  const { spacing } = useTheme();

  return (
    <Screen padded={false} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Notifications' }} />

      <FlatList
        data={activity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
          },
        ]}
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/(app)/ticket/${item.ticketId}`)}>
            <View style={{ gap: spacing.xs }}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {item.authorName} replied to “{item.ticketSubject}”
              </Text>
              <Text tone="muted" numberOfLines={2}>
                {item.body}
              </Text>
              <Text variant="caption" tone="faint">
                {relativeTime(item.createdAt)}
              </Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="notifications-outline"
              title="Nothing yet"
              message="When IT support replies to one of your tickets, it shows up here."
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1 },
});
