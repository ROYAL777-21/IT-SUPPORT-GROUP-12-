/**
 * Design tokens for Campus IT Help.
 *
 * These are the real values, taken from the `:root` block of
 * `Campus IT Help.dc.html` — the Claude Design project. Earlier revisions of
 * this file were guesses made while the mockups were missing, and two of them
 * were wrong: the primary was too light, and the accent was a turquoise this
 * brand does not contain.
 *
 * Still approximate, because `ds-styles.css` did not come with the export:
 *   - the NEUTRAL ramp (the design references --color-neutral-* from that file)
 *   - the type family (--font-body), so the system stack stands in
 * Everything else below is exact.
 *
 * This remains the only place a raw colour or measurement is written down.
 */

/**
 * The Eduvos ramp, verbatim from the design.
 *
 * Note it is deliberately NOT a smooth ramp, and is not a mistake to "fix":
 * 100–600 walk navy from pale to the brand colour, 700/800 jump to the sky-blue
 * accent, and 900 returns to near-black navy. Splitting it into BRAND + ACCENT
 * below keeps that honest rather than interpolating a shade the brand has no
 * value for.
 */
const BRAND = {
  100: '#E6EAF1',
  200: '#C1CBDE',
  300: '#93A5C4',
  400: '#5D76A3',
  500: '#2E4E82',
  600: '#15305F', // primary — also the body text colour in this design
  900: '#001B30',
} as const;

/** The sky blue from the logo's tagline. Accents and active states, never a page ground. */
const ACCENT = {
  700: '#2AA2E1',
  800: '#1C7FB3',
} as const;

/**
 * Greys. Derived, not from the design — see the header. Tuned to sit correctly
 * between the design's #F5F7F9 ground and its #15305F ink rather than to be
 * neutral in isolation, so they carry a trace of the brand's blue.
 */
const NEUTRAL = {
  0: '#ffffff',
  50: '#F5F7F9', // the design's --color-bg
  100: '#EDF0F4',
  200: '#DFE4EB',
  300: '#C6CEDA',
  400: '#98A3B5',
  500: '#6B7688',
  600: '#5A6678',
  700: '#414C5E',
  800: '#232C3C',
  900: '#111926',
  950: '#0A101A',
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
  /** Pale navy. The design's own fill for a message you sent. */
  primaryTint: string;
  /** The logo's sky blue. Active tabs, links, emphasis — never a page ground. */
  accent: string;
  accentTint: string;

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
  // The design draws every divider as the ink at 16%, so it composites the same
  // over the page and over a card. An opaque hex would only match one of them.
  border: 'rgba(21, 48, 95, 0.16)',
  borderStrong: 'rgba(21, 48, 95, 0.30)',

  text: BRAND[600],
  textMuted: NEUTRAL[600],
  textFaint: NEUTRAL[400],
  onPrimary: NEUTRAL[0],

  primary: BRAND[600],
  primaryPressed: BRAND[900],
  primaryTint: BRAND[100],
  accent: ACCENT[700],
  accentTint: '#E4F4FC',

  info: SIGNAL.info.light,
  infoTint: '#e8efff',
  success: SIGNAL.success.light,
  successTint: '#e6f6ec',
  warning: SIGNAL.warning.light,
  warningTint: '#fdf1e0',
  danger: SIGNAL.danger.light,
  dangerTint: '#fdeceb',

  scrim: 'rgba(0, 27, 48, 0.45)',
  microsoft: '#2f6fed',
};

/**
 * Dark mode. Not in the design — the canvas is light only — but the app ships
 * `userInterfaceStyle: 'automatic'` and has always had a dark palette, so this
 * derives one from the same hues rather than dropping working behaviour to
 * match a mockup that simply does not cover the case.
 *
 * The roles invert: navy cannot be the ink on a dark ground, so the sky-blue
 * accent carries the emphasis and the pale navy becomes the primary.
 */
export const darkColors: ColorScheme = {
  background: NEUTRAL[950],
  surface: NEUTRAL[900],
  surfaceAlt: NEUTRAL[800],
  border: 'rgba(198, 206, 218, 0.16)',
  borderStrong: 'rgba(198, 206, 218, 0.30)',

  text: NEUTRAL[50],
  textMuted: NEUTRAL[400],
  textFaint: NEUTRAL[500],
  onPrimary: BRAND[900],

  primary: BRAND[300],
  primaryPressed: BRAND[200],
  primaryTint: 'rgba(147, 165, 196, 0.18)',
  accent: ACCENT[700],
  accentTint: 'rgba(42, 162, 225, 0.16)',

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

/**
 * Radii, from the design. Buttons are squarer than everything else there —
 * `.btn` overrides to 8px while cards and bubbles stay at 16 — so `button` is
 * its own token rather than a reuse of `sm`.
 */
export const radius = {
  button: 8,
  sm: 10, // inputs, select triggers, small chips
  md: 16, // cards, chat bubbles, toast
  lg: 16,
  xl: 20, // sheet top corners
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 25, lineHeight: 32, fontWeight: '700' },
  title: { fontSize: 23, lineHeight: 29, fontWeight: '700' },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '600' },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 14.5, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  /** The small-caps label above a card title, and the top bar's kicker. */
  overline: { fontSize: 10.5, lineHeight: 14, fontWeight: '600', letterSpacing: 0.85 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Minimum touch target. Anything tappable should meet this. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH_SIZE = 44;
