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
  return {
    grade: first(detail?.gradeName, detail?.grade, item?.grade) ?? null,
    enchantLevel: first(detail?.enchantLevel, item?.enchantLevel) ?? null,
    exceedLevel: first(detail?.exceedLevel, item?.exceedLevel) ?? null,
    soulBindRate: first(detail?.soulBindRate, item?.soulBindRate) ?? null,
    magicStoneSlotCount: first(detail?.magicStoneSlotCount) ?? null,
    godStoneSlotCount: first(detail?.godStoneSlotCount) ?? null
  };
}
