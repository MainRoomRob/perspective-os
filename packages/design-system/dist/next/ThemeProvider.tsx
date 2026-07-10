'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  PALETTES,
  THEMES,
  applyColorSystem,
  getStoredPalette,
  getStoredTheme,
} from '../theme.js';

export { PALETTES, THEMES };

type ThemeId = (typeof THEMES)[number]['id'];
type PaletteId = (typeof PALETTES)[number]['id'];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  palette: PaletteId;
  setPalette: (paletteId: PaletteId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeId;
  defaultPalette?: PaletteId;
}

export function ThemeProvider({
  children,
  defaultTheme = 'product-light',
  defaultPalette = 'mrs',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(defaultTheme);
  const [palette, setPaletteState] = useState<PaletteId>(defaultPalette);

  useEffect(() => {
    setThemeState(getStoredTheme(defaultTheme) as ThemeId);
    setPaletteState(getStoredPalette(defaultPalette) as PaletteId);
  }, [defaultTheme, defaultPalette]);

  useEffect(() => {
    applyColorSystem({ theme, palette });
  }, [theme, palette]);

  const setTheme = useCallback((themeId: ThemeId) => {
    setThemeState(themeId);
    applyColorSystem({ theme: themeId, palette });
  }, [palette]);

  const setPalette = useCallback((paletteId: PaletteId) => {
    setPaletteState(paletteId);
    applyColorSystem({ theme, palette: paletteId });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export function usePalette() {
  const { palette, setPalette } = useTheme();
  return { palette, setPalette };
}
