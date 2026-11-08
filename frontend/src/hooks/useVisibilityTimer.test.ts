/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceTimers } from "./useVisibilityTimer";

test("advanceTimers counts down and returns expired ids", () => {
  const t = new Map([["a", 500], ["b", 250]]);
  assert.deepEqual(advanceTimers(t, 250), ["b"]);
  assert.deepEqual([...t], [["a", 250]]);
  assert.deepEqual(advanceTimers(t, 250), ["a"]);
  assert.equal(t.size, 0);
});
