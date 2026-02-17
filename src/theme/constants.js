// Journal X Design System — Dark mode, high contrast

export const colors = {
  // Background — original dark + more contrast
  background: '#0D1117',
  backgroundSecondary: '#010409',

  // Surface / cards
  surface: '#161B22',
  surfaceElevated: '#21262D',

  // Accent — original blue, slightly brighter for contrast
  accent: '#58A6FF',
  accentMuted: '#388BFD',

  // Text — brighter for more contrast
  textPrimary: '#F0F6FC',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  textHighlight: '#58A6FF',
  textMuted: '#6E7681',

  // Border / divider — more visible
  border: '#30363D',
  borderLight: '#21262D',

  // Section alternating shade
  sectionShade: 'rgba(22, 27, 34, 0.5)',

  // Event type colors — original
  eventSleep: '#6366F1',
  water: '#0EA5E9',
  eventFood: '#22C55E',
  eventExercise: '#F59E0B',
  eventMeds: '#EC4899',
  eventOther: '#8B5CF6',
};

export const EVENT_TYPE_COLORS = {
  sleep: colors.eventSleep,
  food: colors.eventFood,
  exercise: colors.eventExercise,
  meds: colors.eventMeds,
  other: colors.eventOther,
};

// Inter — loaded in App.js; typography is bolder throughout
export const fontFamily = 'Inter_400Regular';
export const fontFamilyMedium = 'Inter_500Medium';
export const fontFamilySemiBold = 'Inter_600SemiBold';
export const fontFamilyBold = 'Inter_700Bold';

export const typography = {
  fontFamily,
  fontFamilyMedium,
  fontFamilySemiBold,
  fontFamilyBold,
  largeTitle: { fontSize: 34, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  title1: { fontSize: 28, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  title2: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  title3: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headline: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  body: { fontSize: 17, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  callout: { fontSize: 16, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  subhead: { fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  footnote: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  caption1: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  caption2: { fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};
