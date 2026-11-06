import test from "node:test";
import assert from "node:assert/strict";
import { mergeProfileSnapshot } from "../src/lib/profile-state.js";

test("preserves the last successful profile sections when the info endpoint is partial", () => {
  const previous = {
    profile: { name: "v4mp" },
    stat: { statList: [{ name: "ItemLevel", value: 2212 }] },
    daevanion: { boardList: [{ id: 31, openPercent: 59 }] },
    equipment: { equipmentList: [{ name: "Spiritforged Bow" }] },
    skill: { skillList: [{ name: "Snipe", skillLevel: 16 }] },
    _lastCompleteAt: "2026-11-06T07:00:00.000Z"
  };
  const next = {
    profile: {}, stat: {}, daevanion: {},
    equipment: { equipmentList: [{ name: "New Bow" }] },
    skill: { skillList: [{ name: "Snipe", skillLevel: 17 }] }
  };
  const merged = mergeProfileSnapshot(previous, next, ["info"], ["Профиль и статы: timeout"], "2026-11-06T08:00:00.000Z");

  assert.deepEqual(merged.profile, previous.profile);
  assert.deepEqual(merged.stat, previous.stat);
  assert.deepEqual(merged.daevanion, previous.daevanion);
  assert.equal(merged.equipment.equipmentList[0].name, "New Bow");
  assert.equal(merged.skill.skillList[0].skillLevel, 17);
  assert.deepEqual(merged._staleSections, ["profile", "stat", "daevanion"]);
  assert.equal(merged._lastCompleteAt, previous._lastCompleteAt);
  assert.equal(merged._partial, true);
});

test("preserves gear, skills and arcana when the equipment endpoint is partial", () => {
  const previous = {
    equipment: { equipmentList: [{ name: "Spiritforged Bow" }], skinList: [] },
    skill: { skillList: [{ name: "Snipe", skillLevel: 16 }] },
    arcana: [{ name: "Chalice of Vigor" }],
    petwing: { wing: { name: "Daeva Wings" } },
    profile: { name: "v4mp" }
  };
  const merged = mergeProfileSnapshot(previous, {
    profile: { name: "v4mp", combatPower: 90000 },
    stat: { statList: [] },
    equipment: {}, skill: {}, arcana: [], petwing: {}
  }, ["equipment"], ["Экипировка и навыки: timeout"], "2026-11-06T08:00:00.000Z");

  assert.deepEqual(merged.equipment, previous.equipment);
  assert.deepEqual(merged.skill, previous.skill);
  assert.deepEqual(merged.arcana, previous.arcana);
  assert.deepEqual(merged.petwing, previous.petwing);
  assert.deepEqual(merged._staleSections, ["equipment", "skill", "arcana", "petwing"]);
  assert.equal(merged.profile.combatPower, 90000);
});

test("a complete response replaces stale data and clears stale markers", () => {
  const previous = {
    profile: { name: "v4mp" },
    equipment: { equipmentList: [{ name: "Old Bow" }] },
    _staleSections: ["equipment"],
    _lastCompleteAt: "2026-11-06T07:00:00.000Z"
  };
  const fetchedAt = "2026-11-06T08:00:00.000Z";
  const merged = mergeProfileSnapshot(previous, {
    profile: { name: "v4mp" },
    equipment: { equipmentList: [{ name: "New Bow" }] }
  }, [], [], fetchedAt);

  assert.equal(merged.equipment.equipmentList[0].name, "New Bow");
  assert.deepEqual(merged._staleSections, []);
  assert.equal(merged._partial, false);
  assert.equal(merged._lastCompleteAt, fetchedAt);
});

test("does not invent a previous snapshot on the first partial response", () => {
  const merged = mergeProfileSnapshot(null, {
    profile: {}, equipment: { equipmentList: [{ name: "Bow" }] }
  }, ["info"], ["Профиль и статы: timeout"], "2026-11-06T08:00:00.000Z");

  assert.equal(merged.equipment.equipmentList[0].name, "Bow");
  assert.deepEqual(merged._staleSections, []);
  assert.equal(merged._partial, true);
  assert.equal(merged._lastCompleteAt, null);
});
