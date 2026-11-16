/**
 * Design tokens for Campus IT Help.
 *
 * The Campus IT Help mockups (`ds-styles.css` and friends) are still not in
 * the repo, so this file stands in for them. It is deliberately the *only*
 * place a raw colour or measurement is written down: every component reads
 * from here, so when the real stylesheet does land, porting it means rewriting
 * this one file rather than hunting hex codes through the screens.
 */

/**
 * Brand navy, taken from the Deliverable 3 screen wireframes (`--navy`,
 * `--navy-soft`), and the ramp derived from it. Matches the Eduvos logo.
 */
const BRAND = {
  50: '#e6edf4', // wireframe --navy-soft
  100: '#c9d8e6', // wireframe own-bubble border
  200: '#9db7d0',
  300: '#6d92b6',
  400: '#4a75a0',
  500: '#1b3a5c', // primary (wireframe --navy)
  600: '#152f4b',
  700: '#10243a',
  800: '#0b1a2a',
  900: '#07111c',
} as const;

const NEUTRAL = {
  0: '#ffffff', // wireframe --paper
  50: '#f2f4f6', // wireframe --page
  100: '#e8edf1', // wireframe --rule-2
  200: '#d3dae1', // wireframe --rule
  300: '#b4bfca',
  400: '#8494a4', // wireframe --ink-3
  500: '#64748a',
  600: '#4a5a6a', // wireframe --ink-2
  700: '#334250',
  800: '#222e3a',
  900: '#16202b', // wireframe --ink
  950: '#0b1219',
} as const;

/** Semantic hues. Each has a `fg` for text/icons and a `bg` for tinted fills. */
const SIGNAL = {
  info: { light: '#1b3a5c', dark: '#9db7d0' },
  success: { light: '#1f6844', dark: '#6ee7a8' }, // wireframe --green
  warning: { light: '#8a6416', dark: '#fcd34d' }, // wireframe --amber
  danger: { light: '#aa3333', dark: '#ff9c94' }, // wireframe error red
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
  infoTint: '#e6edf4',
  success: SIGNAL.success.light,
  successTint: '#e2f0e8',
  warning: SIGNAL.warning.light,
  warningTint: '#fbf1dc',
  danger: SIGNAL.danger.light,
  dangerTint: '#f8e8e8',

  scrim: 'rgba(22, 32, 43, 0.45)',
  microsoft: '#2f6fed',
};

export const darkColors: ColorScheme = {
  background: NEUTRAL[950],
  surface: NEUTRAL[900],
  surfaceAlt: NEUTRAL[800],
  border: '#26323f',
  borderStrong: '#3b4958',

  text: NEUTRAL[50],
  textMuted: NEUTRAL[400],
  textFaint: NEUTRAL[500],
  onPrimary: NEUTRAL[0],

  primary: BRAND[400],
  primaryPressed: BRAND[300],
  primaryTint: 'rgba(74, 117, 160, 0.22)',

  info: SIGNAL.info.dark,
  infoTint: 'rgba(157, 183, 208, 0.14)',
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
