import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: (origin?: Origin) => void;
}

export function resolvesDark(theme: Theme): boolean {
  return theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

type Origin = { clientX: number; clientY: number };

let vt: ViewTransition | undefined;

function applyTheme(theme: Theme, origin?: Origin) {
  const root = document.documentElement;
  const isDark = resolvesDark(theme);
  const flip = () => root.classList.toggle("dark", isDark);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!origin || reduced || !document.startViewTransition) return flip();

  // Keyboard activation reports 0,0; wipe from the centre instead of the corner
  const { clientX: x, clientY: y } = origin.clientX || origin.clientY
    ? origin
    : { clientX: innerWidth / 2, clientY: innerHeight / 2 };
  root.style.setProperty("--tx", `${x}px`);
  root.style.setProperty("--ty", `${y}px`);
  root.classList.add("theme-flip");
  try {
    const t = (vt = document.startViewTransition(flip));
    t.ready.catch(() => {});
    t.finished.catch(() => {}).finally(() => {
      if (vt === t) root.classList.remove("theme-flip");
    });
  } catch {
    flip();
    root.classList.remove("theme-flip");
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme, { clientX: innerWidth / 2, clientY: innerHeight / 2 });
      },
      toggleTheme: (origin) => {
        const next = resolvesDark(get().theme) ? "light" : "dark";
        set({ theme: next });
        applyTheme(next, origin);
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
