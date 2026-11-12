import test from "node:test";
import assert from "node:assert/strict";
import { assessFarmTargetCandidate, rankFarmUpgradeCandidates } from "../src/lib/farm-targets.js";

const equipment = [
  { name: "Spiritforged Bow", slotPosName: "MainHand", enchantLevel: 11, exceedLevel: 0 },
  { name: "Spiritforged Guard", slotPosName: "SubHand", enchantLevel: 10, exceedLevel: 0 },
  { name: "Vakron Breastplate", slotPosName: "Torso", enchantLevel: 10, exceedLevel: 0 },
  { name: "Spectral Greaves", slotPosName: "Pants", enchantLevel: 10, exceedLevel: 0 },
  { name: "Vakron Helm", slotPosName: "Helmet", enchantLevel: 10, exceedLevel: 0 },
  { name: "Vakron Pauldrons", slotPosName: "Shoulder", enchantLevel: 10, exceedLevel: 0 },
  { name: "Vakron Gloves", slotPosName: "Gloves", enchantLevel: 10, exceedLevel: 0 },
  { name: "Vakron Boots", slotPosName: "Boots", enchantLevel: 10, exceedLevel: 0 },
  { name: "Vakron Cloak", slotPosName: "Cape", enchantLevel: 10, exceedLevel: 0 },
  { name: "Aulamus Necklace", slotPosName: "Necklace", enchantLevel: 10, exceedLevel: 0 },
  { name: "Aulamus Earrings", slotPosName: "Earring1", enchantLevel: 10, exceedLevel: 0 },
  { name: "Aulamus Earrings", slotPosName: "Earring2", enchantLevel: 10, exceedLevel: 0 },
  { name: "Aulamus Ring", slotPosName: "Ring1", enchantLevel: 10, exceedLevel: 0 },
  { name: "Aulamus Ring", slotPosName: "Ring2", enchantLevel: 10, exceedLevel: 0 }
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
    { name: "Unknown Bow", slotPosName: "MainHand", enchantLevel: 12, exceedLevel: 0 }
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

test("matches the live NCSOFT slot names for shoulders and paired accessories", () => {
  const rows = assessFarmTargetCandidate({
    baseLevel: 86,
    maxEnhance: 15,
    slots: ["Shoulders", "Earring", "Ring"]
  }, [
    { name: "Vakron Pauldrons", slotPosName: "Shoulder", enchantLevel: 10, exceedLevel: 0 },
    { name: "Aulamus Earrings", slotPosName: "Earring1", enchantLevel: 10, exceedLevel: 0 },
    { name: "Aulamus Earrings", slotPosName: "Earring2", enchantLevel: 10, exceedLevel: 0 },
    { name: "Aulamus Ring", slotPosName: "Ring1", enchantLevel: 10, exceedLevel: 0 },
    { name: "Aulamus Ring", slotPosName: "Ring2", enchantLevel: 10, exceedLevel: 0 }
  ]);

  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map(row => row.slotLabel), [
    "Наплечники", "Серьги 1", "Серьги 2", "Кольцо 1", "Кольцо 2"
  ]);
  assert.deepEqual(rows.map(row => row.status), [
    "candidate", "candidate", "candidate", "candidate", "candidate"
  ]);
  assert.deepEqual(rows.map(row => row.currentLevel), [80, 80, 80, 80, 80]);
});


test("recognizes every accessory slot exposed by the live NCSOFT payload", () => {
  const rows = assessFarmTargetCandidate({
    baseLevel: 86,
    maxEnhance: 15,
    slots: ["Belt", "Bracelet", "Rune", "Amulet"]
  }, [
    { name: "Unknown Belt", slotPosName: "Belt", enchantLevel: 0, exceedLevel: 0 },
    { name: "Unknown Bracelet", slotPosName: "Bracelet1", enchantLevel: 0, exceedLevel: 0 },
    { name: "Unknown Bracelet", slotPosName: "Bracelet2", enchantLevel: 0, exceedLevel: 0 },
    { name: "Unknown Rune", slotPosName: "Rune1", enchantLevel: 0, exceedLevel: 0 },
    { name: "Unknown Rune", slotPosName: "Rune2", enchantLevel: 0, exceedLevel: 0 },
    { name: "Unknown Amulet", slotPosName: "Amulet", enchantLevel: 0, exceedLevel: 0 }
  ]);
  assert.deepEqual(rows.map(row => row.slotLabel), [
    "Пояс", "Браслет 1", "Браслет 2", "Руна 1", "Руна 2", "Амулет"
  ]);
  assert.deepEqual(rows.map(row => row.status), Array(6).fill("unknown"));
  assert.deepEqual(rows.map(row => row.currentLevel), Array(6).fill(null));
});


test("ranks source-backed upgrades by current slot item-level gap and access gate", () => {
  const gear = [
    { name: "Spiritforged Bow", slotPosName: "MainHand", enchantLevel: 15, exceedLevel: 0 },
    { name: "Spiritforged Guard", slotPosName: "SubHand", enchantLevel: 14, exceedLevel: 0 },
    { name: "Vakron Breastplate", slotPosName: "Torso", enchantLevel: 10, exceedLevel: 0 },
    { name: "Nuakum Pauldrons", slotPosName: "Shoulder", enchantLevel: 12, exceedLevel: 0 },
    { name: "Aulamus Earrings", slotPosName: "Earring1", enchantLevel: 10, exceedLevel: 0 },
    { name: "Aulamus Earrings", slotPosName: "Earring2", enchantLevel: 10, exceedLevel: 0 },
    { name: "Ascension Bracelet", slotPosName: "Bracelet1", enchantLevel: 11, exceedLevel: 0 },
    { name: "Liberator Bracelet", slotPosName: "Bracelet2", enchantLevel: 10, exceedLevel: 0 }
  ];
  const targets = [
    { slot: "MainHand", name: "Enraged Kromede Longbow", itemLevel: 86, maxEnhance: 15, requiredItemLevel: 2100 },
    { slot: "SubHand", name: "Nuakum Guard", itemLevel: 86, maxEnhance: 15, requiredItemLevel: 2100 },
    { slot: "Torso", name: "Nuakum Breastplate", itemLevel: 86, maxEnhance: 15, requiredItemLevel: 2100 },
    { slot: "Earring", name: "Enraged Kromede Earrings", itemLevel: 86, maxEnhance: 15, requiredItemLevel: 2100 },
    { slot: "Bracelet", name: "Ludra's Bracelet", itemLevel: 86, maxEnhance: 15, requiredItemLevel: 2800 }
  ];
  const rows = rankFarmUpgradeCandidates(gear, targets, 2249);
  assert.equal(rows[0].slot, "SubHand");
  assert.equal(rows[0].currentLevel, 59);
  assert.equal(rows[0].baseGain, 27);
  assert.equal(rows[0].maxGain, 42);
  assert.equal(rows[1].slot, "MainHand");
  assert.equal(rows[1].currentLevel, 60);
  assert.equal(rows.find(row => row.slotLabel === "Серьги 2").currentLevel, 80);
  const bracelet = rows.find(row => row.slot === "Bracelet");
  assert.equal(bracelet.currentLevel, 62);
  assert.equal(bracelet.baseGain, 24);
  assert.equal(bracelet.availableNow, false);
  assert.equal(rows.some(row => row.slotLabel === "Браслет 2"), false);
});

test("ranks an already equipped target only as an enhancement, not a new drop", () => {
  const rows = rankFarmUpgradeCandidates(
    [{ name: "Nuakum Pauldrons", slotPosName: "Shoulder", enchantLevel: 12, exceedLevel: 0 }],
    [{ slot: "Shoulders", name: "Nuakum Pauldrons", itemLevel: 86, maxEnhance: 15, requiredItemLevel: 2100 }],
    2249
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "enhance");
  assert.equal(rows[0].currentLevel, 98);
  assert.equal(rows[0].baseGain, -12);
  assert.equal(rows[0].maxGain, 3);
});

test("does not invent a rank when the current item level is unknown", () => {
  const rows = rankFarmUpgradeCandidates(
    [{ name: "Liberator Bracelet", slotPosName: "Bracelet2", enchantLevel: 10, exceedLevel: 0 }],
    [{ slot: "Bracelet", name: "Ludra's Bracelet", itemLevel: 86, maxEnhance: 15, requiredItemLevel: 2800 }],
    2249
  );
  assert.deepEqual(rows, []);
});


test("does not treat absent or null exceed as zero in farm comparisons", () => {
  for (const exceedValue of ["missing", null]) {
    const item = { name: "Spiritforged Bow", slotPosName: "MainHand", enchantLevel: 11 };
    if (exceedValue !== "missing") item.exceedLevel = exceedValue;
    const rows = assessFarmTargetCandidate(
      { baseLevel: 86, maxEnhance: 15, slots: ["MainHand"] },
      [item]
    );
    assert.equal(rows[0].status, "unknown");
    assert.equal(rows[0].currentLevel, null);
    assert.match(rows[0].statusText, /Exceed неизвестен/);
  }
});

test("does not treat a missing enchant level as zero", () => {
  const rows = assessFarmTargetCandidate(
    { baseLevel: 86, maxEnhance: 15, slots: ["MainHand"] },
    [{ name: "Spiritforged Bow", slotPosName: "MainHand", exceedLevel: 0 }]
  );
  assert.equal(rows[0].status, "unknown");
  assert.equal(rows[0].currentLevel, null);
  assert.match(rows[0].statusText, /Заточка неизвестна/);
});

test("does not rank equipment when exceed is missing", () => {
  const rows = rankFarmUpgradeCandidates(
    [{ name: "Spiritforged Bow", slotPosName: "MainHand", enchantLevel: 15 }],
    [{ slot: "MainHand", name: "Enraged Kromede Longbow", itemLevel: 86, maxEnhance: 15 }],
    2249
  );
  assert.deepEqual(rows, []);
});

test("labels a lone second earring by its actual NCSOFT slot suffix", () => {
  const rows = assessFarmTargetCandidate(
    { baseLevel: 86, maxEnhance: 15, slots: ["Earring"] },
    [{ name: "Aulamus Earrings", slotPosName: "Earring2", enchantLevel: 10, exceedLevel: 0 }]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].slotLabel, "Серьги 2");
  assert.equal(rows[0].status, "candidate");
});
