import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { BookOpen, ChefHat, LogOut, Moon, Plus, Settings, Star, Sun } from "lucide-react";
import { useRecipes } from "../hooks/useRecipes";
import { nextBar, type BarScroll } from "../lib/scrollBar";
import { useUpdateStatus } from "../hooks/useSettings";
import { useAuthStore } from "../stores/auth";
import { resolvesDark, useThemeStore } from "../stores/theme";

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

const onlineStore = (cb: () => void) => {
  addEventListener("online", cb);
  addEventListener("offline", cb);
  return () => {
    removeEventListener("online", cb);
    removeEventListener("offline", cb);
  };
};

export function Layout() {
  const online = useSyncExternalStore(onlineStore, () => navigator.onLine);
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolvesDark(theme);
  const pathname = useLocation().pathname;
  const hasRecipes = (useRecipes().data?.recipes.length ?? 0) > 0;
  // Overlay bar sits on a photo hero: library (with recipes), recipe detail and a shared recipe opened while signed in
  const recipePage = pathname.startsWith("/recipe/") || pathname.startsWith("/share/");
  const over = (pathname === "/" && hasRecipes) || recipePage;
  const bar = useRef<HTMLElement>(null);
  const scroll = useRef<BarScroll>({ y: 0, travel: 0, hidden: false });

  // Scroll direction drives data-hidden; data-solid marks the bar once it has left the photo hero. Both are attributes
  // (not state) so scrolling never re-renders. A new route resets and shows the bar.
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    scroll.current = { y: scrollY, travel: 0, hidden: false };
    let raf = 0;
    const apply = () => {
      raf = 0;
      const barH = el.offsetHeight;
      const maxY = document.documentElement.scrollHeight - innerHeight;
      scroll.current = nextBar(scroll.current, scrollY, barH, maxY);
      el.toggleAttribute("data-hidden", scroll.current.hidden);
      const hero = document.querySelector(".feat, .rec-hero");
      el.toggleAttribute("data-solid", !hero || hero.getBoundingClientRect().bottom <= barH);
    };
    const queue = () => (raf ||= requestAnimationFrame(apply));
    // Snap, don't slide, into the new route's shown state. Re-baselined after the router restores scroll (Back),
    // otherwise the restore would count as scrolling down.
    const reset = () => {
      el.style.transition = "none";
      scroll.current = { y: scrollY, travel: 0, hidden: false };
      el.removeAttribute("data-hidden");
      apply();
      el.getBoundingClientRect();
      el.style.transition = "";
    };
    reset();
    let r1 = 0, r2 = 0;
    r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(reset)));
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    const ro = new ResizeObserver(queue); // the library hero collapses during search without any scroll
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      removeEventListener("scroll", queue);
      removeEventListener("resize", queue);
      ro.disconnect();
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-bg font-sans text-text">
      <header ref={bar} className={`bar${over ? " over" : ""}`}>
        <Link to="/" className="bar-logo press">
          <ChefHat className="h-6 w-6" />
          <span className="font-display text-xl font-semibold">Sous Clip</span>
        </Link>
        <nav aria-label="Primary" className="bar-nav">
          <Link to="/" activeOptions={{ exact: true }} className="bar-link press" aria-label="Library">
            <BookOpen className="h-[18px] w-[18px]" />
            <span>Library</span>
          </Link>
          <Link to="/submit" className="bar-link bar-new press" aria-label="Extract">
            <Plus className="h-[18px] w-[18px]" />
            <span>Extract</span>
          </Link>
          <Link to="/settings" className="bar-link press" aria-label="Settings">
            <Settings className="h-[18px] w-[18px]" />
            <span>Settings</span>
          </Link>
        </nav>
        <div className="bar-tools">
          <GitHubLink className="bar-btn bar-gh press gap-1.5 px-2" />
          <button
            onClick={toggleTheme}
            className="bar-btn press"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <span className="bar-user mono text-xs">{username}</span>
          <button onClick={logout} className="bar-btn press" aria-label="Sign out" title="Sign out">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      {!online && (
        <p role="status" className="offline mono">
          Offline. Extracting and editing need the server, so they wait for the connection.
        </p>
      )}

      <main className={pathname === "/" || recipePage ? undefined : "page"}>
        <Outlet />
      </main>

    </div>
  );
}
