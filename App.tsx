import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { isFirebaseConfigured } from '@/config/firebase';
import { getDatabase } from '@/db/database';
import { countPending } from '@/services/ticketRepository';

/**
 * PLACEHOLDER SCREEN.
 *
 * This is a health check for the data layer, not the real UI. The actual
 * screens are built from the Campus IT Help mockups once those source files
 * are in the repo; this file is replaced wholesale at that point.
 *
 * Until then it gives the group something runnable: `npm start` and confirm
 * the migrations applied and the Firebase config is being read.
 */

type Health = {
  schemaVersion: number;
  tables: string[];
  pending: number;
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = await getDatabase();
        const version = await db.getFirstAsync<{ user_version: number }>(
          'PRAGMA user_version;',
        );
        const tables = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
        );
        const pending = await countPending();

        if (!cancelled) {
          setHealth({
            schemaVersion: version?.user_version ?? 0,
            tables: tables.map((row) => row.name),
            pending,
          });
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Campus IT Help</Text>
        <Text style={styles.subtitle}>Data layer health check</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {!health && !error && <ActivityIndicator />}

        {health && (
          <View style={styles.card}>
            <Row label="SQLite schema" value={`v${health.schemaVersion}`} />
            <Row label="Tables" value={String(health.tables.length)} />
            <Row label="Pending writes" value={String(health.pending)} />
            <Row
              label="Firebase"
              value={isFirebaseConfigured ? 'configured' : 'not configured'}
            />
            <Text style={styles.tables}>{health.tables.join(', ')}</Text>
          </View>
        )}

        <Text style={styles.note}>
          Placeholder UI. The real screens come from the Campus IT Help design.
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6f8' },
  content: { padding: 24, paddingTop: 72, gap: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#11181c' },
  subtitle: { fontSize: 15, color: '#5c6670', marginBottom: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15, color: '#5c6670' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#11181c' },
  tables: { fontSize: 12, color: '#8b949e', marginTop: 4 },
  error: { color: '#b3261e', fontSize: 14, marginBottom: 12 },
  note: { fontSize: 13, color: '#8b949e', marginTop: 20 },
});
