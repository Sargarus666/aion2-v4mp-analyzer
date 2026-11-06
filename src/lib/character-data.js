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
    const name = item.name ?? item.statName ?? item.displayName ?? item.statTypeName ??
      item.typeName ?? item.label ?? item.title ?? item.statType ?? item.type ??
      item.key ?? item.statCode ?? item.statId ?? item.id;
    const value = item.value ?? item.statValue ?? item.displayValue ?? item.currentValue ??
      item.totalValue ?? item.baseValue ?? item.amount ?? item.description ?? item.text;

    return {
      ...item,
      name: name ?? (group === "Доп. бонусы" ? "Доп. бонус " + (index + 1) : "Параметр " + (index + 1)),
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
  const arcana = asArray(data.arcana);
  const profile = data.profile || {};
  return Boolean(
    profile.name || profile.characterName || profile.character_name ||
    profile.combatPower != null || profile.combat_power != null ||
    stats.length || equipment.length || skills.length || boards.length || arcana.length
  );
}


const RELEVANT_STAT_GROUPS = [
  {
    id: "offense",
    title: "Атака и DPS",
    description: "Параметры, которые влияют на урон Стрелка по боссам.",
    stats: [
      ["attack", "Атака", ["attack", "basic attack", "pve attack", "boss attack", "атака"], "Базовая сила атак."],
      ["combatSpeed", "Скорость боя", ["combat speed", "attack speed", "скорость атаки", "скорость боя"], "Ускоряет атаки и применение умений."],
      ["criticalHit", "Критический удар", ["critical hit", "crit rate", "critical rate", "критический удар", "крит шанс"], "Повышает шанс критического попадания."],
      ["criticalDamage", "Крит. урон", ["critical damage boost", "critical damage", "crit damage", "критический урон", "усиление критического урона"], "Увеличивает урон критических попаданий."],
      ["accuracy", "Точность", ["accuracy", "pve accuracy", "boss accuracy", "точность"], "Снижает риск промахов и блокирования атак."],
      ["weaponDamage", "Урон оружием", ["weapon damage boost", "weapon damage", "усиление урона оружием"], "Усиливает урон от оружия."],
      ["damageBoost", "Усиление урона", ["pve damage boost", "boss damage boost", "damage boost", "урон по монстрам", "усиление урона"], "Увеличивает наносимый урон; учитывай сопротивление цели."],
      ["multiHit", "Множественное попадание", ["multi-hit chance", "multi hit chance", "multi-hit", "мультиудар", "шанс множественного попадания"], "Даёт шанс дополнительных попаданий."],
      ["penetration", "Пробивание", ["penetration", "defense penetration", "пробивание", "пробивание защиты"], "Помогает преодолевать защиту цели."]
    ]
  },
  {
    id: "defense",
    title: "Защита и выживаемость",
    description: "Помогают переживать атаки боссов и ошибки позиционирования.",
    stats: [
      ["hp", "Здоровье", ["hp", "max hp", "health", "maximum health", "здоровье", "макс. здоровье"], "Запас здоровья персонажа."],
      ["defense", "Защита", ["defense", "pve defense", "boss defense", "physical defense", "защита"], "Снижает входящий урон."],
      ["evasion", "Уклонение", ["evasion", "pve evasion", "уклонение"], "Даёт шанс избежать атаки."],
      ["block", "Блокирование", ["block", "block rate", "блокирование", "шанс блока"], "Снижает или блокирует входящие удары."],
      ["criticalResist", "Сопротивление критам", ["critical hit resist", "critical resist", "crit resist", "сопротивление критическим ударам"], "Снижает вероятность получить критический удар."],
      ["damageTolerance", "Сопротивление урону", ["pve damage tolerance", "boss damage tolerance", "damage tolerance", "сопротивление урону"], "Уменьшает получаемый урон от монстров/боссов."],
      ["statusResist", "Сопротивление эффектам", ["status effect resist", "status resist", "сопротивление эффектам", "сопротивление контролю"], "Помогает против контроля и негативных эффектов."]
    ]
  },
  {
    id: "utility",
    title: "Ресурсы и мобильность",
    description: "Полезны для длинных боёв, ротации и безопасного перемещения.",
    stats: [
      ["mp", "Мана", ["mp", "max mp", "mana", "мана"], "Ресурс для применения навыков."],
      ["mpRegen", "Восстановление маны", ["mp regen", "mp regeneration", "mana regeneration", "восстановление маны"], "Помогает поддерживать навыки в длинном бою."],
      ["cooldown", "Сокращение перезарядки", ["cooldown reduction", "cooldown", "сокращение перезарядки"], "Уменьшает время ожидания повторного применения навыков."],
      ["moveSpeed", "Скорость передвижения", ["move speed", "movement speed", "скорость передвижения"], "Упрощает позиционирование и уклонение от механик."]
    ]
  }
];

const normalizeStatName = value => String(value ?? "").toLowerCase().replace(/[\s_'.’%-]/g, "");

export function buildRelevantStatSections(entries = []) {
  // Accept both normalized entries and raw NCSOFT stat objects. The UI and
  // tests may pass statTypeName/statValue directly; normalize them here too.
  const source = asArray(entries).map((entry, index) => {
    if (entry && typeof entry === "object" && entry.value !== undefined && entry.name !== undefined) return entry;
    return normalizeStatEntries({ statList: [entry] })[0] ?? {
      name: "Параметр " + (index + 1), value: "—", group: "Основные"
    };
  });
  const matchedEntries = new Set();
  const sections = RELEVANT_STAT_GROUPS.map(group => ({
    id: group.id,
    title: group.title,
    description: group.description,
    stats: group.stats.flatMap(([id, label, aliases, hint]) => {
      const aliasSet = aliases.map(normalizeStatName);
      const match = source.find(entry => {
        const names = [
          entry?.name, entry?.statName, entry?.displayName, entry?.statTypeName,
          entry?.typeName, entry?.label, entry?.title, entry?.statType,
          entry?.type, entry?.key, entry?.statCode, entry?.statId
        ].filter(Boolean).map(normalizeStatName);
        return names.some(name => aliasSet.includes(name)) &&
          entry?.value != null && entry.value !== "" && entry.value !== "—";
      });
      if (!match) return [];
      matchedEntries.add(match);
      return [{
        id,
        label,
        hint,
        value: match.value,
        available: true,
        sourceName: match?.name ?? match?.statName ?? match?.displayName ?? match?.statTypeName ?? match?.typeName ?? match?.type ?? null,
        icon: match?.icon ?? match?.iconUrl ?? match?.image ?? match?.imageUrl ?? null
      }];
    })
  })).filter(group => group.stats.length > 0);
  const unmatched = source.filter(entry => !matchedEntries.has(entry) && entry?.value != null && entry.value !== "—");
  if (unmatched.length) sections.push({
    id: "other",
    title: "Другие характеристики из профиля",
    description: "Параметры, которые NCSOFT прислал, но названия которых пока не сопоставлены с категориями Стрелка.",
    stats: unmatched.map((entry, index) => ({
      id: "source-" + index,
      label: String(entry.name ?? entry.statName ?? entry.displayName ?? entry.statTypeName ?? entry.typeName ?? entry.type ?? entry.key ?? "Параметр " + (index + 1)),
      hint: entry.group ?? "Исходное значение NCSOFT",
      value: entry.value,
      available: true,
      sourceName: entry.name ?? entry.statName ?? entry.displayName ?? entry.statTypeName ?? entry.typeName ?? entry.type ?? null,
      icon: entry.icon ?? entry.iconUrl ?? entry.image ?? entry.imageUrl ?? null
    }))
  });
  return sections;
}
