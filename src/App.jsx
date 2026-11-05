import React, { useEffect, useMemo, useState } from "react";

const CHARACTER = {
  name: "v4mp",
  className: "Ranger",
  server: "EU · Kromede",
  sourceUrl: "https://notmeter.com/?view=character&serverId=2316&characterId=6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY%3D&name=v4mp&region=ww&globalRegion=eu"
};
const tabs = ["Обзор", "Экипировка", "Статы", "Навыки", "Дэва", "План фарма"];
const arr = v => Array.isArray(v) ? v : [];
const get = (o, ...keys) => { for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== "") return o[k]; return null; };
const fmt = v => v == null || v === "" ? "—" : Number(v).toLocaleString("ru-RU");
const norm = v => String(v ?? "").toLowerCase().replace(/[ _-]/g, "");

function statValue(list, names) {
  const hit = list.find(s => names.some(n => norm(s.name) === norm(n) || norm(s.type) === norm(n)));
  return hit?.value ?? null;
}
function makeFarmPlan(items, stats, boards) {
  const plan = [];
  const equipped = items.filter(x => x && (x.name || x.itemName));
  const weapon = equipped.filter(x => /weapon|bow|лук|оруж/i.test([x.slotPosName,x.slot,x.name,x.itemName].join(" ")));
  if (!weapon.length) plan.push({title:"Проверить основное оружие",detail:"В публичном ответе не найден слот оружия. Пока не подтверждено, что экипировка загружена полностью.",priority:"Проверка данных"});
  else {
    const w = weapon[0];
    plan.push({title:"Оружие — главный кандидат на апгрейд",detail:[w.name || w.itemName, w.enchantLevel != null ? "заточка +"+w.enchantLevel : null, w.grade].filter(Boolean).join(" · ") + ". Для Ranger сравнивай прирост урона по боссу, а не только GS.",priority:"Высокий"});
  }
  const weak = equipped.filter(x => x.enchantLevel != null).sort((a,b)=>Number(a.enchantLevel)-Number(b.enchantLevel)).slice(0,3);
  weak.forEach(x => plan.push({title:"Проверить улучшение: "+(x.name || x.itemName),detail:"Текущая заточка +"+x.enchantLevel+(x.slotPosName ? " · "+x.slotPosName : "")+". Сравнить стоимость улучшения с альтернативным дропом.",priority:"Средний"}));
  if (boards.length) {
    const incomplete = boards.filter(b => Number(b.openNodeCount ?? 0) < Number(b.totalNodeCount ?? 0));
    if (incomplete.length) plan.push({title:"Продвинуть Дэваanion",detail:incomplete.map(b => b.name+" "+(b.openNodeCount ?? 0)+"/"+(b.totalNodeCount ?? "?")).join(" · ")+". Выбирать узлы с атакующими характеристиками и полезными уровнями навыков.",priority:"Средний"});
  }
  if (!plan.length) plan.push({title:"Нужна детализация экипировки",detail:"Профиль получен, но данных пока недостаточно для честного ранжирования источников фарма.",priority:"Ожидание"});
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
  const stats=arr(profile?.stat?.statList);
  const skills=arr(profile?.skill?.skillList);
  const boards=arr(profile?.daevanion?.boardList);
  const cp=get(character,"combatPower","combat_power") ?? statValue(stats,["CombatPower","Combat Power","CP"]);
  const gs=statValue(stats,["ItemLevel","Item Level","GearScore","Gear Score","GS"]) ?? get(character,"itemLevel","item_level","gearScore","gear_score");
  const farm=useMemo(()=>makeFarmPlan(equipment,stats,boards),[profile]);
  const title=get(character,"name","characterName","character_name") || CHARACTER.name;
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">A2</span><span>AION 2 <b>BUILD LAB</b></span></a><div className="top-actions"><span className="live-dot">LIVE PROFILE</span><a className="profile-link" href={CHARACTER.sourceUrl} target="_blank" rel="noreferrer">NotMeter ↗</a></div></header>
    <section className="hero"><div><p className="eyebrow">CHARACTER ANALYZER / EUROPE</p><h1>{title}<em>’s build</em></h1><p className="sub">{get(character,"className","class") || CHARACTER.className} <span>•</span> {get(character,"serverName","server") || CHARACTER.server} <span>•</span> {get(character,"level","characterLevel") ? "Lv. "+get(character,"level","characterLevel") : "Уровень —"}</p></div><div className="hero-actions"><button className="primary" onClick={loadProfile} disabled={loading}>{loading?"Загружаю…":"Обновить профиль ↻"}</button></div></section>
    {error && <section className="panel error-panel"><b>Не удалось загрузить персонажа</b><p className="muted">{error}</p><small>Источник: публичный API NCSOFT · Сервер 2316 · EU</small><button className="secondary" onClick={loadProfile}>Повторить</button></section>}
    <section className="metrics">
      <Metric label="GEAR SCORE / ITEM LEVEL" value={fmt(gs)} hint="Из statList / профиля NCSOFT"/>
      <Metric label="БОЕВАЯ МОЩЬ" value={fmt(cp)} hint="Combat Power персонажа"/>
      <Metric label="ЭКИПИРОВКА" value={equipment.length ? equipment.length+" предметов" : "—"} hint={equipment.length ? "Получено из API" : "Нет подтверждённых данных"}/>
    </section>
    <nav className="tabs">{tabs.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</nav>
    {tab==="Обзор" && <section className="content-grid"><article className="panel"><div className="panel-head"><div><p className="eyebrow">CHARACTER DATA</p><h2>Профиль персонажа</h2></div><span className="tag">{profile?"Данные получены":"Нет данных"}</span></div><Status label="Персонаж" value={title}/><Status label="Класс" value={get(character,"className","class") || CHARACTER.className}/><Status label="Сервер" value={get(character,"serverName","server") || CHARACTER.server}/><Status label="Уровень" value={get(character,"level","characterLevel") ?? "—"}/><Status label="Навыки" value={skills.length}/><p className="disclaimer">Только публичные данные NCSOFT. Значения GS и CP показываются отдельно и не подменяются расчётными числами.</p></article><aside className="panel"><p className="eyebrow">DATA STATUS</p><h2>Состав профиля</h2><Status label="Экипировка" value={equipment.length}/><Status label="Статы" value={stats.length}/><Status label="Навыки" value={skills.length}/><Status label="Дэва" value={boards.length}/><div className="callout">{updated?"Обновлено: "+updated:"Автозагрузка профиля v4mp."}</div></aside></section>}
    {tab==="Экипировка" && <section className="panel"><h2>Экипировка</h2>{equipment.length?equipment.map((x,i)=><DataRow key={i} title={get(x,"name","itemName")||"Предмет"} detail={[get(x,"slotPosName","slot"),get(x,"grade"),x.enchantLevel!=null?"+"+x.enchantLevel:null].filter(Boolean).join(" · ")}/>):<Empty error={error}/>}</section>}
    {tab==="Статы" && <section className="panel"><h2>Боевые характеристики</h2>{stats.length?stats.map((x,i)=><DataRow key={i} title={get(x,"name","type")||"Статистика"} detail={get(x,"value")??"—"}/>):<Empty error={error}/>}</section>}
    {tab==="Навыки" && <section className="panel"><h2>Навыки</h2>{skills.length?skills.map((x,i)=><DataRow key={i} title={get(x,"name")||"Навык"} detail={["Ур. "+(get(x,"skillLevel","level")??"—"),get(x,"category"),x.equip?"Экипирован":null].filter(Boolean).join(" · ")}/>):<Empty error={error}/>}</section>}
    {tab==="Дэва" && <section className="panel"><h2>Дэваanion</h2>{boards.length?boards.map((x,i)=><DataRow key={i} title={get(x,"name")||"Доска"} detail={(x.openNodeCount??"—")+" / "+(x.totalNodeCount??"—")+" узлов"}/>):<Empty error={error}/>}</section>}
    {tab==="План фарма" && <section className="panel"><p className="eyebrow">RANGER / BOSS DPS</p><h2>Приоритет улучшений</h2><p className="muted">План строится по экипировке и прогрессу Дэваanion из профиля. Это предварительная оценка слотов, не симулятор DPS: точный прирост урона можно считать после получения характеристик предметов и эффектов.</p>{farm.map((x,i)=><div className="plan-row" key={i}><span className="number">{i+1}</span><div className="plan-copy"><b>{x.title}</b><p>{x.detail}</p></div><span className="priority">{x.priority}</span></div>)}{!profile&&<Empty error={error}/>}</section>}
    <footer>Fan-made companion · Read-only · {profile?"Профиль загружен":"Ожидание профиля"}{updated?" · "+updated:""}</footer>
  </main>;
}
function Metric({label,value,hint}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
function Status({label,value}){return <div className="status-row"><span>{label}</span><b>{value}</b></div>}
function DataRow({title,detail}){return <div className="plan-row"><span className="number">•</span><div className="plan-copy"><b>{title}</b><p>{detail}</p></div></div>}
function Empty({error}){return <div className="empty-state"><span>＋</span><b>{error?"Источник не отдал данные":"Нет данных для этого раздела"}</b><small>{error||"Обнови профиль позже."}</small></div>}
