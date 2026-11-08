import { parseOptionalNumber } from "./character-data.js";

const CURRENT_ITEM_BASE_LEVELS = {
  "Spiritforged Bow": 45,
  "Spiritforged Guard": 45,
  "Vakron Breastplate": 70,
  "Spectral Greaves": 41,
  "Vakron Helm": 70,
  "Vakron Pauldrons": 70,
  "Vakron Gloves": 70,
  "Vakron Boots": 70,
  "Vakron Cloak": 70,
  "Aulamus Necklace": 70,
  "Aulamus Earrings": 70,
  "Aulamus Ring": 70
};

const SLOT_ALIASES = {
  Shoulders: ["Shoulder"],
  Earring: ["Earring1", "Earring2"],
  Ring: ["Ring1", "Ring2"],
  Bracelet: ["Bracelet1", "Bracelet2"],
  Rune: ["Rune1", "Rune2"]
};

const SLOT_LABELS = {
  MainHand: "Лук",
  SubHand: "Guard",
  Torso: "Нагрудник",
  Pants: "Поножи",
  Helmet: "Шлем",
  Shoulders: "Наплечники",
  Gloves: "Перчатки",
  Boots: "Сапоги",
  Cape: "Плащ",
  Necklace: "Ожерелье",
  Earring: "Серьги",
  Ring: "Кольцо",
  Belt: "Пояс",
  Bracelet: "Браслет",
  Rune: "Руна",
  Amulet: "Амулет"
};

function readField(value, key) {
  if (!value || typeof value !== "object") return undefined;
  const normalize = text => String(text).toLowerCase().replace(/[\s_-]/g, "");
  const actualKey = Object.keys(value).find(candidate => normalize(candidate) === normalize(key));
  return actualKey ? value[actualKey] : undefined;
}

function matchesSlot(item, slot) {
  const current = readField(item, "slotPosName");
  if (current == null) return false;
  const normalize = value => String(value).toLowerCase().replaceAll(" ", "").replaceAll("_", "").replaceAll("-", "");
  return [slot, ...(SLOT_ALIASES[slot] || [])]
    .some(candidate => normalize(candidate) === normalize(current));
}

function currentItemLevel(item) {
  const name = readField(item, "name");
  const apiLevel = parseOptionalNumber(readField(item, "itemLevel"));
  const baseLevel = apiLevel ?? CURRENT_ITEM_BASE_LEVELS[name];
  if (baseLevel == null) return null;
  const enchant = parseOptionalNumber(readField(item, "enchantLevel")) ?? 0;
  const exceed = parseOptionalNumber(readField(item, "exceedLevel")) ?? 0;
  // The observed public equipment payload exposes exceedLevel, but the
  // current item-level comparison model does not include its contribution.
  // Refuse to rank this item rather than silently undercounting it.
  if (exceed > 0) return null;
  return { level: baseLevel + enchant, baseLevel, enchant, name: String(name || "Предмет") };
}

export function assessFarmTargetCandidate(candidate, equipment = []) {
  if (!candidate || !Array.isArray(candidate.slots) || !candidate.slots.length) return [];
  const targetBase = parseOptionalNumber(candidate.baseLevel);
  const maxEnhance = parseOptionalNumber(candidate.maxEnhance);
  if (targetBase == null || maxEnhance == null) return [];
  const targetMax = targetBase + maxEnhance;
  const rows = [];

  for (const slot of candidate.slots) {
    const matches = equipment.filter(item => matchesSlot(item, slot));
    if (!matches.length) {
      rows.push({
        slot,
        slotLabel: SLOT_LABELS[slot] || slot,
        currentName: null,
        currentLevel: null,
        enchantLevel: null,
        status: "unknown",
        statusText: "Текущий предмет не найден — сравнение не выполнялось."
      });
      continue;
    }

    matches.forEach((item, index) => {
      const current = currentItemLevel(item);
      let status = "unknown";
      let statusText = "Базовый iLvl текущего предмета не подтверждён — сравни вручную.";
      const exceed = parseOptionalNumber(readField(item, "exceedLevel")) ?? 0;
      if (current) {
        if (current.level > targetMax) {
          status = "skip";
          statusText = `Не фармить: текущий iLvl ${current.level} выше максимума ${targetMax}.`;
        } else if (current.level === targetMax) {
          status = "same";
          statusText = `Тот же потолок iLvl ${targetMax}; только если Soul Binding или гнёзда лучше.`;
        } else {
          status = "candidate";
          const neededEnhance = Math.max(0, current.level - targetBase);
          statusText = current.level < targetBase
            ? `Кандидат: базовый iLvl цели ${targetBase} выше текущего ${current.level}.`
            : `Кандидат после +${neededEnhance}: цель может сравняться с текущим iLvl ${current.level} (максимум ${targetMax}).`;
        }
      } else if (exceed > 0) {
        statusText = `Не сравнивать автоматически: превышение +${exceed} не включено в модель iLvl; проверь предмет вручную.`;
      }
      rows.push({
        slot,
        slotLabel: matches.length > 1 ? `${SLOT_LABELS[slot] || slot} ${index + 1}` : (SLOT_LABELS[slot] || slot),
        currentName: current?.name || String(readField(item, "name") || "Предмет"),
        currentLevel: current?.level ?? null,
        enchantLevel: current?.enchant ?? parseOptionalNumber(readField(item, "enchantLevel")),
        status,
        statusText
      });
    });
  }
  return rows;
}
