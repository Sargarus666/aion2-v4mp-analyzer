import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

test("React UI does not introduce raw HTML or dynamic-code sinks", () => {
  assert.equal(app.includes("dangerouslySetInnerHTML"), false);
  assert.equal(app.includes(".innerHTML"), false);
  assert.equal(app.includes("document.write"), false);
  assert.equal(app.includes("eval("), false);
  assert.equal(app.includes("new Function("), false);
});

test("every new-tab anchor opts out of opener access", () => {
  const anchors = [...app.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gs)].map(match => match[0]);
  assert.ok(anchors.length > 0, "expected external links to audit");
  for (const anchor of anchors) assert.match(anchor, /\brel="noreferrer"/);
});
