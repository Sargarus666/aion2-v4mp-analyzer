import React, { useEffect, useMemo, useState } from "react";
import { normalizeStatEntries, buildRelevantStatSections } from "./lib/character-data.js";
import { localizeGameText } from "./lib/game-localization.js";

const CHARACTER = {
  name: "v4mp", className: "Стрелок", server: "Европа · Кромеде",
  sourceUrl: "https://notmeter.com/?view=character&serverId=2316&characterId=6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY%3D&name=v4mp&region=ww&globalRegion=eu"
};
const tabs = ["Обзор", "Экипировка", "Характеристики", "Навыки", "Арканы", "Даэванион", "Мета PvE", "План добычи"];
const arr = v => Array.isArray(v) ? v : [];
const get = (o, ...keys) => { for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== "") return o[k]; return null; };
const fmt = v => { if (v == null || v === "") return "—"; const raw = String(v).trim(); const numeric = raw.replace(/[\s,]/g, ""); const parsed = numeric !== "" ? Number(numeric) : NaN; return Number.isFinite(parsed) ? parsed.toLocaleString("ru-RU") : raw; };
const norm = v => String(v ?? "").toLowerCase().replace(/[ _-]/g, "");
const statEntries = normalizeStatEntries;
function statIcon(name) {
  const n = norm(name);
  if (/attack|damage|power|offense|ата|урон|сила/.test(n)) return "⚔";
  if (/critical|crit|крит/.test(n)) return "✹";
  if (/accuracy|точност|меткост/.test(n)) return "◎";
  if (/speed|скорост|haste/.test(n)) return "➤";
  if (/hp|health|vital|здоров|жизн/.test(n)) return "♥";
  if (/defen|armor|defense|защит|брон/.test(n)) return "⬟";
  if (/evasion|уклон/.test(n)) return "↗";
  if (/resist|сопротив/.test(n)) return "◈";
  if (/mana|mp|мана/.test(n)) return "✧";
  if (/level|уров/.test(n)) return "◆";
  return "✦";
}
function statValue(list, names) {
  const hit = list.find(s => names.some(n => norm(s.name) === norm(n) || norm(s.type) === norm(n)));
  return hit?.value ?? null;
}

const ARCANA_META = [
  { slot:"Чаша", best:"Чаша жизненной силы", share:94.1, alternative:"Чаша магии · 5,9%" },
  { slot:"Пергамент", best:"Пергамент жизненной силы", share:78.7, alternative:"Пергамент магии · 21,3%" },
  { slot:"Колокол", best:null, share:0, alternative:"Нет карт в мировой выборке" },
  { slot:"Компас", best:null, share:0, alternative:"Нет карт в выборке Global" },
  { slot:"Зеркало", best:null, share:0, alternative:"Нет карт в выборке Global" }
];
const META_SKILLS = [
  { name:"Прицельный выстрел", aliases:["Deadshot","Прицельный выстрел"], target:20, globalAverage:20.1, koreanPve20:72.8, priority:"Первый приоритет", note:"Главный заряженный удар. Гайд рекомендует довести навык до 20 в первую очередь. Используй его под действием эффекта «Точность» от «Помечающего выстрела»." },
  { name:"Меткий выстрел", aliases:["Snipe","Меткий выстрел"], target:16, globalAverage:17.2, koreanPve20:75.5, priority:"Высокий", note:"По данным AION2 META, навык стоит первым в общем порядке прокачки. На 16-м уровне открывается дополнительная специализация, а попадания сокращают перезарядку «Прицельного выстрела»." },
  { name:"Скоростная стрельба", aliases:["Tempest Shot","Скоростная стрельба"], target:16, globalAverage:18.7, koreanPve20:70.5, priority:"Высокий", note:"На 16-м уровне специализация даёт +20% к скорости применения умений." },
  { name:"Пронзающая стрела", aliases:["Drill Dart","Пронзающая стрела"], target:16, globalAverage:18.6, koreanPve20:70.1, priority:"Высокий", note:"На 16-м уровне специализация добавляет ещё одно срабатывание умения." },
  { name:"Шквал стрел", aliases:["Gale Arrow","Шквал стрел","Шквальная стрела"], target:16, globalAverage:18.1, koreanPve20:64.5, priority:"Высокий", note:"На 16-м уровне сокращается перезарядка — проще поддерживать эффект усиления урона." },
  { name:"Помечающий выстрел", aliases:["Marking Shot","Помечающий выстрел"], target:12, globalAverage:14, koreanPve20:3.6, priority:"Поддержка", note:"На 12-м уровне эффект «Точность» действует на 5 секунд дольше. Обновляй его до окончания." },
  { name:"Опутывающий выстрел", aliases:["Snare Shot","Опутывающий выстрел"], target:12, globalAverage:13.2, koreanPve20:2.8, priority:"Поддержка", note:"Замедляет цель и позволяет применить «Рассекающую стрелу»." }
];
const META_STIGMAS = [
  { name:"Сила Байзела", aliases:["Vaizel's Authority","Vaizel’s Authority","Сила Байзела"], target:20, globalShare:98.5, priority:"Первый приоритет" },
  { name:"Стрела грифона", aliases:["Griffon Arrow","Стрела грифона"], target:15, globalShare:77.9, priority:"Следом" },
  { name:"Поддерживающий огонь", aliases:["Supporting Fire","Поддерживающий огонь"], target:15, globalShare:91.2, priority:"Следом" },
  { name:"Благословение лука", aliases:["Bow of Blessing","Благословение лука","Благословенный лук"], target:15, globalShare:90.4, priority:"Следом" }
];
const FARM_RESOURCES = [
  { category:"База данных · EU", name:"AION2.GG", description:"Предметы, источники дропа, шанс выпадения, подземелья и карты. Данные EU-клиента обновлены 5 ноября 2026.", url:"https://aion2.gg/database", label:"Открыть базу" },
  { category:"Русская база данных", name:"DBAion2.ru", description:"Предметы, монстры, задания, навыки, стигмы, подземелья, карта и калькуляторы; есть русский интерфейс.", url:"https://dbaion2.ru/", label:"Открыть базу" },
  { category:"Гайд · Стрелок", name:"AION2 Guides — Стрелок", description:"PvE-билд, порядок прокачки умений, стигмы, арканы, характеристики и доски Даэваниона.", url:"https://aion2-guides.info/ru/ranger/", label:"Открыть гайд" },
  { category:"Гайд · Прогресс экипировки", name:"После 45 уровня", description:"Маршрут по порогам 1400 → 1900 → 2100 → 2500 → 2800; что фармить, где крафтить и когда переносить заточку.", url:"https://aion2-guides.info/ru/progression/", label:"Маршрут экипировки" },
  { category:"Гайд · Механики боссов", name:"Подземелья и боссы", description:"Механики Пещеры крао, Драупнира, Ущелья ауругу, Вакрона, Храма огня, Логова Свирепого Рога и Рудры.", url:"https://aion2-guides.info/ru/dungeons/", label:"Разбор боссов" },
  { category:"Билды и калькуляторы", name:"AION2 Gaming Tools", description:"База предметов и навыков, калькуляторы крафта, Даэваниона, заточки и планировщик аркан.", url:"https://aion2.gaming.tools/", label:"Открыть инструменты" },
  { category:"Мета и сравнение", name:"AION2 META", description:"Сравнение сборок и открытых профилей сильных игроков. Использовать как ориентир, а не как доказательство прироста DPS.", url:"https://aion2-meta.com/guides/ranger/", label:"Сравнить мету" },
  { category:"Профиль персонажа", name:"Shugo.GG — v4mp", description:"Быстро сверить экипировку и публичные данные персонажа.", url:"https://shugo.gg/character/global/eu-kromede/v4mp", label:"Открыть профиль" }
];
function getStigmaProgress(skills) {
  return META_STIGMAS.map(meta => {
    const found = skills.find(skill => {
      const name = get(skill,"name","skillName","displayName");
      return name && meta.aliases.some(alias => norm(name) === norm(alias));
    });
    const raw = found ? get(found,"skillLevel","level") : null;
    const level = raw == null || !Number.isFinite(Number(raw)) ? null : Number(raw);
    return { ...meta, level, found:!!found };
  });
}
function getSkillProgress(skills) {
  return META_SKILLS.map(meta => {
    const found = skills.find(skill => {
      const name = get(skill,"name","skillName","displayName");
      return name && meta.aliases.some(alias => norm(name) === norm(alias));
    });
    const raw = found ? get(found,"skillLevel","level") : null;
    const level = raw == null || !Number.isFinite(Number(raw)) ? null : Number(raw);
    return { ...meta, level, found:!!found };
  });
}
function imageSource(value) {
  if (!value || typeof value !== "string") return "";
  const v = value.trim();
  try {
    const url = new URL(v, "https://aion2.plaync.com/");
    const host = url.hostname.toLowerCase();
    if (url.protocol === "https:" && (host === "plaync.com" || host.endsWith(".plaync.com") || host === "playnccdn.com" || host.endsWith(".playnccdn.com") || host === "ncsoft.com" || host.endsWith(".ncsoft.com"))) return url.href;
  } catch { /* ignore unsupported icon references */ }
  return "";
}
function makeFarmPlan(items, stats, boards, skills, gs, arcanaItems = []) {
  const plan = [];
  const gaps = getSkillProgress(skills || []).filter(x => x.level != null && x.level < x.target).slice(0,3);
  gaps.forEach((x,i) => plan.push({
    title: "Навык: " + x.name,
    detail: "Сейчас ур. " + x.level + " · ориентир PvE " + x.target,
    how: [x.note, "Проверь бонусы к уровню навыка на кольцах, экипировке, картах Арканы и на доске Даэваниона.", "Сравни стоимость прямой прокачки с получением недостающего уровня через бонусы сборки."],
    priority: i === 0 ? "Высокий" : "Средний", target: "Умения"
  }));
  const stigmaGaps = getStigmaProgress(skills || []).filter(x => x.level != null && x.level < x.target);
  stigmaGaps.forEach((x,i) => plan.push({
    title: "Стигма: " + x.name,
    detail: "Сейчас ур. " + x.level + " · ориентир PvE " + x.target,
    how: ["Сверь стоимость следующего уровня с бонусами и доступными ресурсами.", "Сначала проверь «Силу Байзела»: руководство ставит её на первый крупный рубеж.", "Не вкладывайся в стигмы, если сначала выгоднее закрыть пробел в оружии или ключевом навыке."],
    priority: i === 0 ? "Высокий" : "Средний", target: "Стигма"
  }));
  const equipped = items.filter(x => x && (x.name || x.itemName));
  const weapon = equipped.find(x => /weapon|bow|лук|оруж/i.test([x.slotPosName,x.slot,x.name,x.itemName].join(" ")));
  if (weapon) plan.push({
    title: "Лук",
    detail: "Текущий предмет: " + localizeGameText(weapon.name || weapon.itemName) + (weapon.enchantLevel != null ? " · заточка +" + weapon.enchantLevel : "") + (weapon.grade ? " · " + localizeGameText(weapon.grade) : ""),
    how: ["Сравнить базовую атаку и атакующие характеристики нового лука с текущим.", "Сначала проверить добычу в доступных подземельях и награды за недельные активности.", "Менять оружие только если прирост реального урона по боссу выше, чем от заточки/камней текущего."],
    priority: "Высокий", target: "Оружие"
  });
  else plan.push({
    title: "Проверить лук",
    detail: "В профиле не удалось однозначно определить слот оружия.",
    how: ["Убедись, что список экипировки загрузился полностью.", "Когда название и характеристики лука появятся в профиле, их можно будет сравнить с таблицей добычи."],
    priority: "Проверка данных", target: "Оружие"
  });
  const gsNumber = Number(String(gs ?? "").replace(/[^0-9.-]/g, ""));
  const entry2100 = Number.isFinite(gsNumber) && gsNumber >= 2100
    ? "Требование по уровню экипировки выполнено: сейчас " + fmt(gsNumber) + "."
    : "Для входа на третий уровень завоевания нужен уровень экипировки 2 100" + (Number.isFinite(gsNumber) ? "; сейчас " + fmt(gsNumber) + "." : ".");
  if (Number.isFinite(gsNumber) && gsNumber >= 2100 && gsNumber < 2500) plan.push({
    title: "Главная цель этапа: поднять уровень экипировки до 2 500",
    detail: "Сейчас " + fmt(gsNumber) + " · доступен тир 3, следующий крупный рубеж — 2 500",
    how: [
      "Храм огня и Логово Свирепого Рога доступны уже с 2 100. Не путай порог входа с целью прогрессии: маршрут AION2 Guides рекомендует выйти примерно на 2 500 перед тем, как надолго застревать на фарме полного сета.",
      "Броню целенаправленно собирай в Логове Свирепого Рога. Храм огня оставь для оружия и аксессуаров; сравнивай выпавшую вещь с текущей по атаке, точности, криту и привязке души.",
      "Закрывай недостающие слоты гарантированными наградами и жетонами, если они доступны. Не трать эфирную энергию на низшие тиры, когда предмет уже перестал быть улучшением.",
      "После каждой замены пересчитывай уровень экипировки: заточка и манастоуны могут дать недостающий порог дешевле, чем ещё один случайный заход."
    ],
    priority: "Высокий", target: "Прогресс 2 100 → 2 500", sourceUrl: "https://aion2-guides.info/ru/progression/", sourceLabel: "AION2 Guides · маршрут после 45"
  });
  if (Number.isFinite(gsNumber) && gsNumber >= 2500 && gsNumber < 2800) plan.push({
    title: "Фарм брони: Логово Свирепого Рога",
    detail: "Уровень экипировки " + fmt(gsNumber) + " · приоритет комплекта брони",
    how: [
      "На этапе 2 500 маршрут прогрессии советует сосредоточить эфирную энергию на Логове Свирепого Рога и собирать недостающие части брони.",
      "Храм огня используй для оружия и аксессуаров. Если предмет не выпадает, проверь жетоны гарантии и обмен в трансмутации вещества.",
      "Переноси заточку со старого предмета только после проверки привязки души: перенос имеет смысл на вещь, которую планируешь оставить надолго."
    ],
    priority: "Высокий", target: "Логово Свирепого Рога", sourceUrl: "https://aion2-guides.info/ru/progression/", sourceLabel: "AION2 Guides · этап 2 500"
  });
  if (Number.isFinite(gsNumber) && gsNumber < 2600) plan.push({
    title: "На будущее: доска Ариэль и PvE-бонусы",
    detail: "Пока рано фармить фрагменты: Hard Пещеры крао и Драупнира требует 2 600",
    how: [
      "Не сливай время на эту цель до порога 2 600. По гайду фрагменты Ариэль в Hard выпадают из Пещеры крао и Драупнира с уровня предметов 2 600.",
      "С 2 700 добавляются Hard Ущелье ауругу и Hard Парящий остров Вакрона. Фрагменты превращаются в Кристаллы Даэваниона: Ариэль.",
      "Для PvE-маршрута гайда приоритетны узлы «Увеличение урона в PvE» и «Увеличение урона по боссу», затем PvE-стойкость; маршрут рассчитан на ограниченный запас кристаллов."
    ],
    priority: "Позже", target: "Ариэль · порог 2 600 / 2 700", sourceUrl: "https://aion2-guides.info/ru/ranger/", sourceLabel: "AION2 Guides · доски Даэваниона"
  });
  if (Number.isFinite(gsNumber) && gsNumber >= 2600) plan.push({
    title: "Фрагменты Ариэль: Hard-подземелья",
    detail: "Порог 2 600 открыт" + (gsNumber >= 2700 ? " · доступны все четыре источника из гайда" : " · пока доступны Пещера крао и Драупнир"),
    how: [
      "На 2 600 фарми Hard Пещеру крао и Hard Драупнир. С 2 700 добавь Hard Ущелье ауругу и Hard Парящий остров Вакрона.",
      "100 фрагментов превращаются в один Кристалл Даэваниона: Ариэль. Гайд указывает лимит до 30 кристаллов с каждого подземелья.",
      "Сначала прокладывай маршрут к PvE-урону и урону по боссам; не расходуй кристаллы на PvP-узлы, если цель — DPS по боссам."
    ],
    priority: "Высокий", target: "Ариэль · Hard", sourceUrl: "https://aion2-guides.info/ru/ranger/", sourceLabel: "AION2 Guides · маршрут Ариэль"
  });
  if (Number.isFinite(gsNumber) && gsNumber < 2800) plan.push({
    title: "Долгосрочный рубеж: рейд Плавильня Бездны — Рудра",
    detail: "Обычная сложность открывается с уровня предметов 2 800, сложная — с 3 000",
    how: [
      "Пока не достигнут 2 800, это подготовительная цель, а не текущий фарм. Рейд рассчитан на 10 игроков.",
      "Перед первым заходом изучи механику Раху, Кету и Рудры: ошибки с лужами и безопасными клетками могут сорвать весь бой.",
      "После открытия рейда пересмотри арканы, браслеты и экипировку по таблице наград; не переноси старые рекомендации на новый патч без проверки."
    ],
    priority: "Позже", target: "Рудра · 2 800 / 3 000", sourceUrl: "https://aion2-guides.info/ru/dungeons/", sourceLabel: "AION2 Guides · механики Рудры"
  });
  if (Number.isFinite(gsNumber) && gsNumber >= 2800) plan.push({
    title: "Рейд Рудры и переход на топовую экипировку",
    detail: "Уровень предметов " + fmt(gsNumber) + " · доступен рейд на 10 игроков",
    how: [
      "Обычная сложность Плавильни Бездны открывается с 2 800, сложная — с 3 000. Изучи механику рейда до входа.",
      "На этом этапе оцени золотые арканы из Возвышения ★4 и предметы из рейда. По гайду дальнейшая заточка выше +15 требует отдельного Камня прорыва.",
      "Для долгосрочной экипировки сравни крафтовые предметы уровня 94/102 с дропом уровня 86: не вкладывай дорогие материалы в вещь, которую скоро заменишь."
    ],
    priority: "Высокий", target: "Плавильня Бездны · Рудра", sourceUrl: "https://aion2-guides.info/ru/progression/", sourceLabel: "AION2 Guides · этап 2 800"
  });
  const vakronItems = equipped.filter(x => /vakron|вакрон/i.test(x.name || x.itemName || ""));
  if (vakronItems.length) plan.push({
    title: "Нуакам · комплект из подземелья",
    detail: vakronItems.length + " предмет(а) Вакрон в текущем профиле",
    how: [entry2100, "Следующая цель для брони — комплект Нуакам из «Логова свирепого рога» (завоевание, тир 3). В базе AION2.GG указаны слоты, боссы и шанс получения за одно открытие куба энергии Одил.", "AION2.GG: Плащ и перчатки Нуакам — 1,27%; сапоги, шлем и наплечники — 1,02% за одно открытие куба энергии Одил. Шанс зависит от слота и босса.", "Это промежуточный маршрут через подземелье. В выборке сильнейших игроков мирового сервера чаще встречается комплект Владыки драконов — отдельная цель позднего этапа игры."],
    priority: "Высокий", target: "Логово свирепого рога", sourceUrl: "https://aion2.gg/database/drop-rates?dungeon=600092&type=Equip", sourceLabel: "AION2.GG · Логово свирепого рога" 
  });
  const rawWeaponName = weapon?.name || weapon?.itemName || "";
  const weaponName = localizeGameText(rawWeaponName);
  if (/spiritforged|выкованн.*духом/i.test(rawWeaponName)) plan.push({
    title: "Длинный лук разгневанной Кромед",
    detail: "Сейчас: " + weaponName + (weapon.enchantLevel != null ? " +" + weapon.enchantLevel : "") + " · альтернатива из подземелья",
    how: [entry2100, "Храм Огня (третий уровень завоевания): длинный лук разгневанной Кромед — 0,43% за одно открытие куба энергии Одил по таблице AION2.GG. Это не шанс за весь поход.", "Сравни базовую атаку, точность, критический удар и привязку души с текущим выкованным луком и его заточкой.", "Долгосрочный ориентир сильнейших игроков мирового сервера — сияющий лук Владыки драконов. Это не значит, что нужно немедленно переключаться на изготовление предметов."],
    priority: "Средний", target: "Храм Огня", sourceUrl: "https://aion2.gg/database/drop-rates?dungeon=600022&type=Equip", sourceLabel: "AION2.GG · Храм Огня"
  });
  const aulamusJewelry = equipped.filter(x => /aulamus|ауламус/i.test(x.name || x.itemName || "") && /necklace|earring|ring|ожерель|серьг|кольц/i.test([x.slotPosName,x.slot,x.name,x.itemName].join(" ")));
  if (aulamusJewelry.length) plan.push({
    title: "Аксессуары разгневанной Кромед",
    detail: aulamusJewelry.length + " аксессуар(а) Ауламус в текущем профиле",
    how: [entry2100, "Храм Огня (завоевание): по данным AION2.GG, за одно открытие куба энергии Одил шанс составляет: кольцо — 1,72%, серьги — 1,29%, ожерелье — 1,03%. Это не гарантированная добыча за поход.", "Сначала сравни предметы в слотах с самыми слабыми бонусами. Не жертвуй атакой, критическим ударом и точностью только ради уровня предмета.", "В выборке сильнейших игроков мирового сервера чаще встречаются аксессуары Владыки драконов. Аксессуары разгневанной Кромед — промежуточный этап, а не подтверждённый лучший комплект."],
    priority: "Средний", target: "Храм Огня", sourceUrl: "https://aion2.gg/database/drop-rates?type=Equip", sourceLabel: "AION2.GG · дроп-таблица 28.10"
  });
  const clashRunes = equipped.filter(x => /clash rune|руна столкновения/i.test(x.name || x.itemName || "") && Number(x.enchantLevel) < 5);
  if (clashRunes.length) plan.push({
    title: "Руна столкновения · следующая цель +5",
    detail: clashRunes.length + " руны столкновения ниже +5",
    how: ["Все 136 Стрелков из мировой выборки использовали руны столкновения; типичный уровень заточки — +5.", "Сравни стоимость +5 с текущими приоритетами по оружию и броне из подземелий.", "Это дополнительное улучшение после ключевых слотов, а не повод откладывать замену экипировки Вакрон."],
    priority: "Низкий", target: "Руны", sourceUrl: "https://aion2-meta.com/guides/ranger/", sourceLabel: "AION2 META · мировая выборка"
  });
  const magicChalice = arcanaItems.find(x => /chalice of magic|чаша магии/i.test(x.name || x.itemName || ""));
  if (magicChalice) plan.push({
    title: "Аркана: Чаша жизненной силы",
    detail: "Сейчас: " + localizeGameText(magicChalice.name || magicChalice.itemName) + (magicChalice.grade ? " · " + localizeGameText(magicChalice.grade) : ""),
    how: ["Среди 136 сильнейших игроков мирового сервера Чаша жизненной силы встречается у 94,1%, Чаша магии — у 5,9%.", "Проверь способ получения или обмена и сравни реальные бонусы карты перед заменой.", "Частота использования — только ориентир, а не доказательство прироста урона."],
    priority: "Средний", target: "Арканы", sourceUrl: "https://aion2-meta.com/guides/ranger/", sourceLabel: "AION2 META · мировая выборка"
  });
  const weak = equipped.filter(x => x.enchantLevel != null).sort((a,b)=>Number(a.enchantLevel)-Number(b.enchantLevel)).slice(0,3);
  weak.forEach(x => plan.push({
    title: localizeGameText(x.slotPosName || x.slot || "Слот") + ": " + localizeGameText(x.name || x.itemName),
    detail: localizeGameText(x.slotPosName || x.slot || "Предмет") + " · заточка +" + x.enchantLevel + (x.grade ? " · " + localizeGameText(x.grade) : ""),
    how: ["Сравнить стоимость следующего уровня заточки с заменой предмета на экипировку из подземелья.", "Проверить, какие характеристики даёт слот: крит, точность, атака и другие бонусы.", "Не вкладывать редкие материалы в предмет, который скоро заменишь более высоким тиром."],
    priority: "Средний", target: localizeGameText(x.slotPosName || "Экипировка")
  }));
  if (boards.length) {
    const incomplete = boards.filter(b => Number(b.openNodeCount ?? 0) < Number(b.totalNodeCount ?? 0));
    incomplete.forEach(b => plan.push({
      title: "Даэванион: " + localizeGameText(b.name || "доска"),
      detail: (b.openNodeCount ?? "—") + " / " + (b.totalNodeCount ?? "—") + " открытых узлов",
      how: ["Открывай узлы, усиливающие урон Стрелка и характеристики, повышающие точность попаданий.", "Сверяй бонус каждого узла с реальными характеристиками персонажа, а не выбирай только по уровню предмета.", "Для точного маршрута нужны данные списка узлов и требования для открытия каждого из них."],
      priority: "Средний", target: "Даэванион"
    }));
  }
  if (!plan.length) plan.push({title:"Недостаточно данных",detail:"Профиль пока не содержит экипировки для ранжирования.",how:["Обновить профиль и проверить источник данных."],priority:"Ожидание",target:"Профиль"});
  const priorityOrder = { "Высокий": 0, "Средний": 1, "Низкий": 2, "Позже": 3, "Проверка данных": 4, "Ожидание": 5 };
  return plan.map((item,index)=>({...item,_order:index})).sort((a,b)=>(priorityOrder[a.priority]??9)-(priorityOrder[b.priority]??9)||a._order-b._order);
}

export default function App() {
  const [profile,setProfile]=useState(null), [tab,setTab]=useState("Обзор"), [loading,setLoading]=useState(false), [error,setError]=useState(""), [updated,setUpdated]=useState("");
  async function loadProfile(forceRefresh = false) {
    setLoading(true); setError("");
    try {
      const url = forceRefresh ? "/api/profile?refresh=1" : "/api/profile";
      const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(15000)});
      const result=await r.json();
      if(!r.ok || !result.ok) throw new Error(result.error || "Импорт не удался");
      setProfile({ ...result.data, _partial: Boolean(result.partial), _warnings: arr(result.warnings) });
      setUpdated(new Date().toLocaleString("ru-RU"));
    } catch(e) { setError(e.name==="TimeoutError" ? "NCSOFT не ответил за 15 секунд. Попробуй обновить профиль ещё раз." : (e.message || "Ошибка загрузки")); }
    finally { setLoading(false); }
  }
  useEffect(()=>{loadProfile(false);},[]);
  const character=profile?.profile || {};
  const equipment=arr(profile?.equipment?.equipmentList);
  const skins=arr(profile?.equipment?.skinList);
  const stats=statEntries(profile?.stat);
  const skills=arr(profile?.skill?.skillList);
  const arcanaCandidates=[...arr(profile?.arcana),...arr(profile?.equipment?.arcanaList),...equipment.filter(x=>/arcana|аркана/i.test([x.slotPosName,x.slotPos,x.slot,x.category].join(" ")))];
  const arcana=arcanaCandidates.filter((item,index,list)=>list.findIndex(other=>(item.id&&other.id===item.id)||(item.slotPosName&&other.slotPosName===item.slotPosName))===index);
  const boards=arr(profile?.daevanion?.boardList);
  const cp=get(character,"combatPower","combat_power") ?? statValue(stats,["CombatPower","Combat Power","CP"]);
  const gs=statValue(stats,["ItemLevel","Уровень экипировки","GearScore","Gear Score","GS"]) ?? get(character,"itemLevel","item_level","gearScore","gear_score");
  const skillMeta=getSkillProgress(skills);
  const stigmaMeta=getStigmaProgress(skills);
  const farm=useMemo(()=>makeFarmPlan(equipment,stats,boards,skills,gs,arcana),[profile]);
  const title=get(character,"name","characterName","character_name") || CHARACTER.name;
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">A2</span><span>AION 2 <b>МАСТЕРСКАЯ СБОРКИ</b></span></a><div className="top-actions"><span className="live-dot" role="status" aria-live="polite">{loading?"СИНХРОНИЗАЦИЯ · NCSOFT":error&&profile?"ОШИБКА ОБНОВЛЕНИЯ · ПОСЛЕДНИЕ ДАННЫЕ":profile?._partial?"ЧАСТИЧНЫЕ ДАННЫЕ · NCSOFT":profile?"ПРОФИЛЬ · ТОЛЬКО ЧТЕНИЕ":"ОЖИДАНИЕ ПРОФИЛЯ"}</span><a className="profile-link" href="https://aion2.plaync.com/en-us/characters/index?region=eu" target="_blank" rel="noreferrer">NCSOFT · Европа ↗</a><a className="profile-link" href="https://shugo.gg/character/global/eu-kromede/v4mp" target="_blank" rel="noreferrer">Shugo.GG ↗</a><a className="profile-link" href={CHARACTER.sourceUrl} target="_blank" rel="noreferrer">NotMeter ↗</a></div></header>
    <section className="hero"><div><p className="eyebrow">АНАЛИЗАТОР ПЕРСОНАЖА / ЕВРОПА</p><h1>{title}<em> · сборка</em></h1><p className="sub">{localizeGameText(get(character,"className","class")) || CHARACTER.className} <span>•</span> {(get(character,"serverName","server")==="Kromede" ? "Кромеде" : localizeGameText(get(character,"serverName","server"))) || CHARACTER.server} <span>•</span> {get(character,"level","characterLevel") ? "Ур. "+get(character,"level","characterLevel") : "Уровень —"}</p></div><div className="hero-actions"><button className="primary" onClick={()=>loadProfile(true)} disabled={loading}>{loading?"Загружаю…":"Обновить профиль ↻"}</button></div></section>
    {error && <section className="panel error-panel" role="alert"><b>{profile?"Не удалось обновить профиль":"Не удалось загрузить персонажа"}</b><p className="muted">{error}</p>{profile&&<small>Оставлен последний успешный снимок от {updated}; данные могут быть устаревшими.</small>}<small>Источник: публичный API NCSOFT · Сервер 2316 · Европа</small><button className="secondary" onClick={()=>loadProfile(true)}>Повторить</button></section>}
    {profile?._partial && <section className="panel warning-panel" role="status"><b>Частичный ответ NCSOFT</b><p className="muted">Некоторые разделы могут быть пустыми, потому что один из публичных endpoints не ответил.</p>{profile._warnings.map((warning,i)=><small key={i}>{warning}</small>)}</section>}
    <section className="metrics">
      <Metric label="УРОВЕНЬ ЭКИПИРОВКИ" value={fmt(gs)} hint="Из характеристик профиля NCSOFT"/>
      <Metric label="БОЕВАЯ МОЩЬ" value={fmt(cp)} hint="Боевая мощь персонажа"/>
      <Metric label="ЭКИПИРОВКА" value={equipment.length ? equipment.length+" предметов" : "—"} hint={equipment.length ? "Получено из профиля NCSOFT" : "Нет данных из профиля"}/>
    </section>
    <nav className="tabs" aria-label="Разделы анализатора">{tabs.map(t=><button key={t} className={tab===t?"active":""} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
    {tab==="Обзор" && <><section className="content-grid"><article className="panel"><div className="panel-head"><div><p className="eyebrow">ДАННЫЕ ПЕРСОНАЖА</p><h2>Профиль персонажа</h2></div><span className="tag">{profile?"Данные получены":"Нет данных"}</span></div><Status label="Персонаж" value={title}/><Status label="Класс" value={localizeGameText(get(character,"className","class")) || CHARACTER.className}/><Status label="Сервер" value={(get(character,"serverName","server")==="Kromede" ? "Кромеде" : get(character,"serverName","server")) || CHARACTER.server}/><Status label="Уровень" value={get(character,"level","characterLevel") ?? "—"}/><Status label="Навыки" value={skills.length}/><p className="disclaimer">Только публичные данные NCSOFT. Значения GS и CP показываются отдельно и не подменяются расчётными числами.</p></article><aside className="panel"><p className="eyebrow">СОСТОЯНИЕ ДАННЫХ</p><h2>Состав профиля</h2><Status label="Экипировка" value={equipment.length}/><Status label="Характеристики" value={stats.length}/><Status label="Навыки" value={skills.length}/><Status label="Арканы" value={arcana.length}/><Status label="Даэванион" value={boards.length}/><Status label="Облики" value={skins.length}/><div className="callout">{updated?"Обновлено: "+updated:"Автоматическая загрузка профиля v4mp."}</div></aside></section><section className="panel build-image-panel"><div className="panel-head"><div><p className="eyebrow">ТЕКУЩАЯ СБОРКА</p><h2>Текущая сборка персонажа</h2></div><span className="tag">Скриншот</span></div><a className="build-image-link" href="https://raw.githubusercontent.com/Sargarus666/aion2-v4mp-analyzer/main/IMG_20261104_190217_860.jpg" target="_blank" rel="noreferrer"><img className="build-image" src="https://raw.githubusercontent.com/Sargarus666/aion2-v4mp-analyzer/main/IMG_20261104_190217_860.jpg" alt="Скриншот билда персонажа v4mp" loading="lazy"/></a><p className="muted">Скриншот сборки из GitHub проекта. Нажми на изображение, чтобы открыть его в полном размере.</p></section></>}
    {tab==="Экипировка" && <section className="panel"><h2>Экипировка</h2>{equipment.length?<div className="visual-list">{equipment.map((x,i)=><VisualRow key={i} item={x} kind="item"/> )}</div>:<Empty error={error}/ >}{skins.length>0&&<><h2 className="section-subtitle">Облики</h2><div className="visual-list">{skins.map((x,i)=><VisualRow key={i} item={x} kind="item"/>)}</div></>}</section>}
    {tab==="Характеристики" && <section className="panel stats-panel"><div className="panel-head"><div><p className="eyebrow">ХАРАКТЕРИСТИКИ ПЕРСОНАЖА</p><h2>Характеристики</h2></div><span className="tag">{stats.length} параметров</span></div>{stats.length?<><div className="stats-overview"><div><b>Боевые характеристики Стрелка</b><p>Здесь собраны важные для Стрелка параметры: урон по боссам, скорость атак, критические попадания и выживаемость.</p></div><span>{stats.length} параметров из профиля</span></div><div className="stats-sections">{buildRelevantStatSections(stats).filter(group=>group.stats.length>0).map(group=><section className="stats-group" key={group.id}><div className="stats-group-head"><div><h3>{group.title}</h3><p>{group.description}</p></div><span>{group.stats.length}</span></div><div className="stats-grid">{group.stats.map(item=><StatCard key={item.id} item={{name:item.label,value:item.value,group:item.hint,icon:item.icon,available:true}}/>)}</div></section>)}</div><p className="stats-note">Значения берутся из публичного профиля без расчётных подстановок. Для PvE-Стрелка особенно важны точность, скорость боя, критический урон и бонусы урона; защитные показатели помогают оценивать запас выживаемости.</p></>:<Empty error={error}/>}</section>}
    {tab==="Навыки" && <section className="panel"><h2>Навыки</h2>{skills.length?<div className="visual-list">{skills.map((x,i)=><VisualRow key={i} item={x} kind="skill"/>)}</div>:<Empty error={error}/>}</section>}
    {tab==="Арканы" && <section className="panel"><div className="panel-head"><div><p className="eyebrow">ЭКИПИРОВАННЫЕ АРКАНЫ</p><h2>Арканы персонажа</h2></div><a className="profile-link" href="https://shugo.gg/character/global/eu-kromede/v4mp" target="_blank" rel="noreferrer">Профиль Shugo.GG ↗</a></div>{arcana.length?<div className="visual-list">{arcana.map((x,i)=><VisualRow key={x.id||x.slotPosName||i} item={x} kind="item"/>)}</div>:<div className="empty-state"><span>◇</span><b>Арканы не распознаны в ответе NCSOFT</b><small>Не подставляю старые или предполагаемые карты. Shugo.GG публикует экипированные арканы в открытом профиле персонажа.</small><a className="profile-link" href="https://shugo.gg/character/global/eu-kromede/v4mp" target="_blank" rel="noreferrer">Открыть арканы v4mp ↗</a></div>}<div className="meta-section-head"><h3>Выборка сильнейших Стрелков на мировом сервере</h3><span>136 персонажей · 03.11.2026</span></div><p className="muted">Доли карт в открытых профилях сильнейших игроков. Это частота использования, а не прямое измерение урона; для трёх слотов источник пока не подтвердил популярные карты.</p><div className="arcana-meta-grid">{ARCANA_META.map((item,i)=><ArcanaMetaCard key={item.slot} item={item} index={i}/>)}</div></section>}
    {tab==="Даэванион" && <section className="panel"><h2>Даэванион</h2>{boards.length?boards.map((x,i)=><DataRow key={i} title={localizeGameText(get(x,"name"))||"Доска"} detail={(x.openNodeCount??"—")+" / "+(x.totalNodeCount??"—")+" узлов"}/>):<Empty error={error}/>}</section>}
    {tab==="Мета PvE" && <section className="panel meta-panel"><div className="panel-head"><div><p className="eyebrow">СТРЕЛОК · УРОН ПО ОДНОЙ ЦЕЛИ</p><h2>Эталон PvE-сборки</h2></div><span className="tag">Гайды + мировая выборка · 3 ноя</span></div><p className="muted meta-intro">Сверка с PvE-руководством и выборкой 136 сильнейших Стрелков на мировом сервере. Рубежи специализаций и средние уровни выборки показаны отдельно: популярность не доказывает прирост урона.</p><div className="meta-skill-grid">{skillMeta.map((x,i)=><MetaSkillCard key={x.name} item={x} index={i}/>)}</div><div className="meta-section-head"><h3>Стигмы · ориентиры прокачки</h3><span>Уровни по Mobalytics · частота в мировой выборке</span></div><div className="meta-stigma-grid">{stigmaMeta.map((x,i)=><MetaStigmaCard key={x.name} item={x} index={i}/>)}</div><div className="meta-columns"><article className="meta-block"><span className="eyebrow">ПРИОРИТЕТ ХАРАКТЕРИСТИК</span><ol><li>Усиление урона в PvE</li><li>Усиление критического урона</li><li>Атака</li><li>Точность</li><li>Восстановление маны — если её не хватает в долгом бою</li></ol><small>Рекомендованный порядок для длительного PvE; важность точности и восстановления маны зависит от промахов и длительности боя.</small></article><article className="meta-block"><span className="eyebrow">РОТАЦИЯ ПО БОССУ</span><ol><li>Активируй «Силу Байзела», «Поддерживающий огонь» и «Благословение лука».</li><li>Запусти «Шквал стрел» и «Стрелу грифона» через атакующий макрос.</li><li>Примени «Помечающий выстрел», чтобы включить «Точность».</li><li>Полностью заряди «Прицельный выстрел» вручную под «Точность».</li><li>Продолжай атаковать через «Меткий выстрел» и макрос; обновляй «Точность» и береги усиления перед неуязвимостью босса.</li></ol><small>«Прицельный выстрел» и «Помечающий выстрел» лучше держать на ручном нажатии.</small></article></div><div className="meta-sources"><span>Источники рекомендаций:</span><a href="https://mobalytics.gg/gamebase/guides/aion-2-ranger-pve-build" target="_blank" rel="noreferrer">Mobalytics · уровни умений и порядок атак</a><a href="https://aion2companion.com/builds/ranger/" target="_blank" rel="noreferrer">AION2 Companion · приоритет характеристик</a><a href="https://aion2-meta.com/guides/ranger/" target="_blank" rel="noreferrer">AION2 META · выборка 136 игроков мирового сервера</a></div></section>}
    {tab==="План добычи" && <section className="panel farm-panel"><div className="farm-hero"><div><p className="eyebrow">СТРЕЛОК · PvE · УРОН ПО БОССАМ</p><h2>План добычи</h2><p className="muted">Сверху — самые выгодные ближайшие цели. Раскрой пункт, чтобы увидеть маршрут, требования, советы по экипировке и источник.</p><span className="tag">{farm.length} целей · сортировка по приоритету</span></div><img src="https://aion2-guides.info/assets/art/ranger.webp" alt="Стрелок AION 2" loading="lazy"/></div><div className="farm-guide-note"><b>Логика маршрута обновлена по гайдам сезона 1.</b><span>Вход в тир 3 — от 2 100; ориентир следующего этапа экипировки — 2 500; Hard-фрагменты Ариэль — с 2 600/2 700; рейд Рудры — с 2 800.</span></div><div className="farm-list">{farm.map((x,i)=><FarmCard key={i} item={x} index={i}/>)}</div>{!profile&&<Empty error={error}/>}<section className="farm-rules"><div className="farm-library-head"><div><p className="eyebrow">ЧТО ЕЩЁ ВАЖНО ДЛЯ DPS</p><h3>Приоритет привязки души по слотам</h3><p className="muted">Это не список обязательных дропов, а ориентир, какие строки искать на вещах перед дорогой перекруткой.</p></div></div><div className="farm-rule-grid"><article className="farm-rule"><b>Лук и наручи</b><p>Скорость боя · усиление урона оружием · усиление урона · Мощь. Для крафтового оружия дополнительно ценен мультиудар.</p></article><article className="farm-rule"><b>Шлем и плащ</b><p>Мощный удар / двойной шанс · увеличение атаки.</p></article><article className="farm-rule"><b>Наплечники и нагрудник</b><p>Наплечники — критический урон; нагрудник — увеличение урона.</p></article><article className="farm-rule"><b>Поножи, перчатки и сапоги</b><p>Поножи — атака и стойкость к урону; перчатки — скорость боя; сапоги — скорость передвижения.</p></article><article className="farm-rule"><b>Серьги, ожерелье и кольца</b><p>Серьги — скорость передвижения; ожерелье — скорость боя; кольца — уровни «Прицельного выстрела» и «Шквала стрел».</p></article><article className="farm-rule"><b>Контрольные ориентиры</b><p>Точность около 1 100–1 200 для обычного PvE; для рейда Ludra гайд приводит 1 200–1 300. Критический шанс ограничен 50%, а «Помечающий выстрел» даёт +300 крит. удара.</p></article></div><p className="farm-library-foot">Ориентиры взяты из гайда Стрелка и прогрессии сезона 1. Проверяй реальные строки и пороги в своём клиенте: патчи и региональные различия могут менять оптимальные значения.</p></section><section className="farm-library"><div className="farm-library-head"><div><p className="eyebrow">СПРАВОЧНИК И ИНСТРУМЕНТЫ</p><h3>Базы данных и полезные гайды</h3><p className="muted">Быстрые ссылки для проверки дропа, характеристик предметов, механик боссов и актуальных билдов.</p></div><span className="tag">{FARM_RESOURCES.length} источников</span></div><div className="farm-resource-grid">{FARM_RESOURCES.map(item=><article className="farm-resource" key={item.url}><small>{item.category}</small><b>{item.name}</b><p>{item.description}</p><a href={item.url} target="_blank" rel="noreferrer">{item.label} ↗</a></article>)}</div><p className="farm-library-foot">Фанатские базы могут обновляться с задержкой и различаться по региону. Для дропа сначала выбирай Global / EU и сверяй порог входа с клиентом игры; рекомендации по мета-сборкам не являются гарантией прироста DPS.</p></section></section>}
    <footer>Фанатский помощник · Только чтение · {profile?"Профиль загружен":"Ожидание загрузки профиля"}{updated?" · "+updated:""}</footer>
  </main>;
}
function ArcanaMetaCard({item,index}) { return <article className="arcana-meta-card"><div className="farm-card-top"><span className="farm-index">{String(index+1).padStart(2,"0")}</span><span className="priority">{item.slot}</span></div>{item.best?<><b>{item.best}</b><strong>{item.share}%</strong><small>{item.alternative}</small></>:<><b>Нет подтверждённого лидера</b><small>{item.alternative}</small></>}</article>; }
function MetaStigmaCard({item,index}) { const pct=item.level==null?0:Math.min(100,item.level/item.target*100); return <article className="meta-stigma-card"><div className="meta-skill-top"><span className="farm-index">{String(index+1).padStart(2,"0")}</span><span className="priority">{item.priority}</span></div><b>{item.name}</b><div className="meta-level">{item.level==null?"Нет данных":"Ур. "+item.level}<span>Рубеж {item.target}</span></div><div className="meta-progress"><i style={{width:pct+"%"}}/></div><small className="meta-cohort">Мировая выборка: {item.globalShare}%</small></article>; }
function MetaSkillCard({item,index}) { const pct=item.level==null?0:Math.min(100,item.level/item.target*100); return <article className="meta-skill-card"><div className="meta-skill-top"><span className="farm-index">{String(index+1).padStart(2,"0")}</span><span className="priority">{item.priority}</span></div><h3>{item.name}</h3><div className="meta-level">{item.level==null?"Нет данных":"Ур. "+item.level}<span>Рубеж {item.target}</span></div><div className="meta-progress"><i style={{width:pct+"%"}}/></div><p>{item.note}</p><small className="meta-cohort">Мировая выборка: средний уровень {item.globalAverage} · PvE в Корее, уровень 20+: {item.koreanPve20}%</small></article>; }
function FarmCard({item,index}) { return <details className="farm-accordion" open={index===0}><summary><span className="farm-rank">{String(index+1).padStart(2,"0")}</span><span className="farm-summary-copy"><b>{item.title}</b><small>{item.detail}</small></span><span className={"farm-priority "+(item.priority==="Высокий"?"is-high":item.priority==="Позже"?"is-later":"")}>{item.priority}</span><span className="chevron">⌄</span></summary><div className="farm-detail"><div className="farm-detail-label">МАРШРУТ И ПОЯСНЕНИЯ</div><ol>{item.how.map((line,i)=><li key={i}>{line}</li>)}</ol><div className="farm-detail-foot"><span>Цель: {item.target}</span><span>Приоритет: {item.priority}</span>{item.sourceUrl&&<a className="farm-source" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel||"Источник данных"} ↗</a>}</div></div></details>; }
function Metric({label,value,hint}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
function Status({label,value}){return <div className="status-row"><span>{label}</span><b>{value}</b></div>}
function DataRow({title,detail}){return <div className="plan-row"><span className="number">•</span><div className="plan-copy"><b>{title}</b><p>{detail}</p></div></div>}
function StatCard({item}) {
  const icon = imageSource(get(item,"icon","iconUrl","image","imageUrl","thumbnail"));
  return <article className={"stat-card "+(item.available===false?"stat-card-missing":"")}><div className="stat-card-icon">{icon?<img src={icon} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<span>{statIcon(item.name)}</span>}</div><div className="stat-card-copy"><small>{localizeGameText(item.group)}</small><b>{localizeGameText(item.name)}</b><strong>{typeof item.value==="number" ? fmt(item.value) : String(item.value ?? "—")}</strong></div></article>;
}
function VisualRow({item,kind}) {
  const name=localizeGameText(get(item,"name","itemName","skillName"))||"Без названия";
  const icon=imageSource(get(item,"icon","iconUrl","image","imageUrl","thumbnail"));
  const meta=kind==="skill"?["Ур. "+(get(item,"skillLevel","level")??"—"),localizeGameText(get(item,"category")),item.equip?"Надет":null].filter(Boolean).join(" · "):[localizeGameText(get(item,"slotPosName","slot")),localizeGameText(get(item,"grade")),item.enchantLevel!=null?"+"+item.enchantLevel:null].filter(Boolean).join(" · ");
  return <div className="visual-row"><div className={"visual-icon "+(kind==="skill"?"skill-icon":"")}>{icon?<img src={icon} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<span>{kind==="skill"?"✦":"◇"}</span>}</div><div className="visual-copy"><b>{name}</b><small>{meta||"—"}</small></div>{kind==="skill"&&<span className="skill-level">{get(item,"skillLevel","level")??""}</span>}</div>;
}
function Empty({error}){return <div className="empty-state"><span>＋</span><b>{error?"Не удалось получить данные из источника":"В этом разделе пока нет данных"}</b><small>{error||"Попробуй обновить профиль позже."}</small></div>}
