import React, { useEffect, useMemo, useState } from "react";
import { normalizeDaevanionProgress, normalizeDaevanionBoard, safeImageSource } from "../lib/character-data.js";
import { localizeGameText } from "../lib/game-localization.js";

const asArray = value => Array.isArray(value) ? value : [];
const isOpen = node => node?.open === true || Number(node?.open) === 1;
const effectText = effect => typeof effect === "string" ? effect : effect?.desc || effect?.name || effect?.description || "";
const effects = value => asArray(value).map(effectText).filter(Boolean);
const boardName = board => localizeGameText(board?.name || board?.boardName || "Доска");

function NodeButton({ node, index, selected, onSelect, minRow, minCol }) {
  const row = Number(node.row);
  const col = Number(node.col);
  const positioned = Number.isFinite(row) && Number.isFinite(col);
  const label = node.name || node.type || "Узел " + (index + 1);
  return <button type="button" className={"daevanion-grid-node " + (isOpen(node) ? "is-open " : "is-locked ") + (selected ? "is-selected" : "")}
    style={positioned ? { gridRow: row - minRow + 1, gridColumn: col - minCol + 1 } : undefined}
    onClick={() => onSelect(node)} aria-label={localizeGameText(label) + (isOpen(node) ? ", открыт" : ", закрыт")}
    title={localizeGameText(label)}>
    <span>{isOpen(node) ? "◆" : "◇"}</span>
  </button>;
}

export default function DaevanionExplorer({ boards = [], error = "" }) {
  const [activeId, setActiveId] = useState("");
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const activeBoard = boards.find(board => String(board.id) === activeId) || boards[0] || null;
  const progress = normalizeDaevanionProgress(activeBoard || {});
  const normalized = useMemo(() => normalizeDaevanionBoard(detail || {}), [detail]);
  const nodes = normalized.nodeList;
  const visibleNodes = nodes.filter(node => filter === "all" || (filter === "open" ? isOpen(node) : !isOpen(node)));
  const positionedNodes = nodes.filter(node => Number.isFinite(Number(node.row)) && Number.isFinite(Number(node.col)));
  const minRow = positionedNodes.length ? Math.min(...positionedNodes.map(node => Number(node.row))) : 0;
  const minCol = positionedNodes.length ? Math.min(...positionedNodes.map(node => Number(node.col))) : 0;
  const maxRow = positionedNodes.length ? Math.max(...positionedNodes.map(node => Number(node.row))) : 14;
  const maxCol = positionedNodes.length ? Math.max(...positionedNodes.map(node => Number(node.col))) : 14;
  const gridRows = Math.max(1, maxRow - minRow + 1);
  const gridCols = Math.max(1, maxCol - minCol + 1);

  useEffect(() => {
    if (!activeBoard?.id) return;
    const controller = new AbortController();
    let cancelled = false;
    setDetail(null); setSelectedNode(null); setLoadError(""); setBusy(true);
    fetch("/api/daevanion?boardId=" + encodeURIComponent(activeBoard.id), {
      cache: "no-store", signal: controller.signal
    }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось загрузить узлы доски");
      if (!cancelled) setDetail(normalizeDaevanionBoard(result.data));
    }).catch(err => {
      if (!cancelled && err.name !== "AbortError") setLoadError(err.message || "Ошибка загрузки доски");
    }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [activeBoard?.id, reloadToken]);

  const openedEffects = effects(normalized.openStatEffectList);
  const skillEffects = effects(normalized.openSkillEffectList);
  const selectedEffects = effects(selectedNode?.effectList);
  const icon = safeImageSource(activeBoard?.icon);
  return <section className="panel daevanion-explorer">
    <div className="panel-head"><div><p className="eyebrow">ЖИВАЯ ДОСКА · ДАННЫЕ NCSOFT</p><h2>Даэванион</h2></div><span className="tag">{boards.length} досок</span></div>
    {boards.length ? <>
      <div className="daevanion-board-tabs" role="tablist" aria-label="Доски Даэваниона">
        {boards.map((board, index) => <button type="button" role="tab" aria-selected={String(board.id) === String(activeBoard?.id)}
          className={String(board.id) === String(activeBoard?.id) ? "active" : ""}
          key={board.id || board.name || index} onClick={() => { setActiveId(String(board.id)); setZoom(1); setFilter("all"); }}>
          {localizeGameText(board.name || "Доска " + (index + 1))}
        </button>)}
      </div>
      <div className="daevanion-board-summary">
        <div className="daevanion-board-identity">{icon && <img src={icon} alt="" loading="lazy"/>}<div><b>{boardName(activeBoard)}</b><small>{activeBoard?.open == null ? "Статус не указан" : Number(activeBoard.open) === 1 ? "Доска активна" : "Доска закрыта"}</small></div></div>
        <div className="daevanion-board-count"><strong>{progress.opened == null ? "—" : progress.opened}<small> / {progress.total ?? "—"}</small></strong><span>Открыто узлов</span></div>
        <div className="daevanion-board-percent"><strong>{progress.percent == null ? "—" : progress.percent + "%"}</strong><span>Прогресс</span></div>
      </div>
      {progress.percent != null && <div className="daevanion-progress-track" role="progressbar" aria-label={"Прогресс " + boardName(activeBoard)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><i style={{ width: progress.percent + "%" }}/></div>}
      {busy && <div className="daevanion-loading">Загружаем структуру доски и эффекты…</div>}
      {loadError && <div className="daevanion-error" role="alert"><span>{loadError}</span><button type="button" onClick={() => setReloadToken(value => value + 1)}>Повторить</button></div>}
      {!busy && detail && <>
        <div className="daevanion-workspace">
          <div className="daevanion-map-panel">
            <div className="daevanion-map-toolbar">
              <div><b>Карта узлов</b><small>{nodes.length} узлов · {positionedNodes.length ? "координатная сетка" : "список узлов"}</small></div>
              <div className="daevanion-map-actions">
                <button type="button" aria-label="Уменьшить" onClick={() => setZoom(value => Math.max(.65, +(value - .15).toFixed(2)))}>−</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" aria-label="Увеличить" onClick={() => setZoom(value => Math.min(1.75, +(value + .15).toFixed(2)))}>+</button>
              </div>
            </div>
            <div className="daevanion-map-legend"><span><i className="open"/>Открыт</span><span><i className="locked"/>Закрыт</span><span>{visibleNodes.length} показано</span></div>
            <div className="daevanion-map-viewport">
              {positionedNodes.length ? <div className="daevanion-node-grid" style={{ "--node-scale": zoom, "--grid-cols": gridCols, "--grid-rows": gridRows }}>
                {visibleNodes.map((node, index) => <NodeButton key={node.nodeId || node.id || index} node={node} index={index} selected={selectedNode === node} onSelect={setSelectedNode} minRow={minRow} minCol={minCol}/>)}
              </div> : <div className="daevanion-node-fallback">{visibleNodes.map((node, index) => <NodeButton key={node.nodeId || node.id || index} node={node} index={index} selected={selectedNode === node} onSelect={setSelectedNode} minRow={minRow} minCol={minCol}/>)}</div>}
            </div>
            <div className="daevanion-map-filters">
              <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Все узлы</button>
              <button type="button" className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>Открытые</button>
              <button type="button" className={filter === "locked" ? "active" : ""} onClick={() => setFilter("locked")}>Закрытые</button>
            </div>
          </div>
          <aside className="daevanion-node-inspector">
            <p className="eyebrow">ИНСПЕКТОР УЗЛА</p>
            {selectedNode ? <>
              <h3>{localizeGameText(selectedNode.name || selectedNode.type || "Узел")}</h3>
              <div className="daevanion-inspector-status">{isOpen(selectedNode) ? "◆ ОТКРЫТ" : "◇ ЗАКРЫТ"}{selectedNode.grade ? " · " + localizeGameText(selectedNode.grade) : ""}</div>
              <div className="daevanion-inspector-coord">{selectedNode.row != null && selectedNode.col != null ? "Ряд " + selectedNode.row + " · Колонка " + selectedNode.col : "Координаты не предоставлены"}</div>
              {selectedEffects.length ? selectedEffects.map((effect, index) => <p className="daevanion-inspector-effect" key={index}>{effect}</p>) : <p className="muted">Для этого узла источник не вернул отдельное описание эффекта.</p>}
            </> : <div className="daevanion-inspector-empty">Выбери узел на доске, чтобы посмотреть его статус и эффекты.</div>}
          </aside>
        </div>
        <div className="daevanion-effects-overview">
          <section><small>АКТИВНЫЕ ЭФФЕКТЫ ХАРАКТЕРИСТИК</small>{openedEffects.length ? openedEffects.map((effect,index) => <p key={index}>{effect}</p>) : <p className="muted">Нет данных</p>}</section>
          <section><small>АКТИВНЫЕ ЭФФЕКТЫ НАВЫКОВ</small>{skillEffects.length ? skillEffects.map((effect,index) => <p key={index}>{effect}</p>) : <p className="muted">Нет данных</p>}</section>
        </div>
      </>}
      <p className="stats-note">Узлы, координаты и эффекты запрашиваются отдельно из публичного endpoint NCSOFT для выбранной доски. Схема показывает только то, что реально вернул источник; закрытые узлы не считаются активными.</p>
    </> : <div className="empty-state"><span>◇</span><b>Доски Даэваниона не найдены</b><small>{error || "Профиль NCSOFT не вернул список досок."}</small></div>}
  </section>;
}
