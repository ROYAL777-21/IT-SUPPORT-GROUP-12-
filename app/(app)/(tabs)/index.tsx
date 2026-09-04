import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button,
  EmptyState,
  Screen,
  StatCard,
  SyncBanner,
  Text,
  TextLink,
  TicketCard,
  TicketSkeleton,
} from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useMyTickets } from '@/hooks/useTickets';
import { isClosed } from '@/models/ticket';
import { useTheme } from '@/theme';

/** How many recent tickets Home shows before "View all" takes over. */
const RECENT_LIMIT = 3;

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { pending, syncing, online, refresh } = useSync();
  const { data: tickets, loading } = useMyTickets();
  const { spacing } = useTheme();

  const { openCount, resolvedCount, recent } = useMemo(
    () => ({
      openCount: tickets.filter((ticket) => !isClosed(ticket.status)).length,
      resolvedCount: tickets.filter((ticket) => isClosed(ticket.status)).length,
      recent: tickets.slice(0, RECENT_LIMIT),
    }),
    [tickets],
  );

  const firstName = profile?.displayName.split(' ')[0];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxl,
          gap: spacing.lg,
        }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={() => void refresh()} />}
      >
        <Text tone="muted">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </Text>

        <SyncBanner
          pending={pending}
          syncing={syncing}
          online={online}
          onRetry={() => void refresh()}
        />

        <View style={[styles.row, { gap: spacing.md }]}>
          <StatCard
            value={openCount}
            label="Open"
            onPress={() => router.push('/(app)/(tabs)/tickets')}
          />
          <StatCard
            value={resolvedCount}
            label="Resolved"
            onPress={() => router.push('/(app)/(tabs)/tickets')}
          />
        </View>

        <Button title="+ New Ticket" onPress={() => router.push('/(app)/new-ticket')} />

        <View style={{ gap: spacing.md }}>
          <View style={[styles.row, styles.listHeader]}>
            <Text variant="overline" tone="muted" style={styles.grow}>
              RECENT TICKETS
            </Text>
            {tickets.length > RECENT_LIMIT ? (
              <TextLink label="View all" onPress={() => router.push('/(app)/(tabs)/tickets')} />
            ) : null}
          </View>

          {loading ? (
            <>
              <TicketSkeleton />
              <TicketSkeleton />
              <TicketSkeleton />
            </>
          ) : recent.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="No tickets yet"
              message="When something on campus is broken, log it here. It works offline too."
              actionTitle="Log a ticket"
              onAction={() => router.push('/(app)/new-ticket')}
            />
          ) : (
            recent.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onPress={() => router.push(`/(app)/ticket/${ticket.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  listHeader: { alignItems: 'baseline' },
  grow: { flex: 1 },
});
