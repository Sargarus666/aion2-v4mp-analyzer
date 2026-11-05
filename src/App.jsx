import React, { useEffect, useMemo, useState } from "react";
import { normalizeStatEntries } from "./lib/character-data.js";

const CHARACTER = {
  name: "v4mp", className: "Ranger", server: "EU · Kromede",
  sourceUrl: "https://notmeter.com/?view=character&serverId=2316&characterId=6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY%3D&name=v4mp&region=ww&globalRegion=eu"
};
const tabs = ["Обзор", "Экипировка", "Статы", "Навыки", "Дэва", "Мета PvE", "План фарма"];
const arr = v => Array.isArray(v) ? v : [];
const get = (o, ...keys) => { for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== "") return o[k]; return null; };
const fmt = v => v == null || v === "" ? "—" : Number(v).toLocaleString("ru-RU");
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

const META_SKILLS = [
  { name:"Deadshot", aliases:["Deadshot","Прицельный выстрел"], target:20, priority:"Критический", note:"Главный заряженный удар; применять под Precision." },
  { name:"Drill Dart", aliases:["Drill Dart","Пронзающая стрела"], target:16, priority:"Высокий", note:"На 16 уровне открывается дополнительная активация." },
  { name:"Gale Arrow", aliases:["Gale Arrow","Шквальная стрела"], target:16, priority:"Высокий", note:"Поддерживает Combat Speed и PvE Damage Boost." },
  { name:"Snipe", aliases:["Snipe","Меткий выстрел"], target:16, priority:"Высокий", note:"На 16 уровне помогает чаще возвращать Deadshot и добавляет цепочку." },
  { name:"Tempest Shot", aliases:["Tempest Shot","Скоростная стрельба"], target:16, priority:"Высокий", note:"Ориентир специализации — скорость применения." },
  { name:"Marking Shot", aliases:["Marking Shot","Помечающий выстрел"], target:12, priority:"Поддержка", note:"Продлевает окно Precision для Deadshot." },
  { name:"Snare Shot", aliases:["Snare Shot","Опутывающий выстрел"], target:12, priority:"Поддержка", note:"Накладывает Slow и открывает связку с Burst Arrow." }
];
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
function makeFarmPlan(items, stats, boards, skills) {
  const plan = [];
  const gaps = getSkillProgress(skills || []).filter(x => x.level != null && x.level < x.target).slice(0,3);
  gaps.forEach((x,i) => plan.push({
    title: "Навык: " + x.name,
    detail: "Сейчас ур. " + x.level + " · ориентир PvE " + x.target,
    how: [x.note, "Проверь бонусы к уровню навыка на кольцах, экипировке, Арканах и узлах Дэваanion.", "Сравни стоимость прямой прокачки с получением недостающего уровня через бонусы сборки."],
    priority: i === 0 ? "Высокий" : "Средний", target: "Умения"
  }));
  const equipped = items.filter(x => x && (x.name || x.itemName));
  const weapon = equipped.find(x => /weapon|bow|лук|оруж/i.test([x.slotPosName,x.slot,x.name,x.itemName].join(" ")));
  if (weapon) plan.push({
    title: "Лук",
    detail: "Текущий предмет: " + (weapon.name || weapon.itemName) + (weapon.enchantLevel != null ? " · заточка +" + weapon.enchantLevel : "") + (weapon.grade ? " · " + weapon.grade : ""),
    how: ["Сравнить базовую атаку и атакующие характеристики нового лука с текущим.", "Сначала проверить дроп в доступных тебе данжах и награды за недельные активности.", "Менять оружие только если прирост реального урона по боссу выше, чем от заточки/камней текущего."],
    priority: "Высокий", target: "Оружие"
  });
  else plan.push({
    title: "Проверить лук",
    detail: "API не вернул однозначно распознанный слот оружия.",
    how: ["Проверь, что список экипировки загрузился полностью.", "После появления названия лука и его характеристик можно сопоставить его с таблицей дропа."],
    priority: "Проверка данных", target: "Оружие"
  });
  const weak = equipped.filter(x => x.enchantLevel != null).sort((a,b)=>Number(a.enchantLevel)-Number(b.enchantLevel)).slice(0,3);
  weak.forEach(x => plan.push({
    title: (x.slotPosName || x.slot || "Слот") + ": " + (x.name || x.itemName),
    detail: (x.slotPosName || x.slot || "Предмет") + " · заточка +" + x.enchantLevel + (x.grade ? " · " + x.grade : ""),
    how: ["Сравнить стоимость следующего уровня заточки с заменой предмета на данжевый.", "Проверить, какие характеристики даёт слот: крит, точность, атака и другие бонусы.", "Не вкладывать редкие материалы в предмет, который скоро заменишь более высоким тиром."],
    priority: "Средний", target: x.slotPosName || "Экипировка"
  }));
  if (boards.length) {
    const incomplete = boards.filter(b => Number(b.openNodeCount ?? 0) < Number(b.totalNodeCount ?? 0));
    incomplete.forEach(b => plan.push({
      title: "Дэва: " + (b.name || "доска"),
      detail: (b.openNodeCount ?? "—") + " / " + (b.totalNodeCount ?? "—") + " открытых узлов",
      how: ["Открывать узлы, усиливающие урон Ranger и характеристики, влияющие на стабильность попаданий.", "Сверять бонус каждого узла с фактическими статами персонажа, а не выбирать только по Item Level.", "Для точного маршрута нужны данные nodeList и требования к каждому узлу."],
      priority: "Средний", target: "Дэваanion"
    }));
  }
  if (!plan.length) plan.push({title:"Недостаточно данных",detail:"Профиль пока не содержит экипировки для ранжирования.",how:["Обновить профиль и проверить источник данных."],priority:"Ожидание",target:"Профиль"});
  return plan;
}

export default function App() {
  const [profile,setProfile]=useState(null), [tab,setTab]=useState("Обзор"), [loading,setLoading]=useState(false), [error,setError]=useState(""), [updated,setUpdated]=useState("");
  async function loadProfile() {
    setLoading(true); setError("");
    try {
      const r=await fetch("/api/profile?refresh="+Date.now(),{cache:"no-store"});
      const result=await r.json();
      if(!r.ok || !result.ok) throw new Error(result.error || "Импорт не удался");
      setProfile(result.data); setUpdated(new Date().toLocaleString("ru-RU"));
    } catch(e) { setError(e.message || "Ошибка загрузки"); }
    finally { setLoading(false); }
  }
  useEffect(()=>{loadProfile();},[]);
  const character=profile?.profile || {};
  const equipment=arr(profile?.equipment?.equipmentList);
  const skins=arr(profile?.equipment?.skinList);
  const stats=statEntries(profile?.stat);
  const skills=arr(profile?.skill?.skillList);
  const boards=arr(profile?.daevanion?.boardList);
  const cp=get(character,"combatPower","combat_power") ?? statValue(stats,["CombatPower","Combat Power","CP"]);
  const gs=statValue(stats,["ItemLevel","Item Level","GearScore","Gear Score","GS"]) ?? get(character,"itemLevel","item_level","gearScore","gear_score");
  const skillMeta=getSkillProgress(skills);
  const farm=useMemo(()=>makeFarmPlan(equipment,stats,boards,skills),[profile]);
  const title=get(character,"name","characterName","character_name") || CHARACTER.name;
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">A2</span><span>AION 2 <b>BUILD LAB</b></span></a><div className="top-actions"><span className="live-dot">LIVE PROFILE</span><a className="profile-link" href={CHARACTER.sourceUrl} target="_blank" rel="noreferrer">NotMeter ↗</a></div></header>
    <section className="hero"><div><p className="eyebrow">CHARACTER ANALYZER / EUROPE</p><h1>{title}<em>’s build</em></h1><p className="sub">{get(character,"className","class") || CHARACTER.className} <span>•</span> {get(character,"serverName","server") || CHARACTER.server} <span>•</span> {get(character,"level","characterLevel") ? "Lv. "+get(character,"level","characterLevel") : "Уровень —"}</p></div><div className="hero-actions"><button className="primary" onClick={loadProfile} disabled={loading}>{loading?"Загружаю…":"Обновить профиль ↻"}</button></div></section>
    {error && <section className="panel error-panel" role="alert"><b>Не удалось загрузить персонажа</b><p className="muted">{error}</p><small>Источник: публичный API NCSOFT · Сервер 2316 · EU</small><button className="secondary" onClick={loadProfile}>Повторить</button></section>}
    <section className="metrics">
      <Metric label="GEAR SCORE / ITEM LEVEL" value={fmt(gs)} hint="Из statList / профиля NCSOFT"/>
      <Metric label="БОЕВАЯ МОЩЬ" value={fmt(cp)} hint="Combat Power персонажа"/>
      <Metric label="ЭКИПИРОВКА" value={equipment.length ? equipment.length+" предметов" : "—"} hint={equipment.length ? "Получено из API" : "Нет подтверждённых данных"}/>
    </section>
    <nav className="tabs" aria-label="Разделы анализатора">{tabs.map(t=><button key={t} className={tab===t?"active":""} aria-current={tab===t?"page":undefined} onClick={()=>setTab(t)}>{t}</button>)}</nav>
    {tab==="Обзор" && <><section className="content-grid"><article className="panel"><div className="panel-head"><div><p className="eyebrow">CHARACTER DATA</p><h2>Профиль персонажа</h2></div><span className="tag">{profile?"Данные получены":"Нет данных"}</span></div><Status label="Персонаж" value={title}/><Status label="Класс" value={get(character,"className","class") || CHARACTER.className}/><Status label="Сервер" value={get(character,"serverName","server") || CHARACTER.server}/><Status label="Уровень" value={get(character,"level","characterLevel") ?? "—"}/><Status label="Навыки" value={skills.length}/><p className="disclaimer">Только публичные данные NCSOFT. Значения GS и CP показываются отдельно и не подменяются расчётными числами.</p></article><aside className="panel"><p className="eyebrow">DATA STATUS</p><h2>Состав профиля</h2><Status label="Экипировка" value={equipment.length}/><Status label="Статы" value={stats.length}/><Status label="Навыки" value={skills.length}/><Status label="Дэва" value={boards.length}/><Status label="Образы/скины" value={skins.length}/><div className="callout">{updated?"Обновлено: "+updated:"Автозагрузка профиля v4mp."}</div></aside></section><section className="panel build-image-panel"><div className="panel-head"><div><p className="eyebrow">BUILD REFERENCE</p><h2>Текущий билд персонажа</h2></div><span className="tag">Скриншот</span></div><a className="build-image-link" href="https://raw.githubusercontent.com/Sargarus666/aion2-v4mp-analyzer/main/IMG_20261104_190217_860.jpg" target="_blank" rel="noreferrer"><img className="build-image" src="https://raw.githubusercontent.com/Sargarus666/aion2-v4mp-analyzer/main/IMG_20261104_190217_860.jpg" alt="Скриншот билда персонажа v4mp" loading="lazy"/></a><p className="muted">Скриншот билда из твоего GitHub. Нажми на изображение, чтобы открыть его в полном размере.</p></section></>}
    {tab==="Экипировка" && <section className="panel"><h2>Экипировка</h2>{equipment.length?<div className="visual-list">{equipment.map((x,i)=><VisualRow key={i} item={x} kind="item"/> )}</div>:<Empty error={error}/ >}{skins.length>0&&<><h2 className="section-subtitle">Облики</h2><div className="visual-list">{skins.map((x,i)=><VisualRow key={i} item={x} kind="item"/>)}</div></>}</section>}
    {tab==="Статы" && <section className="panel stats-panel"><div className="panel-head"><div><p className="eyebrow">CHARACTER ATTRIBUTES</p><h2>Характеристики</h2></div><span className="tag">{stats.length} параметров</span></div>{stats.length?<><div className="stats-grid">{stats.map((x,i)=><StatCard key={i} item={x}/>)}</div><p className="stats-note">Показаны основные характеристики и дополнительные бонусы, которые вернул публичный API. Если источник не публикует параметр, он не подменяется расчётным значением.</p></>:<Empty error={error}/>}</section>}
    {tab==="Навыки" && <section className="panel"><h2>Навыки</h2>{skills.length?<div className="visual-list">{skills.map((x,i)=><VisualRow key={i} item={x} kind="skill"/>)}</div>:<Empty error={error}/>}</section>}
    {tab==="Дэва" && <section className="panel"><h2>Дэваanion</h2>{boards.length?boards.map((x,i)=><DataRow key={i} title={get(x,"name")||"Доска"} detail={(x.openNodeCount??"—")+" / "+(x.totalNodeCount??"—")+" узлов"}/>):<Empty error={error}/>}</section>}
    {tab==="Мета PvE" && <section className="panel meta-panel"><div className="panel-head"><div><p className="eyebrow">RANGER · SINGLE TARGET</p><h2>Эталон PvE-билда</h2></div><span className="tag">Mobalytics · 2 ноя 2026</span></div><p className="muted meta-intro">Сверка уровней навыков с актуальными ориентирами Ranger для боссов. Целевые уровни — ориентиры из гайдов, а не команда тратить ресурсы любой ценой.</p><div className="meta-skill-grid">{skillMeta.map((x,i)=><MetaSkillCard key={x.name} item={x} index={i}/>)}</div><div className="meta-columns"><article className="meta-block"><span className="eyebrow">ПРИОРИТЕТ ХАРАКТЕРИСТИК</span><ol><li>PvE Damage Boost</li><li>Critical Damage Boost</li><li>Attack</li><li>Accuracy</li><li>MP Regen — если не хватает маны в длинном бою</li></ol><small>Редакционный приоритет для длительного PvE; Accuracy и MP Regen зависят от промахов и длительности боя.</small></article><article className="meta-block"><span className="eyebrow">РОТАЦИЯ ПО БОССУ</span><ol><li>Активируй Vaizel’s Authority, Supporting Fire и Bow of Blessing.</li><li>Запусти Gale Arrow и Griffon Arrow через атакующий макрос.</li><li>Примени Marking Shot, чтобы включить Precision.</li><li>Полностью заряди Deadshot вручную под Precision.</li><li>Продолжай атаковать через Snipe и макрос; обновляй Precision и береги баффы перед неуязвимостью босса.</li></ol><small>Deadshot и Marking Shot лучше держать на ручном нажатии.</small></article></div><div className="meta-sources"><span>Источники меты:</span><a href="https://mobalytics.gg/gamebase/guides/aion-2-ranger-pve-build" target="_blank" rel="noreferrer">Mobalytics · уровни навыков и ротация</a><a href="https://aion2companion.com/builds/ranger/" target="_blank" rel="noreferrer">AION2 Companion · приоритет статов (редакционный)</a></div></section>}
    {tab==="План фарма" && <section className="panel farm-panel"><div className="farm-heading"><div><p className="eyebrow">RANGER · BOSS DPS</p><h2>Фарм</h2></div><span className="tag">{farm.length} приоритетов</span></div><p className="muted farm-intro">Персональный список улучшений по экипировке, навыкам и Дэваanion. Точные данжи пока не указываю — для этого нужна подтверждённая таблица дропа.</p><div className="farm-grid">{farm.map((x,i)=><FarmCard key={i} item={x} index={i}/>)}</div>{!profile&&<Empty error={error}/>}</section>}
    <footer>Fan-made companion · Read-only · {profile?"Профиль загружен":"Ожидание профиля"}{updated?" · "+updated:""}</footer>
  </main>;
}
function MetaSkillCard({item,index}) { const pct=item.level==null?0:Math.min(100,item.level/item.target*100); return <article className="meta-skill-card"><div className="meta-skill-top"><span className="farm-index">{String(index+1).padStart(2,"0")}</span><span className="priority">{item.priority}</span></div><h3>{item.name}</h3><div className="meta-level">{item.level==null?"Нет в API":"Ур. "+item.level}<span>Цель {item.target}</span></div><div className="meta-progress"><i style={{width:pct+"%"}}/></div><p>{item.note}</p></article>; }
function FarmCard({item,index}) { return <article className="farm-card"><div className="farm-card-top"><span className="farm-index">{String(index+1).padStart(2,"0")}</span><span className="priority">{item.priority}</span></div><h3>{item.title}</h3><p className="farm-card-detail">{item.detail}</p><div className="farm-next"><span>СЛЕДУЮЩИЙ ШАГ</span><p>{item.how[0]}</p></div><div className="farm-card-foot"><span>{item.target}</span><span>По данным профиля</span></div></article>; }
function Metric({label,value,hint}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
function Status({label,value}){return <div className="status-row"><span>{label}</span><b>{value}</b></div>}
function DataRow({title,detail}){return <div className="plan-row"><span className="number">•</span><div className="plan-copy"><b>{title}</b><p>{detail}</p></div></div>}
function StatCard({item}) {
  const icon = imageSource(get(item,"icon","iconUrl","image","imageUrl","thumbnail"));
  return <article className="stat-card"><div className="stat-card-icon">{icon?<img src={icon} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<span>{statIcon(item.name)}</span>}</div><div className="stat-card-copy"><small>{item.group}</small><b>{item.name}</b><strong>{typeof item.value==="number" ? fmt(item.value) : String(item.value ?? "—")}</strong></div></article>;
}
function VisualRow({item,kind}) {
  const name=get(item,"name","itemName","skillName")||"Без названия";
  const icon=imageSource(get(item,"icon","iconUrl","image","imageUrl","thumbnail"));
  const meta=kind==="skill"?["Ур. "+(get(item,"skillLevel","level")??"—"),get(item,"category"),item.equip?"Экипирован":null].filter(Boolean).join(" · "):[get(item,"slotPosName","slot"),get(item,"grade"),item.enchantLevel!=null?"+"+item.enchantLevel:null].filter(Boolean).join(" · ");
  return <div className="visual-row"><div className={"visual-icon "+(kind==="skill"?"skill-icon":"")}>{icon?<img src={icon} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<span>{kind==="skill"?"✦":"◇"}</span>}</div><div className="visual-copy"><b>{name}</b><small>{meta||"—"}</small></div>{kind==="skill"&&<span className="skill-level">{get(item,"skillLevel","level")??""}</span>}</div>;
}
function Empty({error}){return <div className="empty-state"><span>＋</span><b>{error?"Источник не отдал данные":"Нет данных для этого раздела"}</b><small>{error||"Обнови профиль позже."}</small></div>}
