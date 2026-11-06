import test from "node:test";
import assert from "node:assert/strict";
import { localizeGameText } from "../src/lib/game-localization.js";

test("translates Ranger skill names using Russian client terminology", () => {
  assert.equal(localizeGameText("Ranger"), "Стрелок");
  assert.equal(localizeGameText("Snipe"), "Меткий выстрел");
  assert.equal(localizeGameText("Deadshot"), "Прицельный выстрел");
  assert.equal(localizeGameText("Arrow Scattershot"), "Град из стрел");
  assert.equal(localizeGameText("Gale Arrow"), "Шквал стрел");
  assert.equal(localizeGameText("Vaizel's Authority"), "Сила Байзела");
  assert.equal(localizeGameText("Ranger"), "Стрелок");
});

test("translates terms inside longer item and dungeon labels", () => {
  assert.equal(localizeGameText("Enraged Kromede Longbow"), "Длинный лук разгневанной Кромед");
  assert.equal(localizeGameText("Fire Temple · Conquest"), "Храм Огня · Завоевание");
  assert.equal(localizeGameText("Arcana1"), "Аркана 1");
  assert.equal(localizeGameText("Daevanion"), "Даэванион");
  assert.equal(localizeGameText("Odyle Energy Cube"), "Куб энергии Од");
});

test("preserves unknown source names and handles empty values", () => {
  assert.equal(localizeGameText("Unlisted Item 204"), "Unlisted Item 204");
  assert.equal(localizeGameText(null), null);
  assert.equal(localizeGameText(""), "");
});
