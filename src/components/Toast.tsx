import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Text } from './Text';

interface ToastContextValue {
  /** Show a short confirmation. Replaces any toast already on screen. */
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** How long a toast stays up, matching the design's 2.6s animation. */
const DURATION_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), DURATION_MS);
  }, []);

  // A pending timer holds a setState on an unmounted tree otherwise.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? <Toast message={message} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }
  return context;
}

function Toast({ message }: { message: string }) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      // Nothing here is tappable, and it floats over the tab bar — without this
      // it would swallow taps on whatever it happens to be covering.
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          backgroundColor: colors.primaryPressed,
          borderRadius: radius.md,
          bottom: insets.bottom + 88,
          marginHorizontal: spacing.xl,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text variant="caption" center style={{ color: '#ffffff' }}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 0, right: 0, zIndex: 20, elevation: 8 },
});
