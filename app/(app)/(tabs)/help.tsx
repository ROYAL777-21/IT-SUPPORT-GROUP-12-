import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Screen, Text } from '@/components';
import { HELP_CATEGORIES, type HelpArticle } from '@/content/helpArticles';
import { useTheme } from '@/theme';

export default function HelpScreen() {
  const router = useRouter();
  const { spacing } = useTheme();

  // One open at a time: an accordion where everything can be open is just a
  // long page, and the point here is to scan titles first.
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Screen scroll contentContainerStyle={{ paddingTop: spacing.md, gap: spacing.xl }}>
      <Text tone="muted">
        Answers to the things students ask most. If none of these fix it, log a
        ticket and IT will pick it up.
      </Text>

      {HELP_CATEGORIES.map((category) => (
        <View key={category.name} style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="muted">
            {category.name.toUpperCase()}
          </Text>
          {category.articles.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              open={openId === article.id}
              onToggle={() => setOpenId(openId === article.id ? null : article.id)}
            />
          ))}
        </View>
      ))}

      <Button
        title="Still stuck? Log a ticket"
        variant="secondary"
        onPress={() => router.push('/(app)/new-ticket')}
      />
    </Screen>
  );
}

function ArticleRow({
  article,
  open,
  onToggle,
}: {
  article: HelpArticle;
  open: boolean;
  onToggle: () => void;
}) {
  const { colors, spacing } = useTheme();

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={[styles.row, { gap: spacing.sm }]}
      >
        <Text variant="bodyStrong" style={styles.grow}>
          {article.title}
        </Text>
        <Text variant="heading" style={{ color: colors.textMuted }}>
          {open ? '–' : '+'}
        </Text>
      </Pressable>

      {open ? (
        <Text tone="muted" style={{ marginTop: spacing.sm }}>
          {article.answer}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
});
