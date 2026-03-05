import { Link, Outlet } from "@tanstack/react-router";
import { BookOpen, ChefHat, Github, LogOut, Moon, Plus, Settings, Sun } from "lucide-react";
import { useAuthStore } from "../stores/auth";
import { useThemeStore } from "../stores/theme";

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
            <ChefHat className="h-6 w-6 text-accent" />
            <span className="font-display text-xl font-bold">Sous Clip</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-text [&.active]:text-accent"
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
              className="text-muted-foreground transition-colors hover:text-text [&.active]:text-accent"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/SachinVenugopalan30/sous-clip"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-text"
              title="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
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
        <nav className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-accent" />
            <span className="font-display text-lg font-bold">SC</span>
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/SachinVenugopalan30/sous-clip"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-text"
              title="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
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

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface">
        <div className="flex items-center justify-around py-2">
          <Link
            to="/"
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground [&.active]:text-accent"
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px] font-medium">Library</span>
          </Link>
          <Link
            to="/submit"
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground [&.active]:text-accent"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Extract</span>
          </Link>
          <Link
            to="/settings"
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground [&.active]:text-accent"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
