import { useMemo, useState } from "react";

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
  const [notice, setNotice] = useState("Профиль указан вручную. Автоматический парсер Shuggo.GG ещё не подключён.");
  const [jsonText, setJsonText] = useState("");

  const plan = useMemo(() => {
    if (goal === "gs") return [...demoPlan].sort((a,b) => (a.name.includes("оружие") ? -1 : 1));
    return demoPlan;
  }, [goal]);

  function importJson() {
    try {
      const parsed = JSON.parse(jsonText);
      setData(prev => ({ ...prev, ...parsed }));
      setNotice("JSON импортирован. Проверьте, что поля соответствуют вашему персонажу.");
    } catch {
      setNotice("Не удалось прочитать JSON. Проверьте синтаксис.");
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "v4mp-build.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">A2</span><span>AION 2 <b>BUILD LAB</b></span></a>
      <div className="top-actions"><span className="live-dot">MVP · LOCAL DATA</span><a className="profile-link" href={data.profileUrl} target="_blank" rel="noreferrer">Shuggo.GG ↗</a></div>
    </header>

    <section className="hero">
      <div><p className="eyebrow">CHARACTER ANALYZER / GLOBAL</p><h1>{data.character}<em>’s build</em></h1><p className="sub">{data.className} <span>•</span> {data.region}</p></div>
      <div className="hero-actions"><button className="secondary" onClick={exportJson}>Экспорт JSON ↓</button><a className="primary" href={data.profileUrl} target="_blank" rel="noreferrer">Открыть профиль ↗</a></div>
    </section>

    <section className="metrics">
      <Metric label="GEAR SCORE" value={Number(data.gearScore || 0).toLocaleString("ru-RU")} hint="Последнее значение от пользователя" />
      <Metric label="COMBAT POWER" value={Number(data.combatPower || 0).toLocaleString("ru-RU")} hint="Не является оценкой DPS" />
      <Metric label="ЦЕЛЬ ОПТИМИЗАЦИИ" value={goal === "boss" ? "Boss DPS" : goal === "gs" ? "Gear Score" : goal === "cp" ? "Combat Power" : "Баланс"} hint="Выберите критерий ниже" />
    </section>

    <nav className="tabs">{tabs.map(t => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>

    {tab === "Обзор" && <section className="content-grid">
      <article className="panel main-panel"><div className="panel-head"><div><p className="eyebrow">OPTIMIZATION</p><h2>Приоритеты развития</h2></div><span className="tag">Черновой план</span></div>
        <div className="selectors"><label>Цель<select value={goal} onChange={e => setGoal(e.target.value)}><option value="boss">Максимум DPS по боссам</option><option value="gs">Максимальный GS</option><option value="cp">Максимальный БМ</option><option value="balanced">Сбалансированно</option></select></label><label>Сравнение<select value={scope} onChange={e => setScope(e.target.value)}><option value="global">Топ Global</option><option value="eu">EU Kromede</option><option value="all">Все регионы</option></select></label></div>
        {plan.map((p,i) => <div className="plan-row" key={p.name}><span className="number">0{i+1}</span><div className="plan-copy"><b>{p.name}</b><p>{p.why}</p><small>{p.status}</small></div><span className="priority">{p.priority}</span></div>)}
        <p className="disclaimer">Это структура будущих рекомендаций, а не рассчитанный рейтинг апгрейдов. Точные приросты появятся после импорта экипировки и проверки формул/источников.</p>
      </article>
      <aside className="panel"><p className="eyebrow">DATA STATUS</p><h2>Данные персонажа</h2><div className="status-row"><span>Профиль</span><b className="muted">Ссылка задана</b></div><div className="status-row"><span>Экипировка</span><b className="warn">Не импортирована</b></div><div className="status-row"><span>Навыки / арканы</span><b className="warn">Не импортированы</b></div><div className="status-row"><span>Топовые билды</span><b className="warn">Источник не подключён</b></div><div className="callout">Не подменяем реальные данные выдуманными значениями. Следующий этап — изучить доступный формат страницы Shuggo.GG и подключить безопасный импорт.</div></aside>
    </section>}

    {tab === "Экипировка" && <section className="panel"><h2>Экипировка</h2><p className="muted">Здесь появится слотная таблица: предмет, уровень, заточка, манастоны, эффекты и альтернативы из данжей.</p><Empty /></section>}
    {tab === "Статы" && <section className="panel"><h2>Боевые характеристики</h2><p className="muted">Сырые значения будут импортироваться отдельно от GS и Combat Power. DPS не рассчитывается только по этим двум числам.</p><Empty /></section>}
    {tab === "Навыки" && <section className="panel"><h2>Навыки и специализации</h2><p className="muted">Планируется разбор уровней, выбранных специализаций и приоритетов ротации Стрелка.</p><Empty /></section>}
    {tab === "Арканы" && <section className="panel"><h2>Арканы</h2><p className="muted">Слоты, редкость, эффекты и варианты замены с оценкой прироста.</p><Empty /></section>}
    {tab === "План фарма" && <section className="panel"><h2>План фарма</h2><p className="muted">Маршрут по данжам будет ранжироваться по ожидаемой выгоде: прирост GS, CP и отдельно DPS.</p>{plan.map(p => <div className="plan-row" key={p.name}><span className="number">→</span><div className="plan-copy"><b>{p.name}</b><p>{p.why}</p></div><span className="priority">{p.priority}</span></div>)}</section>}

    <section className="panel import-panel"><div className="panel-head"><div><p className="eyebrow">IMPORT / EXPORT</p><h2>Импорт данных персонажа</h2></div><span className="tag">JSON</span></div><p className="muted">Можно импортировать JSON-объект с полями character, className, region, gearScore, combatPower, equipment, stats, skills, arcana и profileUrl.</p><textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={'{\n  "gearScore": 2200,\n  "combatPower": 100000\n}'} /><div className="import-actions"><button className="primary" onClick={importJson}>Импортировать JSON</button><span className="notice">{notice}</span></div></section>
    <footer>Fan-made companion tool · Неофициальный проект, не связан с NCSoft или Shuggo.GG.</footer>
  </main>;
}

function Empty() { return <div className="empty-state"><span>＋</span><b>Ожидает импорт</b><small>Добавьте данные персонажа через JSON, чтобы заполнить раздел.</small></div>; }
