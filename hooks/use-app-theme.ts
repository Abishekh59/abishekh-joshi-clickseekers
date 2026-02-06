import { Colors } from '@/constants/theme';
import { useThemeColor } from './use-theme-color';

/**
 * A custom hook that returns all theme colors in a single object.
 * This reduces boilerplate code in components and makes it easier to access colors.
 */
export function useAppTheme() {
    // We specify the colors we want to extract from the theme
    // This allows us to keep the forced light mode logic centralized in useThemeColor 
    // or handle it here if we want to bypass the props-based logic for bulk access.

    const primary = useThemeColor({}, 'primary');
    const secondary = useThemeColor({}, 'secondary');
    const background = useThemeColor({}, 'background');
    const text = useThemeColor({}, 'text');
    const gray900 = useThemeColor({}, 'gray900');
    const gray700 = useThemeColor({}, 'gray700');
    const gray600 = useThemeColor({}, 'gray600');
    const gray500 = useThemeColor({}, 'gray500');
    const gray400 = useThemeColor({}, 'gray400');
    const gray300 = useThemeColor({}, 'gray300');
    const gray200 = useThemeColor({}, 'gray200');
    const gray100 = useThemeColor({}, 'gray100');
    const success = useThemeColor({}, 'success');
    const info = useThemeColor({}, 'info');
    const warning = useThemeColor({}, 'warning');
    const error = useThemeColor({}, 'error');
    const tint = useThemeColor({}, 'tint');
    const icon = useThemeColor({}, 'icon');

    // Non-themed constants
    const white = '#fff';

    return {
        primary,
        secondary,
        background,
        text,
        gray900,
        gray700,
        gray600,
        gray500,
        gray400,
        gray300,
        gray200,
        gray100,
        success,
        info,
        warning,
        error,
        tint,
        icon,
        white,
        // Also export the raw colors object for flexibility if needed
        colors: Colors.light
    };
}
