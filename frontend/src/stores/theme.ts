import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme, animate = false) {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const root = document.documentElement;

  if (animate) {
    root.classList.add("theme-transition");
    root.classList.toggle("dark", isDark);
    // Remove transition class after animation completes to avoid
    // interfering with other transitions (e.g. hover effects)
    setTimeout(() => root.classList.remove("theme-transition"), 600);
  } else {
    root.classList.toggle("dark", isDark);
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme, true);
      },
      toggleTheme: () => {
        const current = get().theme;
        const isDark =
          current === "dark" ||
          (current === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        const next = isDark ? "light" : "dark";
        set({ theme: next });
        applyTheme(next, true);
      },
    }),
    { name: "sc-theme" }
  )
);

// Apply on load
applyTheme(useThemeStore.getState().theme);

// Listen for system preference changes when in "system" mode
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (useThemeStore.getState().theme === "system") {
      applyTheme("system");
    }
  });
