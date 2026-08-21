import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  EmptyState,
  FilterChip,
  Screen,
  StatusBadge,
  SyncBanner,
  Text,
  TicketCard,
  TicketSkeleton,
} from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useMyTickets } from '@/hooks/useTickets';
import { TICKET_STATUSES, isClosed, type TicketStatus } from '@/models/ticket';
import { useTheme } from '@/theme';

type Filter = 'active' | 'all' | TicketStatus;

export default function MyTicketsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { pending, syncing, online, refresh } = useSync();
  const { data: tickets, loading } = useMyTickets();
  const { spacing } = useTheme();

  const [filter, setFilter] = useState<Filter>('active');

  const visible = useMemo(() => {
    if (filter === 'all') {
      return tickets;
    }
    if (filter === 'active') {
      return tickets.filter((ticket) => !isClosed(ticket.status));
    }
    return tickets.filter((ticket) => ticket.status === filter);
  }, [tickets, filter]);

  const firstName = profile?.displayName.split(' ')[0];

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
        {firstName ? (
          <Text variant="title">Hi {firstName}</Text>
        ) : null}

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
        <FilterChip
          label="Active"
          selected={filter === 'active'}
          onPress={() => setFilter('active')}
        />
        <FilterChip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {TICKET_STATUSES.map((status) => (
          <FilterChip
            key={status}
            label={<StatusBadge status={status} />}
            selected={filter === status}
            onPress={() => setFilter(status)}
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
              title={tickets.length === 0 ? 'No tickets yet' : 'Nothing matches that filter'}
              message={
                tickets.length === 0
                  ? 'When something on campus is broken, log it here. It works offline too.'
                  : 'Try a different filter.'
              }
              actionTitle={tickets.length === 0 ? 'Log a ticket' : 'Show all'}
              onAction={
                tickets.length === 0
                  ? () => router.push('/(app)/(tabs)/new')
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
