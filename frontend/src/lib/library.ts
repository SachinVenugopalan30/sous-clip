import type { Recipe } from "./api.ts";

type Timed = Pick<Recipe, "created_at" | "prep_time_minutes" | "cook_time_minutes">;
export type SortKey = "newest" | "oldest" | "quickest";
export interface LibraryFilters {
  maxMinutes: number | null;
  addedWithinDays: number | null;
  sort: SortKey;
}

const DAY_MS = 86_400_000;

export function totalMinutes(r: Timed): number | null {
  if (r.prep_time_minutes == null && r.cook_time_minutes == null) return null;
  return (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
}

export function applyLibraryFilters<T extends Timed>(recipes: T[], f: LibraryFilters, now = Date.now()): T[] {
  const added = (r: T) => Date.parse(r.created_at);
  const minutes = (r: T) => totalMinutes(r) ?? Infinity; // untimed recipes sort last and fail any max
  return recipes
    .filter((r) => f.maxMinutes === null || minutes(r) <= f.maxMinutes)
    .filter((r) => f.addedWithinDays === null || now - added(r) <= f.addedWithinDays * DAY_MS)
    .sort((a, b) =>
      f.sort === "quickest" ? minutes(a) - minutes(b) || added(b) - added(a)
      : f.sort === "oldest" ? added(a) - added(b)
      : added(b) - added(a)
    );
}

// "today", "yesterday", "3 days ago", "2 weeks ago", "last year"
export function formatAdded(createdAt: string, now = Date.now(), locale?: string): string {
  const days = Math.floor((now - Date.parse(createdAt)) / DAY_MS);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.floor(days / 7), "week");
  if (days < 365) return rtf.format(-Math.floor(days / 30), "month");
  return rtf.format(-Math.floor(days / 365), "year");
}
