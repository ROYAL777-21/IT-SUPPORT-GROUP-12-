/**
 * Design tokens for Campus IT Help.
 *
 * The Campus IT Help mockups (`ds-styles.css` and friends) are still not in
 * the repo, so this file stands in for them. It is deliberately the *only*
 * place a raw colour or measurement is written down: every component reads
 * from here, so when the real stylesheet does land, porting it means rewriting
 * this one file rather than hunting hex codes through the screens.
 */

/** Eduvos brand red, and the ramp derived from it. */
const BRAND = {
  50: '#fdecec',
  100: '#f9c9c9',
  200: '#f19d9d',
  300: '#e77070',
  400: '#dc4b4b',
  500: '#c8102e', // primary
  600: '#a80d27',
  700: '#870a1f',
  800: '#660718',
  900: '#450410',
} as const;

const NEUTRAL = {
  0: '#ffffff',
  50: '#f7f8fa',
  100: '#eef0f4',
  200: '#dfe3e9',
  300: '#c5ccd6',
  400: '#98a2b3',
  500: '#6b7280',
  600: '#4b5563',
  700: '#333a45',
  800: '#20252d',
  900: '#14181e',
  950: '#0b0e12',
} as const;

/** Semantic hues. Each has a `fg` for text/icons and a `bg` for tinted fills. */
const SIGNAL = {
  info: { light: '#1d4ed8', dark: '#93b4ff' },
  success: { light: '#15803d', dark: '#6ee7a8' },
  warning: { light: '#b45309', dark: '#fcd34d' },
  danger: { light: '#b3261e', dark: '#ff9c94' },
} as const;

export interface ColorScheme {
  /** Page background. */
  background: string;
  /** Raised surfaces: cards, sheets, inputs. */
  surface: string;
  /** A surface one step further forward, e.g. a pressed row. */
  surfaceAlt: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textFaint: string;
  /** Text that sits on top of `primary`. */
  onPrimary: string;

  primary: string;
  primaryPressed: string;
  primaryTint: string;

  info: string;
  infoTint: string;
  success: string;
  successTint: string;
  warning: string;
  warningTint: string;
  danger: string;
  dangerTint: string;

  /** Backdrop behind modals. */
  scrim: string;
  /** Microsoft brand blue, for the SSO button's border/label. */
  microsoft: string;
}

export const lightColors: ColorScheme = {
  background: NEUTRAL[50],
  surface: NEUTRAL[0],
  surfaceAlt: NEUTRAL[100],
  border: NEUTRAL[200],
  borderStrong: NEUTRAL[300],

  text: NEUTRAL[900],
  textMuted: NEUTRAL[500],
  textFaint: NEUTRAL[400],
  onPrimary: NEUTRAL[0],

  primary: BRAND[500],
  primaryPressed: BRAND[600],
  primaryTint: BRAND[50],

  info: SIGNAL.info.light,
  infoTint: '#e8efff',
  success: SIGNAL.success.light,
  successTint: '#e6f6ec',
  warning: SIGNAL.warning.light,
  warningTint: '#fdf1e0',
  danger: SIGNAL.danger.light,
  dangerTint: '#fdeceb',

  scrim: 'rgba(11, 14, 18, 0.45)',
  microsoft: '#2f6fed',
};

export const darkColors: ColorScheme = {
  background: NEUTRAL[950],
  surface: NEUTRAL[900],
  surfaceAlt: NEUTRAL[800],
  border: '#252b34',
  borderStrong: '#39414d',

  text: NEUTRAL[50],
  textMuted: NEUTRAL[400],
  textFaint: NEUTRAL[500],
  onPrimary: NEUTRAL[0],

  primary: BRAND[400],
  primaryPressed: BRAND[300],
  primaryTint: 'rgba(220, 75, 75, 0.16)',

  info: SIGNAL.info.dark,
  infoTint: 'rgba(147, 180, 255, 0.14)',
  success: SIGNAL.success.dark,
  successTint: 'rgba(110, 231, 168, 0.14)',
  warning: SIGNAL.warning.dark,
  warningTint: 'rgba(252, 211, 77, 0.14)',
  danger: SIGNAL.danger.dark,
  dangerTint: 'rgba(255, 156, 148, 0.14)',

  scrim: 'rgba(0, 0, 0, 0.6)',
  microsoft: '#7aa5ff',
};

/** 4pt grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.6 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Minimum touch target. Anything tappable should meet this. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH_SIZE = 44;
