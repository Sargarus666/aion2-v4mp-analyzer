import test from "node:test";
import assert from "node:assert/strict";
import { assessFarmTargetCandidate } from "../src/lib/farm-targets.js";

const equipment = [
  { name: "Spiritforged Bow", slotPosName: "MainHand", enchantLevel: 11 },
  { name: "Spiritforged Guard", slotPosName: "SubHand", enchantLevel: 10 },
  { name: "Vakron Breastplate", slotPosName: "Torso", enchantLevel: 10 },
  { name: "Spectral Greaves", slotPosName: "Pants", enchantLevel: 10 },
  { name: "Vakron Helm", slotPosName: "Helmet", enchantLevel: 10 },
  { name: "Vakron Pauldrons", slotPosName: "Shoulders", enchantLevel: 10 },
  { name: "Vakron Gloves", slotPosName: "Gloves", enchantLevel: 10 },
  { name: "Vakron Boots", slotPosName: "Boots", enchantLevel: 10 },
  { name: "Vakron Cloak", slotPosName: "Cape", enchantLevel: 10 },
  { name: "Aulamus Necklace", slotPosName: "Necklace", enchantLevel: 10 },
  { name: "Aulamus Earrings", slotPosName: "Earring", enchantLevel: 10 },
  { name: "Aulamus Earrings", slotPosName: "Earring", enchantLevel: 10 },
  { name: "Aulamus Ring", slotPosName: "Ring", enchantLevel: 10 },
  { name: "Aulamus Ring", slotPosName: "Ring", enchantLevel: 10 }
];

test("filters a lower bow candidate and keeps the higher unique bow as a real target", () => {
  const lower = assessFarmTargetCandidate({ baseLevel: 45, maxEnhance: 10, slots: ["MainHand"] }, equipment);
  const higher = assessFarmTargetCandidate({ baseLevel: 86, maxEnhance: 15, slots: ["MainHand"] }, equipment);
  assert.equal(lower[0].currentLevel, 56);
  assert.equal(lower[0].status, "skip");
  assert.equal(higher[0].status, "candidate");
});

test("compares armor per slot instead of treating a mixed set as one number", () => {
  const rows = assessFarmTargetCandidate({
    baseLevel: 45,
    maxEnhance: 10,
    slots: ["Torso", "Pants", "Helmet", "Shoulders", "Gloves", "Boots", "Cape"]
  }, equipment);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.map(row => row.status), ["skip", "candidate", "skip", "skip", "skip", "skip", "skip"]);
  assert.equal(rows[1].currentLevel, 51);
  assert.match(rows[1].statusText, /после \+6/);
});

test("does not invent a comparison for an unrecognised current item", () => {
  const rows = assessFarmTargetCandidate({ baseLevel: 86, maxEnhance: 15, slots: ["MainHand"] }, [
    { name: "Unknown Bow", slotPosName: "MainHand", enchantLevel: 12 }
  ]);
  assert.equal(rows[0].status, "unknown");
  assert.equal(rows[0].currentLevel, null);
});

test("recognises a same-level guard as a sidegrade, not a guaranteed upgrade", () => {
  const rows = assessFarmTargetCandidate({ baseLevel: 45, maxEnhance: 10, slots: ["SubHand"] }, equipment);
  assert.equal(rows[0].currentLevel, 55);
  assert.equal(rows[0].status, "same");
  assert.match(rows[0].statusText, /только если Soul Binding/);
});
test("does not rank an item with exceed until its item-level contribution is modelled", () => {
  const rows = assessFarmTargetCandidate({ baseLevel: 86, maxEnhance: 15, slots: ["MainHand"] }, [
    { name: "Spiritforged Bow", slotPosName: "MainHand", enchantLevel: 11, exceedLevel: 1 }
  ]);
  assert.equal(rows[0].status, "unknown");
  assert.equal(rows[0].currentLevel, null);
  assert.match(rows[0].statusText, /превышение \+1 не включено в модель iLvl/);
});
