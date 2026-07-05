// iOS-native design tokens, light and dark. Mirrors Apple's system palettes
// and SF Pro type scale. Additive alongside src/theme/constants.js so any
// not-yet-migrated screen keeps working.
//
// Colors live in two palettes (darkPalette/lightPalette); resolve the active
// one through src/store/ThemeContext's useTheme() hook rather than importing
// `palette` directly, so components react to the light/dark/system setting.

export const shape = {
  cardRadius: 20,
  controlRadius: 14,
  // Apple's squircle corners; ignored on platforms that don't support it.
  borderCurve: 'continuous',
};

export const darkPalette = {
  scheme: 'dark',
  background: '#000000',
  card: '#1C1C1E', // secondarySystemBackground (dark)
  cardElevated: '#2C2C2E', // tertiarySystemBackground (dark)
  fill: 'rgba(120,120,128,0.24)', // systemFill (dark)
  separator: 'rgba(84,84,88,0.6)',
  label: '#FFFFFF',
  secondaryLabel: 'rgba(235,235,245,0.6)',
  tertiaryLabel: 'rgba(235,235,245,0.3)',
  tint: '#0A84FF', // systemBlue (dark)
  green: '#30D158',
  orange: '#FF9F0A',
  cyan: '#64D2FF',
  indigo: '#5E5CE6',
  purple: '#BF5AF2',
  pink: '#FF375F',
  red: '#FF453A',
  glassBorder: 'rgba(255,255,255,0.08)',
};

export const lightPalette = {
  scheme: 'light',
  background: '#F2F2F7', // systemGroupedBackground (light)
  card: '#FFFFFF', // secondarySystemGroupedBackground (light)
  cardElevated: '#F2F2F7',
  fill: 'rgba(120,120,128,0.2)', // systemFill (light)
  separator: 'rgba(60,60,67,0.29)',
  label: '#000000',
  secondaryLabel: 'rgba(60,60,67,0.6)',
  tertiaryLabel: 'rgba(60,60,67,0.3)',
  tint: '#007AFF', // systemBlue (light)
  green: '#34C759',
  orange: '#FF9500',
  cyan: '#32ADE6',
  indigo: '#5856D6',
  purple: '#AF52DE',
  pink: '#FF2D55',
  red: '#FF3B30',
  glassBorder: 'rgba(0,0,0,0.08)',
};

// Brand type: Bicyclette carries display work (greeting, titles, big numbers),
// Tanseek Modern Pro carries body copy. Loaded in App.js via useFonts.
export const fonts = {
  displayLight: 'Bicyclette-Light',
  display: 'Bicyclette-Regular',
  displayBold: 'Bicyclette-Bold',
  displayBlack: 'Bicyclette-Black',
  body: 'Tanseek-Light',
  bodyMedium: 'Tanseek-Medium',
};

export function buildTextStyles(resolvedPalette) {
  return {
    // Oversized lowercase greeting, e.g. "good evening."
    display: { fontFamily: fonts.displayBold, fontSize: 38, lineHeight: 42, color: resolvedPalette.label },
    largeTitle: { fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 40, color: resolvedPalette.label },
    title2: { fontFamily: fonts.displayBold, fontSize: 23, lineHeight: 28, color: resolvedPalette.label },
    title3: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 25, color: resolvedPalette.label },
    headline: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, color: resolvedPalette.label },
    // Big stat numbers ("448", "6,964").
    statValue: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 34, color: resolvedPalette.label },
    body: { fontFamily: fonts.body, fontSize: 18, lineHeight: 26, color: resolvedPalette.label },
    subheadline: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 21, color: resolvedPalette.label },
    footnote: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: resolvedPalette.secondaryLabel },
    caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 17, color: resolvedPalette.secondaryLabel },
    // Letterspaced caps section labels ("DAILY JOURNAL"). Pair with .toUpperCase().
    eyebrow: {
      fontFamily: fonts.display,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 2.4,
      color: resolvedPalette.secondaryLabel,
    },
  };
}

// Static dark-mode fallback for any file mid-migration to useTheme().
export const palette = darkPalette;
export const text = buildTextStyles(darkPalette);
