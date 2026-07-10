"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  THEMES,
  applyTheme,
  getStoredTheme,
} from "@mainroomstudio/design-system/theme";

export { THEMES };

type ThemeId = (typeof THEMES)[number]["id"];

const ThemeContext = createContext<{
  theme: ThemeId;
  setTheme: (themeId: ThemeId) => void;
} | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = "product-dark",
}: {
  children: ReactNode;
  defaultTheme?: ThemeId;
}) {
  const [theme, setThemeState] = useState<ThemeId>(defaultTheme);

  useEffect(() => {
    setThemeState(getStoredTheme(defaultTheme) as ThemeId);
  }, [defaultTheme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((themeId: ThemeId) => {
    setThemeState(themeId);
    applyTheme(themeId);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
