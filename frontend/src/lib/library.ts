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

export interface Shelf<T> {
  key: string;
  title: string;
  recipes: T[];
}

export const SHELF_MAX = 12;
const UNDER_MINUTES = 30;
const MAX_TAG_SHELVES = 2;

/** Latest, Under 30 minutes (untimed recipes excluded), then up to two most-used tags (2+ recipes, ties alphabetical). Empty shelves are dropped. */
export function buildShelves<T extends Timed & { tags: string[] }>(recipes: T[]): Shelf<T>[] {
  const newest = [...recipes].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const counts = new Map<string, number>();
  for (const r of newest) for (const t of new Set(r.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
  const topTags = [...counts]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_TAG_SHELVES)
    .map(([t]) => t);
  const shelves: Shelf<T>[] = [
    { key: "latest", title: "Latest", recipes: newest },
    { key: "under30", title: "Under 30 minutes", recipes: newest.filter((r) => (totalMinutes(r) ?? Infinity) <= UNDER_MINUTES) },
    ...topTags.map((t) => ({ key: `tag:${t}`, title: t, recipes: newest.filter((r) => r.tags.includes(t)) })),
  ];
  return shelves.filter((s) => s.recipes.length > 0).map((s) => ({ ...s, recipes: s.recipes.slice(0, SHELF_MAX) }));
}

/** "Chicken Wrap (Layered Wrapper Style)" -> main + parenthesised suffix */
export function splitTitle(title: string): { main: string; suffix: string | null } {
  const m = title.match(/^(.*?)\s*(\([^()]*\))\s*$/);
  return m && m[1] ? { main: m[1], suffix: m[2] } : { main: title, suffix: null };
}

/** "No. 0012": one format for hero and tile */
export const recipeNo = (id: number) => `No. ${String(id).padStart(4, "0")}`;
