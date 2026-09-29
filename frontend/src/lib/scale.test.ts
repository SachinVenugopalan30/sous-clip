/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { scaleQuantity } from "./scale.ts";

const cases: [string | null, number, string | null][] = [
  ["0.5", 0.5, "¼"],
  ["⅓", 3, "1"], // not "3/3"
  ["1 1/2", 2, "3"],
  ["1/3", 2, "⅔"],
  ["½", 5, "2½"],
  ["1½", 2, "3"],
  ["400", 1.5, "600"],
  ["1", 0.7, "0.7"], // not close to any common fraction
  ["pinch", 2, "pinch"],
  ["1-2", 2, "1-2"],
  [null, 2, null],
  ["0.3", 1, "0.3"], // factor 1 leaves the original text alone
];

for (const [quantity, factor, expected] of cases) {
  test(`${quantity} × ${factor} → ${expected}`, () => {
    assert.equal(scaleQuantity(quantity, factor), expected);
  });
}
