import { createContext, useContext } from 'react';

export type ThemeMode = 'dark' | 'light';
export type ThemePref = 'system' | 'dark' | 'light';

export interface Colors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accent2: string;
  good: string;
  warn: string;
  bad: string;
  groggy: string;
  peak: string;
  dip: string;
  melatonin: string;
  onAccent: string;
}

export const darkColors: Colors = {
  bg: '#0B0E1A',
  surface: '#141A2E',
  surface2: '#1C2340',
  border: '#2A3358',
  text: '#F2F4FA',
  textMuted: '#9AA3BF',
  accent: '#FFB547',
  accent2: '#7C8CFF',
  good: '#4FD1A1',
  warn: '#FFB547',
  bad: '#FF6B6B',
  groggy: '#5A6488',
  peak: '#FFB547',
  dip: '#5B7CFA',
  melatonin: '#9B7CFF',
  onAccent: '#1A1300',
};

export const lightColors: Colors = {
  bg: '#F5F6FB',
  surface: '#FFFFFF',
  surface2: '#E9ECF7',
  border: '#D5DAEB',
  text: '#141A2E',
  textMuted: '#525B78',
  accent: '#B36B00',
  accent2: '#4A5BD6',
  good: '#0E8A63',
  warn: '#A8620A',
  bad: '#C93A3A',
  groggy: '#6B7599',
  peak: '#D98A00',
  dip: '#3E5FE0',
  melatonin: '#7656E0',
  onAccent: '#FFFFFF',
};

export const spacing = (n: number) => n * 4;
export const radius = { card: 20, button: 14, chip: 999, small: 10 } as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export interface ThemeValue {
  mode: ThemeMode;
  colors: Colors;
}

export const ThemeContext = createContext<ThemeValue>({ mode: 'dark', colors: darkColors });
export const useTheme = () => useContext(ThemeContext);

export function resolveMode(pref: ThemePref, system: 'light' | 'dark' | null | undefined): ThemeMode {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return system === 'light' ? 'light' : 'dark';
}

/** WCAG relative luminance contrast ratio between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
