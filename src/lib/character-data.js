export const asArray = value => Array.isArray(value) ? value : [];

const firstObject = (...values) => values.find(
  value => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0
) || {};

export function normalizeStatEntries(stat = {}) {
  const groups = [
    ["statList", "Основные"],
    ["statSecondList", "Доп. бонусы"],
    ["statAdditionalList", "Дополнительные"]
  ];

  return groups.flatMap(([key, group]) => asArray(stat?.[key]).map((entry, index) => {
    if (typeof entry === "string" || typeof entry === "number") {
      return {
        name: group === "Доп. бонусы" ? "Бонус " + (index + 1) : "Характеристика",
        value: entry,
        group
      };
    }

    const item = entry && typeof entry === "object" ? entry : {};
    const name = item.name ?? item.statName ?? item.displayName ?? item.type ?? item.key;
    const value = item.value ?? item.statValue ?? item.displayValue ?? item.description ?? item.text;
    return {
      ...item,
      name: name || (group === "Доп. бонусы" ? "Доп. бонус" : "Характеристика"),
      value: value ?? "—",
      group
    };
  }));
}

export function normalizeProfileResponse(info = {}, gear = {}) {
  const infoData = info?.data && typeof info.data === "object" && !Array.isArray(info.data) ? info.data : {};
  const gearData = gear?.data && typeof gear.data === "object" && !Array.isArray(gear.data) ? gear.data : {};
  const character = firstObject(info?.character, infoData?.character);
  const profile = firstObject(info?.profile, infoData?.profile, character?.profile, character);
  const stat = firstObject(info?.stat, infoData?.stat, character?.stat, profile?.stat);
  const equipment = firstObject(gear?.equipment, gearData?.equipment, gearData?.equipmentList ? gearData : null, gear?.equipmentList ? gear : null);
  const skill = firstObject(gear?.skill, gearData?.skill, gearData?.skillList ? gearData : null, gear?.skillList ? gear : null);
  const arcana = asArray(gearData?.arcanaList).length ? asArray(gearData.arcanaList)
    : asArray(gearData?.arcana).length ? asArray(gearData.arcana)
    : asArray(gear?.arcanaList).length ? asArray(gear.arcanaList)
    : asArray(equipment?.arcanaList);
  const daevanion = firstObject(info?.daevanion, infoData?.daevanion, character?.daevanion, profile?.daevanion);

  return {
    profile,
    stat,
    daevanion,
    equipment,
    skill,
    arcana,
    title: firstObject(info?.title, infoData?.title),
    ranking: firstObject(info?.ranking, infoData?.ranking)
  };
}

export function hasUsefulProfileData(data = {}) {
  const stats = normalizeStatEntries(data.stat);
  const equipment = asArray(data.equipment?.equipmentList);
  const skills = asArray(data.skill?.skillList);
  const boards = asArray(data.daevanion?.boardList);
  const profile = data.profile || {};
  return Boolean(
    profile.name || profile.characterName || profile.character_name ||
    profile.combatPower != null || profile.combat_power != null ||
    stats.length || equipment.length || skills.length || boards.length
  );
}
