import React, { useEffect, useMemo, useState } from "react";
import { buildRelevantStatSections } from "../lib/character-data.js";
import { localizeGameText } from "../lib/game-localization.js";
import { formatItemStat } from "../lib/item-detail.js";

const asArray = value => Array.isArray(value) ? value : [];
const valueText = value => value == null || value === "" ? "—" : String(value);
const keyOf = value => String(value ?? "").toLowerCase().normalize("NFKC").replace(/[^a-zа-яё0-9]+/gi, "");
const itemGroups = [
  ["mainStats", "Основные характеристики"],
  ["subStats", "Дополнительные характеристики"],
  ["magicStoneStat", "Магические камни"],
  ["godStoneStat", "Божественные камни"]
];
const aliasesFor = item => {
  const name = keyOf(item.sourceName || item.label);
  const aliases = {
    attack: ["attack", "attackbonus", "pveattack", "bossattack"],
    combatSpeed: ["combatspeed", "attackspeed"],
    criticalHit: ["criticalhit", "crithit", "criticalrate"],
    criticalDamage: ["criticaldamage", "criticaldamageboost", "critdamageboost"],
    accuracy: ["accuracy", "pveaccuracy"],
    weaponDamage: ["weapondamage", "weapondamageboost"],
    damageBoost: ["damageboost", "pvedamageboost", "bossdamageboost"],
    multiHit: ["multihitchance", "multihit"],
    penetration: ["penetration", "defensepenetration"],
    hp: ["hp", "maxhp", "health"],
    defense: ["defense", "defensebonus", "pvedefense"],
    evasion: ["evasion", "pveevasion"],
    block: ["block", "blockrate"],
    criticalResist: ["criticalhitresist", "criticalresist"],
    damageTolerance: ["damagetolerance", "pvedamagetolerance"],
    statusResist: ["statuseffectresist", "statusresist"],
    mp: ["mp", "maxmp", "mana"],
    mpRegen: ["mpregen", "manaregeneration"],
    cooldown: ["cooldownreduction", "cooldown"],
    moveSpeed: ["movespeed", "movementspeed"]
  };
  const id = String(item.id || "");
  return new Set([name, ...(aliases[id] || [])].filter(Boolean));
};
const matchesStat = (entry, aliases) => {
  const name = keyOf(entry?.name ?? entry?.statName ?? entry?.desc ?? entry?.typeName ?? entry?.id);
  return name && [...aliases].some(alias => name === alias || (alias.length > 5 && name.includes(alias)) || (name.length > 5 && alias.includes(name)));
};
const effectText = effect => typeof effect === "string" ? effect : effect?.desc || effect?.name || effect?.description || effect?.text || "";

async function fetchWithLimit(items, worker, limit = 4) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = await worker(items[index], index); }
      catch (error) { results[index] = { error: error?.message || "Ошибка запроса" }; }
    }
  }));
  return results;
}

function StatSources({ item, equipment, boards }) {
  const [result, setResult] = useState({ status: "idle", items: [], daevanion: [], failures: 0 });
  const aliases = useMemo(() => aliasesFor(item), [item]);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setResult({ status: "loading", items: [], daevanion: [], failures: 0 });
    const validEquipment = asArray(equipment).filter(row => row?.id && row?.slotPos);
    const validBoards = asArray(boards).filter(row => row?.id);
    Promise.all([
      fetchWithLimit(validEquipment, async row => {
        const query = new URLSearchParams({
          id: String(row.id), slotPos: String(row.slotPos),
          enchantLevel: String(row.enchantLevel ?? 0), exceedLevel: String(row.exceedLevel ?? 0)
        });
        const response = await fetch("/api/equipment-item?" + query.toString(), { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.error || "Детали предмета недоступны");
        const detail = body.data || {};
        const rows = itemGroups.flatMap(([key, label]) => asArray(detail[key])
          .filter(stat => matchesStat(stat, aliases))
          .map(stat => ({ ...stat, sourceGroup: label })));
        return { item: row, detail, rows };
      }, 3),
      fetchWithLimit(validBoards, async board => {
        const response = await fetch("/api/daevanion?boardId=" + encodeURIComponent(board.id), { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.error || "Доска недоступна");
        const data = body.data || {};
        const effects = asArray(data.openStatEffectList).map(effectText).filter(Boolean);
        const matches = effects.filter(text => {
          const normalized = keyOf(text);
          return [...aliases].some(alias => alias.length > 3 && normalized.includes(alias));
        });
        return { board, effects: matches };
      }, 3)
    ]).then(([itemResults, boardResults]) => {
      if (cancelled) return;
      const itemRows = itemResults.filter(row => row && !row.error && row.rows?.length);
      const boardRows = boardResults.filter(row => row && !row.error && row.effects?.length);
      const failures = [...itemResults, ...boardResults].filter(row => row?.error).length;
      setResult({ status: "ready", items: itemRows, daevanion: boardRows, failures });
    }).catch(error => {
      if (!cancelled && error?.name !== "AbortError") setResult({ status: "error", items: [], daevanion: [], failures: 1 });
    });
    return () => { cancelled = true; controller.abort(); };
  }, [equipment, boards, aliases]);

  if (result.status === "loading") return <div className="character-stat-source-loading">Сверяем предметы, камни и доски NCSOFT…</div>;
  if (result.status === "error") return <p className="character-stat-source-empty">Не удалось получить детализацию источников. Попробуй раскрыть характеристику ещё раз.</p>;
  const hasSources = result.items.length || result.daevanion.length;
  return <div className="character-stat-source-breakdown">
    {result.items.map(({ item: gear, rows, detail }, index) => <section className="character-stat-source-item" key={gear.id + ":" + (gear.slotPos || index)}>
      <div><b>{localizeGameText(gear.name || "Предмет")}</b><small>{localizeGameText(gear.slotPosName || "Экипировка")} · {localizeGameText(gear.grade || "")}{gear.enchantLevel != null ? " · +" + gear.enchantLevel : ""}</small></div>
      {rows.map((stat, i) => <p key={stat.id || stat.name + i}><span>{stat.sourceGroup}{stat.name ? " · " + localizeGameText(stat.name) : ""}</span><strong>{formatItemStat(stat) || valueText(stat.value)}</strong></p>)}
    </section>)}
    {result.daevanion.map(({ board, effects }) => <section className="character-stat-source-item" key={"board-" + board.id}>
      <div><b>Даэванион · {localizeGameText(board.name || "Доска")}</b><small>Активные эффекты открытых узлов</small></div>
      {effects.map((effect, index) => <p key={index}><span>Эффект доски</span><strong>{localizeGameText(effect)}</strong></p>)}
    </section>)}
    {!hasSources && <p className="character-stat-source-empty">В деталях экипировки и открытых досок NCSOFT не найден отдельный вклад этой характеристики. Это не означает нулевой вклад: источник мог не предоставить соответствующие поля.</p>}
    {result.failures > 0 && <p className="character-stat-source-warning">Часть источников не ответила ({result.failures}). Показаны только успешно полученные данные.</p>}
  </div>;
}

function StatDetail({ item, entries, equipment, boards }) {
  const related = entries.filter(entry =>
    entry === item.raw || entry.parentStat === item.sourceName ||
    entry.parentStat === item.label || entry.name === item.sourceName
  );
  return <div className="character-stat-detail">
    <div className="character-stat-detail-head"><span>СОСТАВ ХАРАКТЕРИСТИКИ</span><b>{item.sourceName || item.label}</b></div>
    <div className="character-stat-source-row"><span>Значение профиля NCSOFT</span><b>{valueText(item.value)}</b></div>
    {related.filter(entry => entry !== item.raw).map((entry, index) =>
      <div className="character-stat-source-row" key={entry.id || entry.name + index}>
        <span>{localizeGameText(entry.name)}</span><b>{valueText(entry.value)}</b>
      </div>
    )}
    <StatSources item={item} equipment={equipment} boards={boards}/>
    <p>Источники запрашиваются отдельно. Вклад отображается только при наличии соответствующего поля в ответе NCSOFT; недоступные значения не заменяются нулями или догадками.</p>
  </div>;
}

export default function CharacterStats({ stats = [], equipment = [], boards = [], error = "" }) {
  const [expanded, setExpanded] = useState("");
  const sections = useMemo(() => buildRelevantStatSections(stats).map(section => ({
    ...section,
    stats: section.stats.map(item => {
      const raw = stats.find(entry =>
        entry?.name === item.sourceName || entry?.statName === item.sourceName ||
        entry?.displayName === item.sourceName || entry?.statTypeName === item.sourceName
      );
      return { ...item, raw: raw || null };
    })
  })).filter(section => section.stats.length), [stats]);
  const count = sections.reduce((sum, section) => sum + section.stats.length, 0);
  return <section className="panel character-stats-panel">
    <div className="panel-head"><div><p className="eyebrow">АГРЕГАЦИЯ ИСТОЧНИКОВ · ПРОФИЛЬ NCSOFT</p><h2>Характеристики</h2></div><span className="tag">{count} значений</span></div>
    {sections.length ? <>
      <div className="character-stats-intro"><div><b>Сводка боевых параметров</b><p>Нажми на характеристику: соберём её подтверждённые значения из предметов, камней и открытых досок Даэваниона.</p></div><span>{stats.length} строк API</span></div>
      <div className="character-stats-sections">
        {sections.map(section => <section className="character-stats-group" key={section.id}>
          <div className="character-stats-group-head"><div><h3>{section.title}</h3><p>{section.description}</p></div><span>{section.stats.length}</span></div>
          <div className="character-stats-grid">
            {section.stats.map(item => {
              const id = section.id + ":" + item.id;
              const isOpen = expanded === id;
              return <article className={"character-stat-card" + (isOpen ? " is-expanded" : "")} key={item.id}>
                <button type="button" className="character-stat-trigger" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? "" : id)}>
                  <span className="character-stat-symbol">{item.icon ? "◈" : "✦"}</span>
                  <span className="character-stat-copy"><small>{item.hint}</small><b>{localizeGameText(item.label)}</b></span>
                  <strong>{valueText(item.value)}</strong><span className="character-stat-chevron">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && <StatDetail item={item} entries={stats} equipment={equipment} boards={boards}/>}
              </article>;
            })}
          </div>
        </section>)}
      </div>
      <p className="stats-note">Общее значение берётся из профиля NCSOFT. Детализация по экипировке, камням и Даэваниону загружается при раскрытии строки. Если источник не вернул вклад предмета или системы, он не будет выдуман.</p>
    </> : <div className="empty-state"><span>∑</span><b>Характеристики пока не получены</b><small>{error || "Публичный профиль не вернул список параметров. Обнови профиль позже."}</small></div>}
  </section>;
}
