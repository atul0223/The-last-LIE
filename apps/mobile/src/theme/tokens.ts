import { Platform } from 'react-native';

export const COLORS = {
  bg: '#0d0f12',
  surface: '#161a20',
  surfaceElevated: '#1f242d',
  surfaceBorder: '#272e3a',
  text: '#f0f2f5',
  muted: '#7e8a9b',
  accent: '#e5a93b',
  danger: '#d9534f',
  success: '#4ea872',
  border: '#232934',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const TYPOGRAPHY = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: COLORS.text,
    letterSpacing: 0.25,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: COLORS.text,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.muted,
    lineHeight: 18,
  },
  monospace: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 13,
    color: COLORS.accent,
    letterSpacing: 0.2,
  },
} as const;

export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
} as const;

export type Theme = typeof THEME;
