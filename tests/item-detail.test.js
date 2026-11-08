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


test("prefers item-detail grade over the compact equipment grade", async () => {
  const { getItemDetailSummary } = await import("../src/lib/item-detail.js");
  const summary = getItemDetailSummary({
    grade: "Epic",
    enchantLevel: 0,
    soulBindRate: 100,
    magicStoneSlotCount: null,
    godStoneSlotCount: null
  }, { grade: "Legend", enchantLevel: 3, exceedLevel: 2 });
  assert.equal(summary.grade, "Epic");
  assert.equal(summary.enchantLevel, 0);
  assert.equal(summary.exceedLevel, 2);
  assert.equal(summary.soulBindRate, 100);
});

test("keeps zero socket counts and does not invent missing binding data", async () => {
  const { getItemDetailSummary } = await import("../src/lib/item-detail.js");
  const summary = getItemDetailSummary({
    magicStoneSlotCount: 0,
    godStoneSlotCount: 0
  });
  assert.equal(summary.magicStoneSlotCount, 0);
  assert.equal(summary.godStoneSlotCount, 0);
  assert.equal(summary.soulBindRate, null);
});
