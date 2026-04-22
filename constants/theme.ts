/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#1e3a8a'; // Updated to Brand Navy
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#111827', // gray-900
    background: '#fff',
    tint: tintColorLight,
    icon: '#6B7280', // gray-500
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,
    secondary: '#f97316', // Orange accent
    gray900: '#111827',
    gray700: '#374151',
    gray600: '#4B5563',
    gray500: '#6B7280',
    gray400: '#9CA3AF',
    gray300: '#D1D5DB',
    gray200: '#E5E7EB',
    gray100: '#F3F4F6',
    primary: '#1e3a8a',
    success: '#059669', // green-600
    info: '#2563eb', // blue-600
    warning: '#d97706', // yellow-600
    error: '#dc2626', // red-600
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    secondary: '#f97316',
    gray900: '#F9FAFB',
    gray700: '#E5E7EB',
    gray600: '#D1D5DB',
    gray500: '#9CA3AF',
    gray400: '#6B7280',
    gray300: '#4B5563',
    gray200: '#374151',
    gray100: '#111827',
    primary: '#3b82f6',
    success: '#10b981',
    info: '#3b82f6',
    warning: '#fbbf24',
    error: '#f87171',
  },
};

export const Typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
  },
  android: {
    sans: 'Roboto',
  },
  default: {
    sans: 'normal',
  },
});
