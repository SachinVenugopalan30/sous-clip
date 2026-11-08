/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { exportFilename } from "./export.ts";

test("exportFilename slugs the title", () => {
  assert.equal(exportFilename("Mom's Best Pasta!", "md"), "mom-s-best-pasta-.md");
  assert.equal(exportFilename("Tacos", "txt"), "tacos.txt");
});
