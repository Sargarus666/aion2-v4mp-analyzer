import test from "node:test";
import assert from "node:assert/strict";
import { compareItemDetails, formatItemStat } from "../src/lib/item-detail.js";

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
    grade: "Epic", enchantLevel: 0, soulBindRate: 100,
    magicStoneSlotCount: null, godStoneSlotCount: null
  }, { grade: "Legend", enchantLevel: 3, exceedLevel: 2 });
  assert.equal(summary.grade, "Epic");
  assert.equal(summary.enchantLevel, 0);
  assert.equal(summary.exceedLevel, 2);
  assert.equal(summary.soulBindRate, 100);
});
test("prefers the rarity grade field and exposes conflicting gradeName metadata", async () => {
  const { getItemDetailSummary } = await import("../src/lib/item-detail.js");
  const summary = getItemDetailSummary(
    { grade: "Legend", gradeName: "Epic", enchantLevel: 0 },
    { grade: "Legend", exceedLevel: 0 }
  );
  assert.equal(summary.grade, "Legend");
  assert.equal(summary.gradeName, "Epic");
  assert.equal(summary.gradeConflict, true);
  assert.deepEqual(summary.gradeConflictValues, [
    { source: "detail.grade", value: "Legend" },
    { source: "equipment.grade", value: "Legend" },
    { source: "detail.gradeName", value: "Epic" }
  ]);
});

test("uses gradeName only as a fallback when no rarity grade is available", async () => {
  const { getItemDetailSummary } = await import("../src/lib/item-detail.js");
  const summary = getItemDetailSummary({ gradeName: "Epic" });
  assert.equal(summary.grade, "Epic");
  assert.equal(summary.gradeConflict, false);
  assert.deepEqual(summary.gradeConflictValues, []);
});

test("keeps zero socket counts and does not invent missing binding data", async () => {
  const { getItemDetailSummary } = await import("../src/lib/item-detail.js");
  const summary = getItemDetailSummary({ magicStoneSlotCount: 0, godStoneSlotCount: 0 });
  assert.equal(summary.magicStoneSlotCount, 0);
  assert.equal(summary.godStoneSlotCount, 0);
  assert.equal(summary.soulBindRate, null);
});

test("compares same stat ids and returns raw numeric deltas without DPS weights", () => {
  const groups = compareItemDetails(
    { mainStats: [{ id: "Attack", name: "Attack", value: "223", extra: "76" }] },
    { mainStats: [{ id: "Attack", name: "Attack", value: "250", extra: "80" }] }
  );
  assert.deepEqual(groups[0].stats[0], {
    id: "attack", name: "Attack",
    currentValue: 223, candidateValue: 250, valueDelta: 27,
    currentExtra: 76, candidateExtra: 80, extraDelta: 4, status: "compared"
  });
});

test("keeps absent or non-numeric stats unknown instead of treating them as zero", () => {
  const groups = compareItemDetails(
    { subStats: [{ id: "Crit", name: "Critical Hit", value: "—" }] },
    { subStats: [{ id: "Crit", name: "Critical Hit", value: "80" }, { id: "Haste", name: "Attack Speed", value: "12" }] }
  );
  assert.equal(groups[0].stats.find(x => x.id === "crit").status, "unknown");
  assert.equal(groups[0].stats.find(x => x.id === "crit").valueDelta, null);
  assert.equal(groups[0].stats.find(x => x.id === "haste").status, "unknown");
  assert.equal(groups[0].stats.find(x => x.id === "haste").currentValue, null);
});

test("compares stones and skill bonuses as separate categories", () => {
  const groups = compareItemDetails(
    { magicStoneStat: [{ id: "AtkStone", name: "Attack Stone", value: "+12" }] },
    { magicStoneStat: [{ id: "AtkStone", name: "Attack Stone", value: "+15" }], subSkills: [{ id: "Deadshot", name: "Deadshot", value: "+1" }] }
  );
  assert.deepEqual(groups.map(x => x.key), ["magicStoneStat", "subSkills"]);
  assert.equal(groups[0].stats[0].valueDelta, 3);
  assert.equal(groups[1].stats[0].status, "unknown");
});
