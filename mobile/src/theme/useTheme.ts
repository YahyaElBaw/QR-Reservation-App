import { useColorScheme } from 'react-native';
import { colors, darkColors, space, radius, fonts, shadow } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const c = isDark ? darkColors : colors;

  return {
    isDark,
    c,
    space,
    radius,
    fonts,
    shadow,
  };
}
