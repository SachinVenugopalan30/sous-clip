/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyLibraryFilters, buildShelves, formatAdded, recipeNo, SHELF_MAX, splitTitle } from "./library.ts";

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

const tagged = (id: number, created: number, total: number | null, tags: string[]) => ({
  ...recipe(id, created, total, null), tags,
});

test("Latest shelf is newest first and always present", () => {
  const shelves = buildShelves([tagged(1, 5, 40, []), tagged(2, 1, 40, []), tagged(3, 3, 40, [])]);
  assert.deepEqual(shelves.map((s) => s.key), ["latest"]);
  assert.deepEqual(ids(shelves[0].recipes), [2, 3, 1]);
});

test("Under 30 keeps recipes at or below 30 minutes and skips untimed ones", () => {
  const shelves = buildShelves([tagged(1, 5, 30, []), tagged(2, 1, 31, []), tagged(3, 3, null, []), tagged(4, 2, 10, [])]);
  const under = shelves.find((s) => s.key === "under30");
  assert.deepEqual(ids(under?.recipes ?? []), [4, 1]);
  assert.equal(buildShelves([tagged(1, 1, null, [])]).some((s) => s.key === "under30"), false);
});

test("tag shelves: at most two, most used first, only tags with 2+ recipes", () => {
  const rs = [
    tagged(1, 1, 99, ["pasta", "veg"]), tagged(2, 2, 99, ["pasta", "veg"]), tagged(3, 3, 99, ["pasta", "soup"]),
    tagged(4, 4, 99, ["soup", "veg"]), tagged(5, 5, 99, ["lonely"]), tagged(6, 6, 99, ["dessert", "soup"]),
  ];
  const tags = buildShelves(rs).filter((s) => s.key.startsWith("tag:"));
  // pasta 3, veg 3, soup 3: tie broken alphabetically; dessert/lonely have 1
  assert.deepEqual(tags.map((s) => s.title), ["pasta", "soup"]);
  assert.deepEqual(ids(tags[0].recipes), [1, 2, 3]);
  assert.equal(buildShelves([tagged(1, 1, 99, ["a"]), tagged(2, 2, 99, ["b"])]).length, 1);
});

test("splits a parenthesised title suffix", () => {
  assert.deepEqual(splitTitle("Chicken Wrap (Layered Wrapper Style)"), { main: "Chicken Wrap", suffix: "(Layered Wrapper Style)" });
  assert.deepEqual(splitTitle("Plain Soup"), { main: "Plain Soup", suffix: null });
});

test("shelves are capped but the cap leaves older recipes out of Latest only", () => {
  const many = Array.from({ length: SHELF_MAX + 3 }, (_, i) => tagged(i + 1, i, 10, ["a"]));
  const shelves = buildShelves(many);
  assert.equal(shelves.find((s) => s.key === "latest")?.recipes.length, SHELF_MAX);
  assert.equal(ids(shelves[0].recipes)[0], 1);
});

test("recipe numbers are four digits", () => {
  assert.equal(recipeNo(7), "No. 0007");
  assert.equal(recipeNo(12345), "No. 12345");
});
