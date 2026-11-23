import { useColorScheme } from 'react-native';
import { colors, darkColors, space, radius, fonts, shadow } from './tokens';
import { useThemeStore } from '../stores/themeStore';

export function useTheme() {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const c = isDark ? darkColors : colors;

  return {
    isDark,
    toggleTheme,
    c,
    space,
    radius,
    fonts,
    shadow,
  };
}
