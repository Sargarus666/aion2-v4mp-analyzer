import React, { useMemo, useState } from "react";

const initial = {
  character: "v4mp", className: "Ranger", region: "Global EU · Kromede",
  gearScore: 2200, combatPower: 100000,
  profileUrl: "https://shugo.gg/character/global/eu-kromede/v4mp",
  equipment: [], stats: {}, skills: [], arcana: []
};

const tabs = ["Обзор", "Экипировка", "Статы", "Навыки", "Арканы", "План фарма"];
const demoPlan = [
  { name: "Проверить оружие и его альтернативы", why: "Для DPS по боссам сравнивать нужно базовые параметры, заточку, слоты и активные эффекты.", priority: "Высокий", status: "Нужны данные предмета" },
  { name: "Сравнить аксессуары по статам", why: "Искать прирост точности/критов и профильных характеристик, а не только GS.", priority: "Высокий", status: "Нужны данные предметов" },
  { name: "Проверить арканы и специализации навыков", why: "Эффект на ротацию и урон нельзя достоверно вывести из одного Combat Power.", priority: "Средний", status: "Нужен импорт" }
];

function Metric({ label, value, hint }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

export default function App() {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState("Обзор");
  const [goal, setGoal] = useState("boss");
  const [scope, setScope] = useState("global");
  const [notice, setNotice] = useState("Профиль указан вручную. Нажми «Загрузить профиль», чтобы попробовать импорт.");
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(null);

  const plan = useMemo(() => {
    if (goal === "gs") return [...demoPlan].sort((a,b) => (a.name.includes("оружие") ? -1 : 1));
    return demoPlan;
  }, [goal]);

  async function importProfile() {
    setLoading(true);
    setNotice("Загружаю публичную страницу Shugo.GG…");
    try {
      const response = await fetch("/api/profile?url=" + encodeURIComponent(data.profileUrl), { headers: { Accept: "application/json" } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось импортировать профиль.");
      const profile = result.profile;
      setImported(profile);
      setData(prev => ({
        ...prev,
        character: profile.character || prev.character,
        className: profile.className || prev.className,
        gearScore: profile.gearScore ?? prev.gearScore,
        combatPower: profile.combatPower ?? prev.combatPower,
        equipment: profile.equipment?.length ? profile.equipment : prev.equipment
      }));
      setNotice("Профиль прочитан. Импортировано предметов с уровнем заточки: " + (profile.equipment?.length || 0) + ". Проверь дату обновления в источнике.");
    } catch (error) {
      setNotice(error.message + " Можно продолжить через JSON-импорт.");
    } finally {
      setLoading(false);
    }
  }

  function importJson() {
    try {
      const parsed = JSON.parse(jsonText);
      setData(prev => ({ ...prev, ...parsed }));
      setNotice("JSON импортирован. Проверь, что поля соответствуют твоему персонажу.");
    } catch {
      setNotice("Не удалось прочитать JSON. Проверь синтаксис.");
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ ...data, importedProfile: imported }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "v4mp-build.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">A2</span><span>AION 2 <b>BUILD LAB</b></span></a>
      <div className="top-actions"><span className="live-dot">MVP · READ ONLY</span><a className="profile-link" href={data.profileUrl} target="_blank" rel="noreferrer">Shugo.GG ↗</a></div>
    </header>

    <section className="hero">
      <div><p className="eyebrow">CHARACTER ANALYZER / GLOBAL</p><h1>{data.character}<em>’s build</em></h1><p className="sub">{data.className} <span>•</span> {data.region}</p></div>
      <div className="hero-actions"><button className="secondary" onClick={exportJson}>Экспорт JSON ↓</button><button className="primary" onClick={importProfile} disabled={loading}>{loading ? "Загрузка…" : "Загрузить профиль ↻"}</button></div>
    </section>

    <section className="metrics">
      <Metric label="GEAR SCORE" value={Number(data.gearScore || 0).toLocaleString("ru-RU")} hint={imported?.gearScore ? "Получено из публичного профиля" : "Последнее сохранённое значение"} />
      <Metric label="COMBAT POWER" value={Number(data.combatPower || 0).toLocaleString("ru-RU")} hint={imported?.combatPower ? "Получено из публичного профиля" : "Не является оценкой DPS"} />
      <Metric label="ЦЕЛЬ ОПТИМИЗАЦИИ" value={goal === "boss" ? "Boss DPS" : goal === "gs" ? "Gear Score" : goal === "cp" ? "Combat Power" : "Баланс"} hint="Выбери критерий ниже" />
    </section>

    <nav className="tabs">{tabs.map(t => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>

    {tab === "Обзор" && <section className="content-grid">
      <article className="panel main-panel"><div className="panel-head"><div><p className="eyebrow">OPTIMIZATION</p><h2>Приоритеты развития</h2></div><span className="tag">Черновой план</span></div>
        <div className="selectors"><label>Цель<select value={goal} onChange={e => setGoal(e.target.value)}><option value="boss">Максимум DPS по боссам</option><option value="gs">Максимальный GS</option><option value="cp">Максимальный БМ</option><option value="balanced">Сбалансированно</option></select></label><label>Сравнение<select value={scope} onChange={e => setScope(e.target.value)}><option value="global">Топ Global</option><option value="eu">EU Kromede</option><option value="all">Все регионы</option></select></label></div>
        {plan.map((p,i) => <div className="plan-row" key={p.name}><span className="number">0{i+1}</span><div className="plan-copy"><b>{p.name}</b><p>{p.why}</p><small>{p.status}</small></div><span className="priority">{p.priority}</span></div>)}
        <p className="disclaimer">Это пока структура рекомендаций, а не рассчитанный рейтинг апгрейдов. Точные приросты появятся после полноценного импорта параметров предметов и проверки формул.</p>
      </article>
      <aside className="panel"><p className="eyebrow">DATA STATUS</p><h2>Данные персонажа</h2><div className="status-row"><span>Профиль</span><b className={imported ? "ok" : "muted"}>{imported ? "Импортирован" : "Ссылка задана"}</b></div><div className="status-row"><span>Экипировка</span><b className={data.equipment?.length ? "ok" : "warn"}>{data.equipment?.length ? data.equipment.length + " предметов" : "Не импортирована"}</b></div><div className="status-row"><span>Навыки / арканы</span><b className="warn">Требуется отдельный разбор</b></div><div className="status-row"><span>Топовые билды</span><b className="warn">Источник не подключён</b></div><div className="callout">{notice}</div>{imported?.fetchedAt && <p className="muted">Получено: {new Date(imported.fetchedAt).toLocaleString("ru-RU")}</p>}</aside>
    </section>}

    {tab === "Экипировка" && <section className="panel"><h2>Экипировка</h2><p className="muted">Предметы, для которых удалось найти уровень заточки в публичном HTML профиля.</p>{data.equipment?.length ? data.equipment.map((item,i)=><div className="plan-row" key={item.name+i}><span className="number">＋{item.enchantLevel}</span><div className="plan-copy"><b>{item.name}</b><p>{item.source || "Импортированный предмет"} · слот пока не определён</p></div></div>) : <Empty />}</section>}
    {tab === "Статы" && <section className="panel"><h2>Боевые характеристики</h2><p className="muted">GS и БМ берутся из заголовка профиля. Полный список характеристик требует отдельного источника данных.</p>{imported?.description && <div className="callout">{imported.description}</div>}<Empty /></section>}
    {tab === "Навыки" && <section className="panel"><h2>Навыки и специализации</h2><p className="muted">Shugo.GG отображает приобретённые специальные навыки, но специализации навыков не предоставляет через публичный профиль.</p><Empty /></section>}
    {tab === "Арканы" && <section className="panel"><h2>Арканы</h2><p className="muted">Публичная страница может содержать названия аркан, но пока не все детали и эффекты.</p>{imported?.sections?.Arcana?.length ? imported.sections.Arcana.map((line,i)=><div className="plan-row" key={i}><span className="number">✦</span><div className="plan-copy"><b>{line}</b></div></div>) : <Empty />}</section>}
    {tab === "План фарма" && <section className="panel"><h2>План фарма</h2><p className="muted">Маршрут по данжам будет ранжироваться по ожидаемой выгоде: прирост GS, CP и отдельно DPS.</p>{plan.map(p => <div className="plan-row" key={p.name}><span className="number">→</span><div className="plan-copy"><b>{p.name}</b><p>{p.why}</p></div><span className="priority">{p.priority}</span></div>)}</section>}

    <section className="panel import-panel"><div className="panel-head"><div><p className="eyebrow">IMPORT / EXPORT</p><h2>Импорт данных персонажа</h2></div><span className="tag">JSON</span></div><p className="muted">Если публичная страница временно недоступна, можно импортировать JSON с полями character, className, gearScore, combatPower, equipment, stats, skills и arcana.</p><textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={'{\n  "gearScore": 2200,\n  "combatPower": 100000\n}'} /><div className="import-actions"><button className="primary" onClick={importJson}>Импортировать JSON</button><span className="notice">{notice}</span></div></section>
    <footer>Fan-made companion tool · Данные профиля читаются из публичной страницы Shugo.GG. Неофициальный проект.</footer>
  </main>;
}

function Empty() { return <div className="empty-state"><span>＋</span><b>Пока нет данных</b><small>Этот раздел заполнится, когда источник предоставит нужные поля.</small></div>; }
