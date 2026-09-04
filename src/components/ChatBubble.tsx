import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface ChatBubbleProps {
  body: string;
  /** Who wrote it, as shown above the text — "You", an agent's name, "System". */
  author: string;
  timestamp: string;
  /** True when the signed-in user wrote it: right-aligned, on the tinted fill. */
  mine: boolean;
}

/**
 * One message in a ticket thread.
 *
 * The design renders a thread as a conversation rather than a comment list:
 * your own messages right-aligned on pale navy, the other party's left on the
 * surface. That asymmetry is the whole point — it is how you tell at a glance
 * whether support has replied yet.
 */
export function ChatBubble({ body, author, timestamp, mine }: ChatBubbleProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? colors.primaryTint : colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 1,
          },
        ]}
      >
        <Text variant="overline" tone="muted" style={styles.meta}>
          {author} · {timestamp}
        </Text>
        <Text>{body}</Text>
      </View>
    </View>
  );
}

/**
 * A status change or other event, centred and unattributed. Not a bubble —
 * nobody said it, so giving it a speaker would be wrong.
 */
export function SystemMessage({ text }: { text: string }) {
  return (
    <Text variant="caption" tone="faint" center>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '78%', borderWidth: StyleSheet.hairlineWidth },
  meta: { marginBottom: 3, letterSpacing: 0 },
});
