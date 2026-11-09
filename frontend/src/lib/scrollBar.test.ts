import assert from "node:assert/strict";
import { test } from "node:test";
import { nextBar, type BarScroll } from "./scrollBar.ts";

const run = (ys: number[], s: BarScroll = { y: 0, travel: 0, hidden: false }) => ys.reduce((a, y) => nextBar(a, y, 68, 5000), s);

test("stays visible at the top and while within the bar height", () => assert.equal(run([0, 30, 68]).hidden, false));
test("hides after scrolling down past the bar", () => assert.equal(run([0, 100, 200]).hidden, true));
test("jitter under 8px does not reveal", () => assert.equal(run([0, 300, 296, 300, 295]).hidden, true));
test("reveals after 8px up, even far down the page", () => assert.equal(run([0, 3000, 2991]).hidden, false));
test("direction change resets accumulated travel", () => assert.equal(run([0, 3000, 2995, 3000, 2995]).hidden, true));
test("negative scrollY is clamped to the top", () => assert.deepEqual(run([-40]), { y: 0, travel: 0, hidden: false }));
test("overscroll past the bottom is clamped", () => {
  const a = run([0, 4000, 5000]);
  assert.equal(nextBar(nextBar(a, 5060, 68, 5000), 5000, 68, 5000).hidden, true);
});
test("a page shorter than the bar never hides", () => {
  const s = [0, 30, 50].reduce((a, y) => nextBar(a, y, 68, 40), { y: 0, travel: 0, hidden: false });
  assert.equal(s.hidden, false);
});
