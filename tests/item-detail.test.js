import test from "node:test";
import assert from "node:assert/strict";
import { formatItemStat } from "../src/lib/item-detail.js";

test("formats a base range and additional item enhancement value", () => {
  assert.equal(formatItemStat({ minValue: 177, value: 223, extra: 55 }), "177–223 (+55)");
});
test("does not repeat identical min and final values", () => {
  assert.equal(formatItemStat({ minValue: 15, value: 15 }), "15");
});
test("preserves negative extras and exceed marker", () => {
  assert.equal(formatItemStat({ value: 80, extra: -4, exceed: true }), "80 (-4) · Превышение");
});
test("returns empty text for missing or non-object stats", () => {
  assert.equal(formatItemStat(null), "");
  assert.equal(formatItemStat("80"), "");
});
