export const colors = {
  primary900: '#0B2F57',
  primary700: '#124A85',
  primary600: '#17589C',
  primary500: '#1B67B5',
  primary100: '#DCEAF8',
  primary50: '#EEF5FC',
  accent500: '#F2A81D',
  accent100: '#FDF0D2',
  onPrimary: '#FFFFFF',
  onAccent: '#2A1B00',
  bg: '#F6F9FC',
  surface: '#FFFFFF',
  surfaceAlt: '#ECF1F6',
  border: '#D5DEE8',
  borderStrong: '#B4C2D1',
  text: '#0F2133',
  textMuted: '#566779',
  textFaint: '#8797A8',
  overlay: 'rgba(11,47,87,0.55)',
  success500: '#1E9E6A',
  success100: '#D9F2E6',
  warning500: '#E08A00',
  warning100: '#FCEBCB',
  danger500: '#C8372D',
  danger100: '#F9DEDB',
  info500: '#2F7FD1',
  info100: '#DCEAF8',
} as const;

export const darkColors = {
  ...colors,
  bg: '#0A1622',
  surface: '#11222F',
  surfaceAlt: '#182D3D',
  border: '#25394B',
  text: '#EAF1F8',
  textMuted: '#9FB1C3',
  primary500: '#4C9AE8',
  accent500: '#F5B94A',
  success500: '#3CC48C',
  warning500: '#F0A93A',
  danger500: '#EF6B61',
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  14: 56,
  18: 72,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
  ar: 'Cairo_400Regular',
  arBold: 'Cairo_700Bold',
} as const;

export const shadow = {
  1: {
    shadowColor: '#0B2F57',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  2: {
    shadowColor: '#0B2F57',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  3: {
    shadowColor: '#0B2F57',
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
} as const;

export type ThemeColors = typeof colors;
