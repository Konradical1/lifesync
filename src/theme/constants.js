// Journal X Design System — Dark mode only, 70/20/10 rule

export const colors = {
  // 70% — Background
  background: '#0D1117',
  backgroundSecondary: '#010409',

  // 20% — Surface / cards
  surface: '#161B22',
  surfaceElevated: '#21262D',

  // 10% — Accent (navy blue)
  accent: '#58A6FF',
  accentMuted: '#388BFD',

  // Text
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  textHighlight: '#58A6FF',
  textMuted: '#6E7681',

  // Border / divider
  border: '#30363D',
  borderLight: '#21262D',

  // Section alternating shade (subtle)
  sectionShade: 'rgba(22, 27, 34, 0.35)',

  // Event type colors (calendar + add event)
  eventSleep: '#6366F1',
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

export const typography = {
  // SF-like system defaults, medium contrast
  fontFamily: undefined, // system default
  largeTitle: { fontSize: 34, fontWeight: '700' },
  title1: { fontSize: 28, fontWeight: '600' },
  title2: { fontSize: 22, fontWeight: '600' },
  title3: { fontSize: 20, fontWeight: '600' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17, fontWeight: '400' },
  callout: { fontSize: 16, fontWeight: '400' },
  subhead: { fontSize: 15, fontWeight: '400' },
  footnote: { fontSize: 13, fontWeight: '400' },
  caption1: { fontSize: 12, fontWeight: '400' },
  caption2: { fontSize: 11, fontWeight: '400' },
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
