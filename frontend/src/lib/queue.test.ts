/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { captionTail, cleanTitle, formatDuration, rowState, serialNumbers } from "./queue.ts";

test("formatDuration", () => {
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(9), "0:09");
});

test("serialNumbers skips completing items", () => {
  assert.deepEqual(serialNumbers(["a", "b", "c", "d"], new Set(["b"])), [1, 0, 2, 3]);
  assert.deepEqual(serialNumbers(["a", "b"]), [1, 2]);
});

const base = { completing: false, hasThumbnail: false, hasMeta: false };

test("rowState flags skeletons only while downloading", () => {
  const s = rowState({ ...base, status: "in_progress" });
  assert.ok(s.isInProgress && s.showMetaSkeleton && s.showThumbnailSkeleton);
  const past = rowState({ ...base, status: "in_progress", step: "transcribing" });
  assert.ok(!past.showMetaSkeleton && !past.showThumbnailSkeleton);
  assert.ok(!rowState({ ...base, status: "pending" }).showMetaSkeleton);
});

test("rowState treats completing items as completed", () => {
  const s = rowState({ ...base, status: "in_progress", completing: true });
  assert.ok(s.isCompleted && !s.isInProgress);
  assert.ok(rowState({ ...base, status: "failed" }).isFailed);
});

test("captionTail keeps the newest words within the limit", () => {
  assert.equal(captionTail("short text"), "short text");
  const tail = captionTail("one two three four five", 12);
  assert.equal(tail, "four five");
  assert.ok(captionTail("x".repeat(500), 20).length <= 20);
});

test("cleanTitle drops trailing hashtags and keeps the rest", () => {
  assert.equal(cleanTitle("Creamy Sausage & Cabbage Soup #oldscoolkevmo..."), "Creamy Sausage & Cabbage Soup");
  assert.equal(cleanTitle("Soup   for  two #soup #easy   #dinner"), "Soup for two");
  assert.equal(cleanTitle("Top #1 pizza"), "Top #1 pizza");
  assert.equal(cleanTitle("Plain title"), "Plain title");
  assert.equal(cleanTitle("Pasta #レシピ"), "Pasta");
  assert.equal(cleanTitle("#fyp #food"), "#fyp #food");
});
