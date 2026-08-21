import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  EmptyState,
  FilterChip,
  Screen,
  SyncBanner,
  Text,
  TicketCard,
  TicketSkeleton,
} from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useQueue } from '@/hooks/useTickets';
import { STATUS_LABELS, isClosed, type TicketStatus } from '@/models/ticket';
import { useTheme } from '@/theme';

type Scope = 'open' | 'mine' | 'unassigned' | 'all';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'open', label: 'Needs work' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'mine', label: 'Assigned to me' },
  { value: 'all', label: 'All' },
];

/**
 * The support side of the app. Without it a ticket has no counterpart and the
 * lifecycle never moves past 'open'.
 */
export default function QueueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { pending, syncing, online, refresh } = useSync();
  const { spacing } = useTheme();

  const [scope, setScope] = useState<Scope>('open');

  const filter = useMemo(() => {
    switch (scope) {
      case 'mine':
        return { assignedTo: user?.uid };
      case 'unassigned':
        return { unassignedOnly: true };
      case 'open':
        return {
          statuses: ['open', 'in_progress', 'awaiting_student'] as TicketStatus[],
        };
      default:
        return {};
    }
  }, [scope, user?.uid]);

  const { data: tickets, loading } = useQueue(filter);

  const openCount = tickets.filter((ticket) => !isClosed(ticket.status)).length;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
        <View>
          <Text variant="title">Support queue</Text>
          <Text variant="caption" tone="muted">
            {loading
              ? 'Loading…'
              : `${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}` +
                (scope === 'all' && openCount !== tickets.length
                  ? ` · ${openCount} still open`
                  : '')}
          </Text>
        </View>

        <SyncBanner
          pending={pending}
          syncing={syncing}
          online={online}
          onRetry={() => void refresh()}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.sm,
        }}
      >
        {SCOPES.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={scope === option.value}
            onPress={() => setScope(option.value)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <TicketSkeleton />
          <TicketSkeleton />
          <TicketSkeleton />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(ticket) => ticket.id}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
          ]}
          refreshControl={
            <RefreshControl refreshing={syncing} onRefresh={() => void refresh()} />
          }
          renderItem={({ item }) => (
            <TicketCard
              ticket={item}
              showAssignee
              onPress={() => router.push(`/(app)/ticket/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-done-outline"
              title={scope === 'open' ? 'Queue is clear' : 'Nothing here'}
              message={
                scope === 'open'
                  ? `Nothing is ${STATUS_LABELS.open.toLowerCase()} or in progress right now.`
                  : 'Try a different filter.'
              }
              actionTitle={scope === 'open' ? undefined : 'Show all'}
              onAction={scope === 'open' ? undefined : () => setScope('all')}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1 },
});
