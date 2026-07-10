"use client";

import { useTheme } from "@/ui/ThemeProvider";

const LIGHT = "product-light" as const;
const DARK = "product-dark" as const;

function isDarkTheme(theme: string) {
  return theme.endsWith("-dark");
}

export function ColorModeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = isDarkTheme(theme);

  return (
    <div className="color-mode-toggle" role="group" aria-label="Colour mode">
      <button
        type="button"
        className={`color-mode-toggle__btn${isDark ? "" : " is-active"}`}
        aria-pressed={!isDark}
        onClick={() => setTheme(LIGHT)}
      >
        Light
      </button>
      <button
        type="button"
        className={`color-mode-toggle__btn${isDark ? " is-active" : ""}`}
        aria-pressed={isDark}
        onClick={() => setTheme(DARK)}
      >
        Dark
      </button>
    </div>
  );
}
