import { StyleSheet, Text, type TextProps } from 'react-native';

import { Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' |
  'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' |
  'heading' | 'subheading' | 'caption' | 'label';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  weight,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,

        // New Scale
        type === 'xs' ? styles.xs : undefined,
        type === 'sm' ? styles.sm : undefined,
        type === 'base' ? styles.base : undefined,
        type === 'lg' ? styles.lg : undefined,
        type === 'xl' ? styles.xl : undefined,
        type === '2xl' ? styles.xl2 : undefined,
        type === '3xl' ? styles.xl3 : undefined,
        type === '4xl' ? styles.xl4 : undefined,

        // Semantic types
        type === 'heading' ? styles.xl2Bold : undefined,
        type === 'subheading' ? styles.lgSemiBold : undefined,
        type === 'caption' ? styles.xsNormal : undefined,
        type === 'label' ? styles.smMedium : undefined,

        weight ? { fontWeight: Typography.fontWeight[weight] } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  defaultSemiBold: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    fontWeight: Typography.fontWeight.semibold,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.tight,
  },
  subtitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.tight,
  },
  link: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    color: '#2563eb', // Brand info color
  },
  // Scale styles
  xs: { fontSize: Typography.fontSize.xs, lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal },
  sm: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal },
  base: { fontSize: Typography.fontSize.base, lineHeight: Typography.fontSize.base * Typography.lineHeight.normal },
  lg: { fontSize: Typography.fontSize.lg, lineHeight: Typography.fontSize.lg * Typography.lineHeight.tight },
  xl: { fontSize: Typography.fontSize.xl, lineHeight: Typography.fontSize.xl * Typography.lineHeight.tight },
  xl2: { fontSize: Typography.fontSize['2xl'], lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.tight },
  xl3: { fontSize: Typography.fontSize['3xl'], lineHeight: Typography.fontSize['3xl'] * Typography.lineHeight.tight },
  xl4: { fontSize: Typography.fontSize['4xl'], lineHeight: Typography.fontSize['4xl'] * Typography.lineHeight.tight },

  // Pre-composed styles
  xl2Bold: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.tight,
  },
  lgSemiBold: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.tight,
  },
  xsNormal: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.normal,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
  },
  smMedium: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
});
