import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Card } from './Card';
import { Text } from './Text';

export interface StatCardProps {
  value: number | string;
  label: string;
  onPress?: () => void;
}

/** The Open / Resolved counters on Home. */
export function StatCard({ value, label, onPress }: StatCardProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.flex}>
      <Card onPress={onPress}>
        <Text variant="display" style={[styles.value, { color: colors.text }]}>
          {value}
        </Text>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  value: { fontSize: 30, lineHeight: 36 },
});
