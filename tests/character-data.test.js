import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProfileResponse,
  normalizeStatEntries,
  hasUsefulProfileData,
  buildRelevantStatSections
} from "../src/lib/character-data.js";

test("normalizes primary and secondary stat groups without dropping values", () => {
  const result = normalizeStatEntries({
    statList: [{ name: "Attack", value: 1200, icon: "/attack.png" }, { type: "Accuracy", statValue: 350 }],
    statSecondList: [{ statName: "Critical Damage", displayValue: "18%" }],
    statAdditionalList: [42]
  });

  assert.equal(result.length, 4);
  assert.deepEqual(result.map(x => x.group), ["Основные", "Основные", "Доп. бонусы", "Дополнительные"]);
  assert.equal(result[0].name, "Attack");
  assert.equal(result[0].value, 1200);
  assert.equal(result[0].icon, "/attack.png");
  assert.equal(result[1].name, "Accuracy");
  assert.equal(result[1].value, 350);
  assert.equal(result[2].name, "Critical Damage");
  assert.equal(result[2].value, "18%");
  assert.equal(result[3].value, 42);
});

test("supports nested NCSOFT info and equipment payloads", () => {
  const data = normalizeProfileResponse(
    {
      data: {
        profile: { name: "v4mp", combatPower: 100000 },
        stat: { statList: [{ name: "ItemLevel", value: 2200 }] },
        daevanion: { boardList: [{ name: "Board A" }] }
      }
    },
    {
      data: {
        equipment: { equipmentList: [{ name: "Bow" }] },
        skill: { skillList: [{ name: "Deadshot", skillLevel: 20 }] }
      }
    }
  );

  assert.equal(data.profile.name, "v4mp");
  assert.equal(data.profile.combatPower, 100000);
  assert.equal(data.stat.statList[0].value, 2200);
  assert.equal(data.equipment.equipmentList[0].name, "Bow");
  assert.equal(data.skill.skillList[0].name, "Deadshot");
  assert.equal(data.daevanion.boardList.length, 1);
  assert.equal(hasUsefulProfileData(data), true);
});

test("supports flat gear payloads and empty/missing fields", () => {
  const data = normalizeProfileResponse(
    { character: { name: "v4mp" }, stat: { statSecondList: [{ name: "Bonus", value: 1 }] } },
    { data: { equipmentList: [{ name: "Bow" }], skillList: [{ name: "Snipe" }] } }
  );

  assert.equal(data.profile.name, "v4mp");
  assert.equal(data.equipment.equipmentList.length, 1);
  assert.equal(data.skill.skillList.length, 1);
  assert.equal(normalizeStatEntries(data.stat).length, 1);
  assert.equal(hasUsefulProfileData(normalizeProfileResponse({}, {})), false);
});

test("does not mistake arrays or primitives for profile objects", () => {
  const data = normalizeProfileResponse({ profile: [], stat: "invalid" }, { data: [] });
  assert.deepEqual(data.profile, {});
  assert.deepEqual(data.stat, {});
  assert.deepEqual(data.equipment, {});
  assert.equal(hasUsefulProfileData(data), false);
});

test("preserves equipped Arcana slots when the source exposes them", () => {
  const data = normalizeProfileResponse(
    { profile: { name: "v4mp" } },
    { data: { equipmentList: [], arcanaList: [{ slotPosName: "Arcana1", name: "Chalice of Magic" }] } }
  );

  assert.equal(data.arcana.length, 1);
  assert.equal(data.arcana[0].slotPosName, "Arcana1");
  assert.equal(data.arcana[0].name, "Chalice of Magic");
});


test("builds Ranger offense, defense and utility sections from actual API values", () => {
  const sections = buildRelevantStatSections([
    { name: "Combat Speed", value: "12%" },
    { name: "Critical Hit", value: 1450 },
    { name: "Critical Damage Boost", value: "24%" },
    { name: "Accuracy", value: 1320 },
    { name: "HP", value: 25000 },
    { name: "Evasion", value: 420 },
    { name: "PvE Damage Tolerance", value: "8%" },
    { name: "MP Regen", value: 30 }
  ]);

  assert.deepEqual(sections.map(x => x.id), ["offense", "defense", "utility"]);
  const offense = sections.find(x => x.id === "offense");
  assert.equal(offense.stats.find(x => x.id === "combatSpeed").value, "12%");
  assert.equal(offense.stats.find(x => x.id === "criticalHit").value, 1450);
  assert.equal(offense.stats.find(x => x.id === "accuracy").available, true);
  assert.equal(offense.stats.find(x => x.id === "attack").available, false);

  const defense = sections.find(x => x.id === "defense");
  assert.equal(defense.stats.find(x => x.id === "hp").value, 25000);
  assert.equal(defense.stats.find(x => x.id === "damageTolerance").value, "8%");

  const utility = sections.find(x => x.id === "utility");
  assert.equal(utility.stats.find(x => x.id === "mpRegen").value, 30);
});

test("does not fabricate missing Ranger stats or match unrelated stat names", () => {
  const sections = buildRelevantStatSections([
    { name: "Critical Hit Resist", value: 100 },
    { name: "Back Attack Damage", value: "9%" }
  ]);
  const offense = sections.find(x => x.id === "offense");
  const defense = sections.find(x => x.id === "defense");
  assert.equal(offense.stats.find(x => x.id === "combatSpeed").available, false);
  assert.equal(offense.stats.find(x => x.id === "criticalHit").available, false);
  assert.equal(defense.stats.find(x => x.id === "criticalResist").value, 100);
  assert.equal(defense.stats.find(x => x.id === "hp").available, false);
});


test("keeps real API stats visible when their names are not mapped yet", () => {
  const sections = buildRelevantStatSections([
    { statTypeName: "Combat Speed", statValue: "7%" },
    { statType: "UnknownStat_42", statValue: 321, statId: 42 }
  ]);
  const offense = sections.find(x => x.id === "offense");
  assert.equal(offense.stats.find(x => x.id === "combatSpeed").value, "7%");
  const other = sections.find(x => x.id === "other");
  assert.ok(other);
  assert.equal(other.stats[0].label, "UnknownStat_42");
  assert.equal(other.stats[0].value, 321);
});

test("parses the documented live NCSOFT stat entry shape", () => {
  const normalized = normalizeStatEntries({
    statList: [
      { name: "Might", type: "Might", value: 123, statSecondList: ["Attack +12"] },
      { name: "Item Level", type: "ItemLevel", value: 2111, statSecondList: [] }
    ]
  });
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].name, "Might");
  assert.equal(normalized[0].type, "Might");
  assert.equal(normalized[0].value, 123);
  assert.deepEqual(normalized[0].statSecondList, ["Attack +12"]);
  assert.equal(normalized[1].value, 2111);
});


test("shows only stats actually returned by NCSOFT and omits unavailable placeholders", () => {
  const sections = buildRelevantStatSections([
    { name: "Combat Speed", value: "7%" },
    { name: "Critical Hit Resist", value: 100 }
  ]);
  assert.deepEqual(sections.map(section => section.id), ["offense", "defense"]);
  assert.deepEqual(sections.flatMap(section => section.stats.map(stat => stat.id)), ["combatSpeed", "criticalResist"]);
  assert.ok(sections.every(section => section.stats.every(stat => stat.available && stat.value != null)));
});

test("does not display empty or dash-valued API stat entries", () => {
  const sections = buildRelevantStatSections([
    { name: "Attack", value: "" },
    { name: "Accuracy", value: "—" },
    { name: "HP", value: 25000 }
  ]);
  assert.deepEqual(sections.map(section => section.id), ["defense"]);
  assert.deepEqual(sections[0].stats.map(stat => stat.id), ["hp"]);
});
