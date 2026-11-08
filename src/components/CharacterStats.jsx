import React, { useMemo, useState } from "react";
import { buildRelevantStatSections } from "../lib/character-data.js";
import { localizeGameText } from "../lib/game-localization.js";

const asArray = value => Array.isArray(value) ? value : [];
const valueText = value => value == null || value === "" ? "—" : String(value);
const sourceLabel = entry => entry?.sourceGroup === "statList" ? "Основные параметры NCSOFT"
  : entry?.sourceGroup === "statSecondList" ? "Вложенный бонус NCSOFT"
  : entry?.sourceGroup === "statAdditionalList" ? "Дополнительные параметры NCSOFT"
  : entry?.group || "Профиль NCSOFT";

function StatDetail({ item, entries }) {
  const related = entries.filter(entry =>
    entry === item.raw || entry.parentStat === item.sourceName ||
    entry.parentStat === item.label || entry.name === item.sourceName
  );
  return <div className="character-stat-detail">
    <div className="character-stat-detail-head"><span>ИСТОЧНИК ЗНАЧЕНИЯ</span><b>{sourceLabel(item.raw)}</b></div>
    <div className="character-stat-source-row"><span>Поле профиля</span><b>{item.sourceName || item.label}</b></div>
    <div className="character-stat-source-row"><span>Группа</span><b>{localizeGameText(item.raw?.group || "Основные")}</b></div>
    {related.filter(entry => entry !== item.raw).map((entry, index) =>
      <div className="character-stat-source-row" key={entry.id || entry.name + index}>
        <span>{localizeGameText(entry.name)}</span><b>{valueText(entry.value)}</b>
      </div>
    )}
    <p>Показано только то, что явно вернул публичный профиль NCSOFT. Значения из экипировки, камней, титулов и благословений не дорисовываются, если источник их отдельно не предоставил.</p>
  </div>;
}

export default function CharacterStats({ stats = [], error = "" }) {
  const [expanded, setExpanded] = useState("");
  const sections = useMemo(() => buildRelevantStatSections(stats).map(section => ({
    ...section,
    stats: section.stats.map(item => {
      const raw = stats.find(entry =>
        entry?.name === item.sourceName || entry?.statName === item.sourceName ||
        entry?.displayName === item.sourceName || entry?.value === item.value
      );
      return { ...item, raw: raw || null };
    })
  })).filter(section => section.stats.length), [stats]);
  const count = sections.reduce((sum, section) => sum + section.stats.length, 0);
  return <section className="panel character-stats-panel">
    <div className="panel-head"><div><p className="eyebrow">ПРОФИЛЬ NCSOFT · РАЗБОР ПО ПАРАМЕТРАМ</p><h2>Характеристики</h2></div><span className="tag">{count} значений</span></div>
    {sections.length ? <>
      <div className="character-stats-intro"><div><b>Сводка боевых параметров</b><p>Открой любую характеристику, чтобы посмотреть её исходное поле и доступные вложенные бонусы. Никаких расчётных значений без подтверждённого источника.</p></div><span>{stats.length} строк API</span></div>
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
                {isOpen && <StatDetail item={item} entries={stats}/>}
              </article>;
            })}
          </div>
        </section>)}
      </div>
      <p className="stats-note">Источники и точность: это значения из публичного профиля NCSOFT. Разбивка по отдельным предметам и камням появится только после получения соответствующих detail-данных; текущая сумма не маскируется под полноценную симуляцию Shugo.GG.</p>
    </> : <div className="empty-state"><span>∑</span><b>Характеристики пока не получены</b><small>{error || "Публичный профиль не вернул список параметров. Обнови профиль позже."}</small></div>}
  </section>;
}
