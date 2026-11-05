import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProfileResponse,
  normalizeStatEntries,
  hasUsefulProfileData
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
