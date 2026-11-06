const GAME_TERMS = {
  "Ranger": "Стрелок",
  "Kromede": "Кромеде",
  "Deadshot": "Прицельный выстрел",
  "Snipe": "Меткий выстрел",
  "Tempest Shot": "Скоростная стрельба",
  "Snare Shot": "Опутывающий выстрел",
  "Marking Shot": "Помечающий выстрел",
  "Drill Dart": "Пронзающая стрела",
  "Arrow Scattershot": "Град из стрел",
  "Gale Arrow": "Шквал стрел",
  "Burst Arrow": "Рассекающая стрела",
  "Griffon Arrow": "Стрела грифона",
  "Supporting Fire": "Поддерживающий огонь",
  "Vaizel's Authority": "Сила Байзела",
  "Vaizel’s Authority": "Сила Байзела",
  "Bow of Blessing": "Благословение лука",
  "Chalice of Vigor": "Чаша жизненной силы",
  "Chalice of Magic": "Чаша магии",
  "Parchment of Vigor": "Пергамент жизненной силы",
  "Parchment of Magic": "Пергамент магии",
  "Enraged Kromede Longbow": "Длинный лук разгневанной Кромед",
  "Spiritforged Bow": "Выкованный духом лук",
  "Splendent Dragon Lord Bow": "Сияющий лук Владыки драконов",
  "Nuakum": "Нуакам",
  "Vakron": "Вакрон",
  "Aulamus": "Ауламус",
  "Clash Rune": "Руна столкновения",
  "Ferocious Horn Den": "Логово свирепого рога",
  "Fire Temple": "Храм Огня",
  "Odyle Energy": "Энергия Од",
  "Odyle Energy Cube": "Куб энергии Од",
  "Arcana": "Арканы",
  "Daevanion": "Даэванион",
  "Stigma": "Стигма",
  "Weapon": "Оружие",
  "Bow": "Лук",
  "Helmet": "Шлем",
  "Helm": "Шлем",
  "Gloves": "Перчатки",
  "Boots": "Сапоги",
  "Cloak": "Плащ",
  "Pauldrons": "Наплечники",
  "Ring": "Кольцо",
  "Earrings": "Серьги",
  "Necklace": "Ожерелье",
  "Legendary": "Легендарный",
  "Epic": "Эпический",
  "Rare": "Редкий",
  "Uncommon": "Необычный",
  "Common": "Обычный",
  "Active": "Активное умение",
  "Passive": "Пассивное умение",
  "Chain Skill": "Цепное умение",
  "Mastery": "Мастерство",
  "Physical": "Физический урон",
  "Wind": "Урон ветром",
  "Fire": "Урон огнём",
  "Earth": "Урон землёй",
  "Might": "Мощь",
  "Accuracy": "Точность",
  "Attack": "Атака",
  "Critical Hit": "Критический удар",
  "Critical Damage": "Критический урон",
  "Combat Speed": "Скорость боя",
  "Item Level": "Уровень экипировки",
  "Combat Power": "Боевая мощь"
};

const TERM_PATTERN = new RegExp(
  Object.keys(GAME_TERMS).sort((a, b) => b.length - a.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "gi"
);

export function localizeGameText(value) {
  if (value == null) return value;
  const source = String(value);
  const exact = Object.keys(GAME_TERMS).find(term => term.toLowerCase() === source.trim().toLowerCase());
  if (exact) return GAME_TERMS[exact];
  return source.replace(TERM_PATTERN, match => {
    const key = Object.keys(GAME_TERMS).find(term => term.toLowerCase() === match.toLowerCase());
    return key ? GAME_TERMS[key] : match;
  });
}
