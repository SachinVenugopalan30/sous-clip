/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyLibraryFilters, formatAdded } from "./library.ts";

const NOW = Date.parse("2026-09-28T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const recipe = (id: number, created: number, prep: number | null, cook: number | null) => ({
  id, created_at: daysAgo(created), prep_time_minutes: prep, cook_time_minutes: cook,
});
const recipes = [recipe(1, 2, 10, 15), recipe(2, 10, 20, 20), recipe(3, 40, null, null), recipe(4, 0, 5, null)];
const ids = (rs: { id: number }[]) => rs.map((r) => r.id);
const none = { maxMinutes: null, addedWithinDays: null, sort: "newest" } as const;

test("max time keeps recipes at or under it and drops ones with no time", () => {
  assert.deepEqual(ids(applyLibraryFilters(recipes, { ...none, maxMinutes: 25 }, NOW)), [4, 1]);
});

test("added-within keeps only recent recipes", () => {
  assert.deepEqual(ids(applyLibraryFilters(recipes, { ...none, addedWithinDays: 7 }, NOW)), [4, 1]);
});

test("sorts newest, oldest, and quickest with untimed recipes last", () => {
  assert.deepEqual(ids(applyLibraryFilters(recipes, none, NOW)), [4, 1, 2, 3]);
  assert.deepEqual(ids(applyLibraryFilters(recipes, { ...none, sort: "oldest" }, NOW)), [3, 2, 1, 4]);
  assert.deepEqual(ids(applyLibraryFilters(recipes, { ...none, sort: "quickest" }, NOW)), [4, 1, 2, 3]);
});

test("formats when a recipe was added", () => {
  const cases: [number, string][] = [[0, "today"], [1, "yesterday"], [3, "3 days ago"], [14, "2 weeks ago"], [60, "2 months ago"], [400, "last year"]];
  for (const [d, expected] of cases) assert.equal(formatAdded(daysAgo(d), NOW, "en"), expected, `${d} days`);
});
