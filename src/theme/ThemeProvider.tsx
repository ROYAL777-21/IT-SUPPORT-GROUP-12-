import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  darkColors,
  lightColors,
  radius,
  spacing,
  typography,
  type ColorScheme,
} from './tokens';

export interface Theme {
  colors: ColorScheme;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  isDark: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // `useColorScheme()` returns null before the OS value is known; treat that
  // as light rather than flashing a dark screen and then correcting.
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      spacing,
      radius,
      typography,
      isDark,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme() must be used inside <ThemeProvider>.');
  }
  return theme;
}
