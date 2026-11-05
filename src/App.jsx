import React, { useEffect, useMemo, useState } from "react";

const CHARACTER = {
  name: "v4mp",
  serverId: "2316",
  characterId: "6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY=",
  region: "eu",
  sourceUrl: "https://notmeter.com/?view=character&serverId=2316&characterId=6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY%3D&name=v4mp&region=ww&globalRegion=eu"
};

const tabs = ["Обзор", "Экипировка", "Статы", "Навыки", "Дэва", "План фарма"];
const asArray = value => Array.isArray(value) ? value : [];
const pick = (obj, ...keys) => {
  for (const key of keys) if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") return obj[key];
  return null;
};
const num = value => value == null ? "—" : Number(value).toLocaleString("ru-RU");

function App() {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("Обзор");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");

  const equipment = useMemo(() => asArray(profile?.equipment?.equipmentList), [profile]);
  const skills = useMemo(() => asArray(profile?.skill?.skillList), [profile]);
  const stats = useMemo(() => asArray(profile?.stat?.statList), [profile]);
  const boards = useMemo(() => asArray(profile?.daevanion?.boardList), [profile]);
  const character = profile?.profile || {};

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/profile");
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось получить данные персонажа.");
      setProfile(result.data);
      setUpdated(new Date().toLocaleString("ru-RU"));
    } catch (e) {
      setError(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProfile(); }, []);

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">A2</span><span>AION 2 <b>BUILD LAB</b></span></a>
      <div className="top-actions"><span className="live-dot">LIVE PROFILE</span><a className="profile-link" href={CHARACTER.sourceUrl} target="_blank" rel="noreferrer">NotMeter ↗</a></div>
    </header>

    <section className="hero">
      <div><p className="eyebrow">CHARACTER ANALYZER / EUROPE</p><h1>{pick(character, "name") || CHARACTER.name}<em>’s build</em></h1><p className="sub">{pick(character, "className", "class") || "Ranger"} <span>•</span> EU · Kromede <span>•</span> {pick(character, "level") ? "Lv. " + pick(character, "level") : "Уровень —"}</p></div>
      <div className="hero-actions"><button className="primary" onClick={loadProfile} disabled={loading}>{loading ? "Загружаю…" : "Обновить профиль ↻"}</button></div>
    </section>

    {error && <section className="panel"><b>Не удалось загрузить профиль</b><p className="muted">{error}</p><button className="secondary" onClick={loadProfile}>Повторить</button></section>}

    <section className="metrics">
      <Metric label="COMBAT POWER" value={num(pick(character, "combatPower", "combat_power"))} hint="Официальные данные персонажа" />
      <Metric label="GEAR / ITEM LEVEL" value={num(pick(character, "itemLevel", "item_level"))} hint="Значение из профиля" />
      <Metric label="ЭКИПИРОВКА" value={equipment.length ? equipment.length + " предметов" : "—"} hint="Список с официальной страницы" />
    </section>

    <nav className="tabs">{tabs.map(t => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>

    {tab === "Обзор" && <section className="content-grid">
      <article className="panel main-panel"><div className="panel-head"><div><p className="eyebrow">CHARACTER DATA</p><h2>Профиль персонажа</h2></div><span className="tag">{profile ? "Загружено" : "Загрузка"}</span></div>
        <div className="status-row"><span>Персонаж</span><b>{pick(character, "name") || CHARACTER.name}</b></div>
        <div className="status-row"><span>Класс</span><b>{pick(character, "className", "class") || "Ranger"}</b></div>
        <div className="status-row"><span>Сервер</span><b>{pick(character, "serverName", "server") || "Kromede · EU"}</b></div>
        <div className="status-row"><span>Экипировка</span><b>{equipment.length || "—"} предметов</b></div>
        <div className="status-row"><span>Навыки</span><b>{skills.length || "—"}</b></div>
        <p className="disclaimer">Источник — публичные данные персонажа AION 2, которые использует NotMeter. Никаких ручных JSON-вставок и выдуманных характеристик.</p>
      </article>
      <aside className="panel"><p className="eyebrow">DATA STATUS</p><h2>Состояние импорта</h2><div className="status-row"><span>Профиль</span><b className={profile ? "ok" : "muted"}>{profile ? "Получен" : loading ? "Загрузка…" : "Ожидание"}</b></div><div className="status-row"><span>Статы</span><b>{stats.length || "—"}</b></div><div className="status-row"><span>Дэва</span><b>{boards.length || "—"}</b></div><div className="callout">{updated ? "Обновлено: " + updated : "Автоматически загружаю v4mp с EU Kromede."}</div></aside>
    </section>}

    {tab === "Экипировка" && <section className="panel"><h2>Экипировка</h2>{equipment.length ? equipment.map((item,i)=><DataRow key={i} title={pick(item,"name","itemName") || "Предмет"} detail={[pick(item,"slotPosName","slot"), pick(item,"grade"), pick(item,"enchantLevel") != null ? "+"+item.enchantLevel : null].filter(Boolean).join(" · ")} />) : <Empty loading={loading} />}</section>}
    {tab === "Статы" && <section className="panel"><h2>Боевые характеристики</h2>{stats.length ? stats.map((s,i)=><DataRow key={i} title={pick(s,"name","type") || "Параметр"} detail={pick(s,"value") ?? "—"} />) : <Empty loading={loading} />}</section>}
    {tab === "Навыки" && <section className="panel"><h2>Навыки</h2>{skills.length ? skills.map((s,i)=><DataRow key={i} title={pick(s,"name") || "Навык"} detail={["Ур. "+(pick(s,"skillLevel","level") ?? "—"),pick(s,"category"),pick(s,"equip") ? "Экипирован" : null].filter(Boolean).join(" · ")} />) : <Empty loading={loading} />}</section>}
    {tab === "Дэва" && <section className="panel"><h2>Дэва/Дэваanion</h2>{boards.length ? boards.map((b,i)=><DataRow key={i} title={pick(b,"name") || "Доска"} detail={(pick(b,"openNodeCount") ?? "—")+" / "+(pick(b,"totalNodeCount") ?? "—")+" узлов"} />) : <Empty loading={loading} />}</section>}
    {tab === "План фарма" && <section className="panel"><h2>План фарма</h2><p className="muted">Сначала загружаем реальные предметы, характеристики и навыки. После этого добавим сравнение апгрейдов по приросту босс-DPS, GS и БМ — без фиктивных оценок.</p><Empty loading={loading} /></section>}

    <footer>Fan-made companion · Read-only · {profile ? "Данные получены" : "Ожидание данных"}{updated ? " · " + updated : ""}</footer>
  </main>;
}

function Metric({label,value,hint}) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
function DataRow({title,detail}) { return <div className="plan-row"><span className="number">•</span><div className="plan-copy"><b>{title}</b><p>{detail}</p></div></div>; }
function Empty({loading}) { return <div className="empty-state"><span>＋</span><b>{loading ? "Загружаю данные…" : "Нет данных в ответе источника"}</b><small>{loading ? "Подожди немного." : "Нажми «Обновить профиль» и попробуй ещё раз."}</small></div>; }

export default App;
