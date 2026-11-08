import { Link, Outlet } from "@tanstack/react-router";
import { BookOpen, ChefHat, LogOut, Moon, Plus, Settings, Star, Sun } from "lucide-react";
import { useUpdateStatus } from "../hooks/useSettings";
import { useAuthStore } from "../stores/auth";
import { useThemeStore } from "../stores/theme";

export function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

// Live star count from GET /api/update (server refreshes it hourly; hidden when the GitHub check is off)
function GitHubLink({ className }: { className: string }) {
  const stars = useUpdateStatus().data?.stars;
  const count = stars == null ? null : new Intl.NumberFormat(undefined, { notation: "compact" }).format(stars);
  return (
    <a
      href="https://github.com/SachinVenugopalan30/sous-clip"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={count ? `Sous Clip on GitHub, ${count} ${stars === 1 ? "star" : "stars"}` : "Sous Clip on GitHub"}
    >
      <GithubIcon className="h-4 w-4" />
      {count && (
        <span className="flex items-center gap-0.5 text-xs tabular-nums">
          <Star className="h-3 w-3" />
          {count}
        </span>
      )}
    </a>
  );
}

export function Layout() {
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useThemeStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="min-h-screen bg-bg font-sans text-text pb-16 sm:pb-0">
      {/* Desktop header */}
      <header className="hidden sm:block border-b border-border bg-surface">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-accent-text" />
            <span className="font-display text-xl font-bold">Sous Clip</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-text [&.active]:text-accent-text"
            >
              <BookOpen className="h-4 w-4" />
              Library
            </Link>
            <Link
              to="/submit"
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:bg-accent/90 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              Extract
            </Link>
            <Link
              to="/settings"
              className="text-muted-foreground transition-colors hover:text-text [&.active]:text-accent-text"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <GitHubLink className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-text" />
            <button
              onClick={toggleTheme}
              className="text-muted-foreground transition-colors hover:text-text"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <span className="text-xs text-muted-foreground">{username}</span>
            <button
              onClick={logout}
              className="text-muted-foreground transition-colors hover:text-text"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile header */}
      <header className="sm:hidden border-b border-border bg-surface">
        <nav className="flex items-center justify-between px-2 py-1">
          <Link to="/" className="flex min-h-11 items-center gap-2 px-2">
            <ChefHat className="h-5 w-5 text-accent-text" />
            <span className="font-display text-lg font-bold">SC</span>
          </Link>
          <div className="flex items-center">
            <GitHubLink className="flex h-11 min-w-11 items-center justify-center gap-1 px-2 text-muted-foreground transition-colors hover:text-text" />
            <button
              onClick={toggleTheme}
              className="grid size-11 place-items-center text-muted-foreground transition-colors hover:text-text"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <span className="px-1 text-xs text-muted-foreground">{username}</span>
            <button
              onClick={logout}
              className="grid size-11 place-items-center text-muted-foreground transition-colors hover:text-text"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface">
        <div className="flex items-center justify-around py-2">
          <Link
            to="/"
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground [&.active]:text-accent-text"
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px] font-medium">Library</span>
          </Link>
          <Link
            to="/submit"
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground [&.active]:text-accent-text"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Extract</span>
          </Link>
          <Link
            to="/settings"
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground [&.active]:text-accent-text"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
