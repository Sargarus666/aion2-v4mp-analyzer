import React, { useEffect, useMemo, useState } from "react";
import { localizeGameText } from "../lib/game-localization.js";
import { formatItemStat } from "../lib/item-detail.js";

const asArray = value => Array.isArray(value) ? value : [];
const text = value => value == null || value === "" ? "—" : String(value);
const normalize = value => String(value ?? "").toLowerCase().normalize("NFKC").replace(/[^a-zа-яё0-9]+/gi, "");
const numberOf = value => {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/[+, ]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const groups = [
  { id:"offense", title:"Атака", match:/attack|damage|critical|accuracy|precision|penetration|combat.?speed|multihit|мощь|атака|урон|крит|точност|пробиван/i },
  { id:"defense", title:"Защита", match:/hp|max.?hp|health|defen|evasion|block|resist|tolerance|здоров|защит|уклон|блок|сопротив/i },
  { id:"utility", title:"Ресурсы и прочее", match:/mp|mana|cooldown|move.?speed|regeneration|мана|перезаряд|скорост.?передвиж/i },
  { id:"attributes", title:"Атрибуты персонажа", match:/might|strength|dexterity|intelligence|constitution|precision|willpower|сила|ловкость|интеллект|телослож|воля|меткость/i }
];
const sourceLabels = { mainStats:"Основные параметры", subStats:"Дополнительные параметры", magicStoneStat:"Магические камни", godStoneStat:"Божественный камень" };

async function fetchPool(items, worker, limit=4) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)}, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { out[index] = await worker(items[index]); }
      catch (error) { out[index] = { error:error?.message || "Источник недоступен" }; }
    }
  }));
  return out;
}
function classify(name) {
  return groups.find(group => group.match.test(name))?.id || "other";
}
function statKey(stat) {
  return normalize(stat?.id || stat?.name || stat?.desc || stat?.statName || "unknown");
}
function StatCard({ item, expanded, onClick }) {
  return <button type="button" className={"character-stat-card" + (expanded ? " is-expanded" : "")} onClick={onClick} aria-expanded={expanded}>
    <span className="character-stat-card-top"><small>{item.category}</small><span>{expanded ? "−" : "+"}</span></span>
    <b>{localizeGameText(item.name)}</b>
    <strong>{item.totalLabel}</strong>
    <small>{item.sources.length} источн.</small>
  </button>;
}
function SourceRows({ rows }) {
  if (!rows.length) return <p className="character-stat-source-empty">Отдельный источник не вернул этот параметр.</p>;
  return <div className="character-stat-source-list">{rows.map((row,index)=><div className="character-stat-source-row" key={row.key || index}>
    <div><b>{localizeGameText(row.source)}</b><small>{row.kind}{row.grade ? " · "+localizeGameText(row.grade) : ""}{row.enchant != null ? " · +"+row.enchant : ""}</small></div>
    <strong>{row.value}</strong>
  </div>)}</div>;
}
export default function CharacterStats({ stats=[], equipment=[], boards=[], title={}, error="" }) {
  const [gearRows,setGearRows] = useState([]);
  const [boardRows,setBoardRows] = useState([]);
  const [loading,setLoading] = useState(false);
  const [failures,setFailures] = useState(0);
  const [expanded,setExpanded] = useState("");
  const [filter,setFilter] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    async function load() {
      setLoading(true);
      const gearResults = await fetchPool(asArray(equipment).filter(item => item?.id && item?.slotPos), async item => {
        const query = new URLSearchParams({
          id:String(item.id), slotPos:String(item.slotPos),
          enchantLevel:String(item.enchantLevel ?? 0), exceedLevel:String(item.exceedLevel ?? 0)
        });
        const response = await fetch("/api/equipment-item?"+query.toString(),{cache:"no-store",signal:controller.signal});
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.error || "Детали предмета недоступны");
        return { item, detail:body.data || {} };
      },4);
      const boardResults = await fetchPool(asArray(boards).filter(board => board?.id), async board => {
        const response = await fetch("/api/daevanion?boardId="+encodeURIComponent(board.id),{cache:"no-store",signal:controller.signal});
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.error || "Доска недоступна");
        return { board, data:body.data || {} };
      },3);
      if (cancelled) return;
      setGearRows(gearResults.filter(row => row && !row.error));
      setBoardRows(boardResults.filter(row => row && !row.error));
      setFailures([...gearResults,...boardResults].filter(row => row?.error).length);
      setLoading(false);
    }
    load().catch(error => { if (!cancelled && error?.name !== "AbortError") { setLoading(false); setFailures(1); } });
    return () => { cancelled=true; controller.abort(); };
  },[equipment,boards]);

  const profileRows = useMemo(() => asArray(stats).flatMap((entry,index) => {
    if (!entry || typeof entry !== "object") return [];
    const name = entry.name || entry.statName || entry.type || "Параметр "+(index+1);
    return [{ key:"profile-"+index, name, value:text(entry.value), category:classify(name), source:entry.parentStat ? "Атрибут · "+entry.parentStat : "Профиль NCSOFT", kind:entry.parentStat ? "Вложенный бонус" : "Значение персонажа", raw:entry }];
  }),[stats]);

  const aggregate = useMemo(() => {
    const map = new Map();
    const add = row => {
      const name = row.name || row.desc || row.id || "Параметр";
      const key = statKey(row);
      if (!map.has(key)) map.set(key,{key,name,category:groups.find(group=>group.id===classify(name))?.title || "Другие параметры",sources:[],sum:0,extra:0,numericCount:0,extraCount:0});
      const target=map.get(key);
      const value=numberOf(row.value);
      const extra=numberOf(row.extra);
      if (value !== null) { target.sum+=value; target.numericCount++; }
      if (extra !== null) { target.extra+=extra; target.extraCount++; }
      target.sources.push(row);
    };
    gearRows.forEach(({item,detail}) => {
      Object.entries(sourceLabels).forEach(([key,label]) => asArray(detail[key]).forEach((stat,index) => add({
        ...stat,
        source:(item.name || "Предмет")+" · "+(item.slotPosName || "слот"),
        kind:label,
        grade:item.grade,
        enchant:item.enchantLevel,
        valueLabel:formatItemStat(stat),
        key:String(item.id)+":"+key+":"+index
      })));
    });
    return [...map.values()].sort((a,b)=>a.category.localeCompare(b.category,"ru") || a.name.localeCompare(b.name,"ru"));
  },[gearRows]);

  const boardEffects = useMemo(() => boardRows.flatMap(({board,data}) => asArray(data.openStatEffectList).map((effect,index) => ({
    key:String(board.id)+":"+index,
    name:typeof effect==="string"?effect:(effect?.desc || effect?.name || "Эффект"),
    source:"Даэванион · "+(board.name || "доска"),
    kind:"Открытый эффект доски",
    value:typeof effect==="string"?effect:(effect?.desc || effect?.name || "")
  }))),[boardRows]);

  const cards = useMemo(() => {
    const all = [...aggregate.map(item => ({
      ...item,
      totalLabel:item.numericCount ? item.sum.toLocaleString("ru-RU")+(item.extraCount && item.extra ? " (+"+item.extra.toLocaleString("ru-RU")+")" : "") : "—"
    }))];
    return all;
  },[aggregate]);
  const visible = cards.filter(item => filter==="all" || (filter==="other" ? item.category==="Другие параметры" : item.category===groups.find(group=>group.id===filter)?.title));
  const profileGroups = useMemo(() => {
    const order=["offense","defense","utility","attributes","other"];
    return order.map(id=>({id,title:groups.find(group=>group.id===id)?.title || "Другие данные",rows:profileRows.filter(row=>row.category===id)})).filter(group=>group.rows.length);
  },[profileRows]);

  return <section className="panel character-stats-panel">
    <div className="panel-head"><div><p className="eyebrow">СВОДКА ИСТОЧНИКОВ · NCSOFT</p><h2>Характеристики</h2></div><span className="tag">{aggregate.length} параметров</span></div>
    <div className="character-stats-intro"><div><b>Суммарные параметры экипировки</b><p>Собраны из подробных ответов NCSOFT: оружие, броня, аксессуары, магические камни и божественный камень. Нажми на параметр, чтобы увидеть каждый предмет-источник.</p></div><span>{gearRows.length}/{asArray(equipment).length} предметов</span></div>
    <div className="character-stats-filter">
      {[["all","Все"],["offense","Атака"],["defense","Защита"],["utility","Ресурсы"],["attributes","Атрибуты"],["other","Прочее"]].map(([id,label])=><button type="button" key={id} className={filter===id?"active":""} onClick={()=>setFilter(id)}>{label}</button>)}
    </div>
    {loading && <p className="character-stat-source-loading">Загружаем подробные характеристики экипировки…</p>}
    {visible.length ? <div className="character-stats-grid">{visible.map(item=><StatCard key={item.key} item={item} expanded={expanded===item.key} onClick={()=>setExpanded(expanded===item.key?"":item.key)}/>)}</div> :
      !loading && <div className="empty-state"><span>∑</span><b>Подробные характеристики не получены</b><small>{error || "Проверь доступность API NCSOFT и обнови профиль."}</small></div>}
    {expanded && cards.some(item=>item.key===expanded) && <section className="character-stat-detail">
      <div className="character-stat-detail-head"><span>РАЗБИВКА ИСТОЧНИКОВ</span><b>{localizeGameText(cards.find(item=>item.key===expanded).name)}</b></div>
      <SourceRows rows={cards.find(item=>item.key===expanded).sources.map(row=>({key:row.key,source:row.source,kind:row.kind,grade:row.grade,enchant:row.enchant,value:row.valueLabel || formatItemStat(row) || text(row.value)}))}/>
      {boardEffects.filter(effect=>normalize(effect.name).includes(normalize(cards.find(item=>item.key===expanded).name)) || normalize(cards.find(item=>item.key===expanded).name).includes(normalize(effect.name))).length>0 && <SourceRows rows={boardEffects.filter(effect=>normalize(effect.name).includes(normalize(cards.find(item=>item.key===expanded).name))).map(effect=>({...effect,value:effect.value}))}/>}
    </section>}
    <div className="character-profile-attributes">
      <div className="character-profile-attributes-head"><div><p className="eyebrow">БАЗОВЫЕ АТРИБУТЫ И БОНУСЫ</p><h3>Параметры персонажа</h3></div><span>{profileRows.length} строк NCSOFT</span></div>
      {profileGroups.length ? profileGroups.map(group=><section className="character-profile-attribute-group" key={group.id}><h4>{group.title}</h4>{group.rows.map(row=><div className="character-profile-attribute" key={row.key}><div><b>{localizeGameText(row.name)}</b><small>{row.source} · {row.kind}</small></div><strong>{localizeGameText(row.value)}</strong></div>)}</section>) : <p className="character-stat-source-empty">Профиль не вернул базовые атрибуты.</p>}
    </div>
    {title?.titleList?.length>0 && <div className="character-profile-attributes"><div className="character-profile-attributes-head"><div><p className="eyebrow">КОЛЛЕКЦИЯ ТИТУЛОВ</p><h3>Бонусы титулов из профиля</h3></div><span>{title.titleList.length} титулов</span></div>{title.titleList.slice(0,8).map(item=><section className="character-profile-attribute-group" key={item.id || item.name}><h4>{localizeGameText(item.name)}</h4>{[...asArray(item.equipStatList),...asArray(item.statList)].map((stat,index)=><div className="character-profile-attribute" key={index}><div><b>{localizeGameText(stat.name || stat.desc || "Бонус")}</b><small>{item.grade || "Титул"}</small></div><strong>{localizeGameText(stat.value || stat.desc || "—")}</strong></div>)}</section>)}</div>}
    {boardEffects.length>0 && <div className="character-profile-attributes"><div className="character-profile-attributes-head"><div><p className="eyebrow">ДАЭВАНИОН</p><h3>Активные бонусы досок</h3></div><span>{boardEffects.length} эффектов</span></div><div className="character-profile-attribute-group">{boardEffects.map(effect=><div className="character-profile-attribute" key={effect.key}><div><b>{localizeGameText(effect.source)}</b><small>Открытый узел</small></div><strong>{localizeGameText(effect.value)}</strong></div>)}</div></div>}
    {failures>0 && <p className="character-stat-source-warning">Не удалось загрузить {failures} источников. Суммы рассчитаны только по успешно полученным ответам.</p>}
    <p className="stats-note">Суммы складывают только числовые значения одноимённых строк NCSOFT. Базовые атрибуты, эффекты навыков и текстовые эффекты не смешиваются с числовыми итогами.</p>
  </section>;
}
