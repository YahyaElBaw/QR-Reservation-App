import { create } from 'zustand';
import { Appearance } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  toggleTheme: () =>
    set((state) => {
      const isCurrentlyDark =
        state.mode === 'system'
          ? Appearance.getColorScheme() === 'dark'
          : state.mode === 'dark';
      return { mode: isCurrentlyDark ? 'light' : 'dark' };
    }),
  setMode: (mode: ThemeMode) => set({ mode }),
}));
