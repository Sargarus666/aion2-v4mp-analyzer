export function formatItemStat(stat) {
  if (!stat || typeof stat !== "object") return "";
  const value = stat.value;
  const minValue = stat.minValue;
  const primary = value ?? minValue;
  let result = primary == null ? "" : String(primary);
  if (minValue != null && value != null && String(minValue) !== String(value)) {
    result = String(minValue) + "–" + String(value);
  }
  if (stat.extra != null && stat.extra !== "" && Number(stat.extra) !== 0) {
    const extra = String(stat.extra);
    result += " (" + (Number(stat.extra) > 0 && !extra.startsWith("+") ? "+" : "") + extra + ")";
  }
  if (stat.exceed === true || stat.exceed === 1) result += " · Превышение";
  return result;
}

export function getItemDetailSummary(detail, item = {}) {
  const first = (...values) => values.find(value => value !== undefined && value !== null && value !== "");
  const gradeValues = [
    { source: "detail.grade", value: detail?.grade },
    { source: "equipment.grade", value: item?.grade },
    { source: "detail.gradeName", value: detail?.gradeName }
  ].filter(entry => entry.value != null && entry.value !== "");
  const distinctGrades = new Set(gradeValues.map(entry => String(entry.value).trim().toLowerCase()));
  const gradeConflict = distinctGrades.size > 1;
  const hasOwn = (object, key) => object != null && Object.prototype.hasOwnProperty.call(object, key);
  // An explicit null from item detail means "not supplied", not zero and not
  // permission to silently fall back to the compact profile value.
  const resolveDetailField = key => {
    if (hasOwn(detail, key)) return detail[key] === "" ? null : detail[key];
    const fallback = first(item?.[key]);
    return fallback ?? null;
  };
  const detailHasExceed = hasOwn(detail, "exceedLevel");
  const equipmentHasExceed = hasOwn(item, "exceedLevel") && item.exceedLevel !== undefined;
  const detailExceed = detailHasExceed ? (detail.exceedLevel === "" ? null : detail.exceedLevel) : undefined;
  const equipmentExceed = equipmentHasExceed ? (item.exceedLevel === "" ? null : item.exceedLevel) : undefined;
  const exceedLevel = resolveDetailField("exceedLevel");
  const exceedConflict = detailHasExceed && equipmentHasExceed &&
    String(detailExceed) !== String(equipmentExceed);
  const exceedEvidence = [
    ...(detailHasExceed ? [{ source: "detail", value: detailExceed }] : []),
    ...(equipmentHasExceed ? [{ source: "equipment", value: equipmentExceed }] : [])
  ];
  return {
    // The compact profile and the detail response both identify rarity as
    // "grade". Keep gradeName as a separate field and flag disagreements
    // rather than silently allowing it to override the equipped item's grade.
    grade: first(detail?.grade, item?.grade, detail?.gradeName) ?? null,
    gradeName: first(detail?.gradeName) ?? null,
    gradeConflict,
    gradeConflictValues: gradeConflict ? gradeValues : [],
    enchantLevel: resolveDetailField("enchantLevel"),
    exceedLevel,
    exceedKnown: exceedLevel != null,
    exceedConflict,
    exceedEvidence,
    soulBindRate: resolveDetailField("soulBindRate"),
    magicStoneSlotCount: resolveDetailField("magicStoneSlotCount"),
    godStoneSlotCount: resolveDetailField("godStoneSlotCount")
  };
}

const COMPARISON_GROUPS = [
  ["mainStats", "Основные характеристики"],
  ["subStats", "Дополнительные характеристики"],
  ["magicStoneStat", "Камни"],
  ["godStoneStat", "Божественные камни"],
  ["subSkills", "Бонусы навыков"]
];

function numericStatValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/,/g, "");
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function statMap(entries) {
  const result = new Map();
  for (const stat of Array.isArray(entries) ? entries : []) {
    if (!stat || typeof stat !== "object") continue;
    const name = String(stat.name ?? stat.desc ?? stat.id ?? "").trim();
    const id = String(stat.id ?? name).trim().toLowerCase();
    if (!name || !id) continue;
    result.set(id, { name, value: numericStatValue(stat.value), extra: numericStatValue(stat.extra), raw: stat });
  }
  return result;
}

/**
 * Compares only like-for-like NCSOFT fields. Missing or non-numeric values stay
 * unknown; they are never treated as zero and no DPS/stat weights are applied.
 */
export function compareItemDetails(current, candidate) {
  return COMPARISON_GROUPS.map(([key, label]) => {
    const left = statMap(current?.[key]);
    const right = statMap(candidate?.[key]);
    const ids = new Set([...left.keys(), ...right.keys()]);
    const stats = [...ids].map(id => {
      const a = left.get(id) ?? null;
      const b = right.get(id) ?? null;
      return {
        id,
        name: b?.name ?? a?.name ?? id,
        currentValue: a?.value ?? null,
        candidateValue: b?.value ?? null,
        valueDelta: a?.value != null && b?.value != null ? b.value - a.value : null,
        currentExtra: a?.extra ?? null,
        candidateExtra: b?.extra ?? null,
        extraDelta: a?.extra != null && b?.extra != null ? b.extra - a.extra : null,
        status: !a || !b ? "unknown" : a.value == null || b.value == null ? "unknown" : "compared"
      };
    }).filter(stat => stat.currentValue != null || stat.candidateValue != null || stat.currentExtra != null || stat.candidateExtra != null);
    return { key, label, stats };
  }).filter(group => group.stats.length > 0);
}
