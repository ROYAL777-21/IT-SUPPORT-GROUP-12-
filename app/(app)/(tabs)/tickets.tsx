import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  EmptyState,
  Screen,
  SegmentedControl,
  TicketCard,
  TicketSkeleton,
} from '@/components';
import { useSync } from '@/hooks/useSync';
import { useMyTickets } from '@/hooks/useTickets';
import type { TicketStatus } from '@/models/ticket';
import { useTheme } from '@/theme';

type Filter = 'all' | TicketStatus;

/** The design's four segments. "Active" and "Done" are its wording, not ours. */
const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'Active' },
  { value: 'resolved', label: 'Done' },
];

export default function MyTicketsScreen() {
  const router = useRouter();
  const { syncing, refresh } = useSync();
  const { data: tickets, loading } = useMyTickets();
  const { spacing } = useTheme();

  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === filter)),
    [tickets, filter],
  );

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <SegmentedControl
          label="Filter tickets by status"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <TicketSkeleton />
          <TicketSkeleton />
          <TicketSkeleton />
        </View>
      ) : (
        <FlatList
          data={visible}
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
              onPress={() => router.push(`/(app)/ticket/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={tickets.length === 0 ? 'checkmark-circle-outline' : 'filter-outline'}
              title={tickets.length === 0 ? 'No tickets yet' : 'No tickets in this view'}
              message={
                tickets.length === 0
                  ? 'When something on campus is broken, log it here. It works offline too.'
                  : 'Try a different filter.'
              }
              actionTitle={tickets.length === 0 ? 'Log a ticket' : 'Show all'}
              onAction={
                tickets.length === 0
                  ? () => router.push('/(app)/new-ticket')
                  : () => setFilter('all')
              }
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
