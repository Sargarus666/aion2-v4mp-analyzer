import React, { useEffect, useMemo, useRef, useState } from "react";
import { normalizeDaevanionProgress, normalizeDaevanionBoard, safeImageSource } from "../lib/character-data.js";
import { findDaevanionPath, daevanionNodeCost } from "../lib/daevanion-planner.js";
import { localizeGameText } from "../lib/game-localization.js";

const asArray = value => Array.isArray(value) ? value : [];
const isOpen = node => node?.open === true || Number(node?.open) === 1;
const typeOf = node => String(node?.type ?? node?.nodeType ?? "").toLowerCase();
const isEmpty = node => ["none","empty","null",""].includes(typeOf(node));
const isSkill = node => /skill/.test(typeOf(node));
const isStart = node => /start/.test(typeOf(node)) || /^start$/i.test(String(node?.name || ""));
const effectText = effect => typeof effect === "string" ? effect : effect?.desc || effect?.name || effect?.description || effect?.text || "";
const effects = value => asArray(value).map(effectText).filter(Boolean);
const boardName = board => localizeGameText(board?.name || board?.boardName || "Доска");
const nodeKey = node => String(node?.nodeId ?? node?.id ?? (node?.row + ":" + node?.col));
const gradeClass = node => String(node?.gradeName ?? node?.grade ?? "").toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-");

function NodeButton({ node, index, selected, inPath, onSelect, minRow, minCol }) {
  const open = isOpen(node);
  const skill = isSkill(node);
  const start = isStart(node);
  const label = node.name || node.type || "Узел " + (index + 1);
  const icon = safeImageSource(node.icon);
  const cost = daevanionNodeCost(node);
  return <button type="button"
    className={"daevanion-grid-node " + (open ? "is-open " : "is-locked ") + (skill ? "is-skill " : "is-stat ") + (start ? "is-start " : "") + (inPath ? "is-route " : "") + (selected ? "is-selected " : "") + "grade-" + gradeClass(node)}
    style={{ gridRow:Number(node.row)-minRow+1, gridColumn:Number(node.col)-minCol+1 }}
    onClick={() => onSelect(node)}
    aria-label={localizeGameText(label)+(open?", открыт":", закрыт")+(cost?", стоимость "+cost:"")}
    title={localizeGameText(label)+(cost?" · "+cost+" крист.":"")}>
    {icon ? <img src={icon} alt="" loading="lazy" decoding="async"/> : <span>{start?"✦":skill?"✚":open?"◆":"◇"}</span>}
  </button>;
}

function BoardConnectors({ nodes, minRow, minCol, rows, cols, size, gap }) {
  const positions = new Set(nodes.map(node => Number(node.row)+":"+Number(node.col)));
  const width = cols*size+(cols-1)*gap;
  const height = rows*size+(rows-1)*gap;
  const lines = [];
  nodes.forEach(node => {
    const row=Number(node.row), col=Number(node.col);
    [[0,1],[1,0]].forEach(([dr,dc]) => {
      if (!positions.has((row+dr)+":"+(col+dc))) return;
      const x1=(col-minCol)*(size+gap)+size/2;
      const y1=(row-minRow)*(size+gap)+size/2;
      const x2=(col+dc-minCol)*(size+gap)+size/2;
      const y2=(row+dr-minRow)*(size+gap)+size/2;
      lines.push(<line key={row+":"+col+":"+dr+":"+dc} x1={x1} y1={y1} x2={x2} y2={y2}/>);
    });
  });
  return <svg className="daevanion-connectors" width={width} height={height} viewBox={"0 0 "+width+" "+height} aria-hidden="true">{lines}</svg>;
}

export default function DaevanionExplorer({ boards = [], error = "" }) {
  const [activeId,setActiveId] = useState("");
  const [detail,setDetail] = useState(null);
  const [busy,setBusy] = useState(false);
  const [loadError,setLoadError] = useState("");
  const [filter,setFilter] = useState("all");
  const [zoom,setZoom] = useState(1);
  const [reloadToken,setReloadToken] = useState(0);
  const [selectedNode,setSelectedNode] = useState(null);
  const [showRoute,setShowRoute] = useState(false);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const activeBoard = boards.find(board=>String(board.id)===activeId) || boards[0] || null;
  const progress = normalizeDaevanionProgress(activeBoard || {});
  const normalized = useMemo(()=>normalizeDaevanionBoard(detail || {}),[detail]);
  const nodes = normalized.nodeList.filter(node=>!isEmpty(node) && Number.isFinite(Number(node.row)) && Number.isFinite(Number(node.col)));
  const minRow = nodes.length ? Math.min(...nodes.map(node=>Number(node.row))) : 1;
  const minCol = nodes.length ? Math.min(...nodes.map(node=>Number(node.col))) : 1;
  const maxRow = nodes.length ? Math.max(...nodes.map(node=>Number(node.row))) : 1;
  const maxCol = nodes.length ? Math.max(...nodes.map(node=>Number(node.col))) : 1;
  const rowCount = maxRow-minRow+1;
  const colCount = maxCol-minCol+1;
  const nodeSize = Math.round(28*zoom);
  const nodeGap = Math.max(3,Math.round(6*zoom));
  const selectedPath = useMemo(()=>selectedNode?findDaevanionPath(normalized.nodeList,selectedNode):null,[normalized.nodeList,selectedNode]);
  const pathKeys = useMemo(()=>new Set(showRoute && selectedPath ? selectedPath.nodes.map(nodeKey):[]),[showRoute,selectedPath]);
  const visibleNodes = nodes.filter(node=>{
    if(filter==="open") return isOpen(node);
    if(filter==="locked") return !isOpen(node);
    if(filter==="skills") return isSkill(node);
    if(filter==="stats") return !isSkill(node) && !isStart(node);
    return true;
  });
  const openedEffects = effects(normalized.openStatEffectList);
  const skillEffects = effects(normalized.openSkillEffectList);
  const selectedEffects = effects(selectedNode?.effectList);
  const icon = safeImageSource(activeBoard?.icon);

  useEffect(()=>{
    if(!activeBoard?.id) return;
    const controller=new AbortController();
    let cancelled=false;
    setDetail(null);setSelectedNode(null);setShowRoute(false);setLoadError("");setBusy(true);
    fetch("/api/daevanion?boardId="+encodeURIComponent(activeBoard.id),{cache:"no-store",signal:controller.signal})
      .then(async response=>{
        const result=await response.json();
        if(!response.ok || !result.ok) throw new Error(result.error || "Не удалось загрузить узлы доски");
        if(!cancelled) setDetail(normalizeDaevanionBoard(result.data));
      })
      .catch(err=>{if(!cancelled && err.name!=="AbortError")setLoadError(err.message || "Ошибка загрузки доски");})
      .finally(()=>{if(!cancelled)setBusy(false);});
    return ()=>{cancelled=true;controller.abort();};
  },[activeBoard?.id,reloadToken]);

  const onPointerDown = event => {
    if(event.target.closest("button")) return;
    dragRef.current={x:event.clientX,y:event.clientY,left:viewportRef.current.scrollLeft,top:viewportRef.current.scrollTop};
    viewportRef.current.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = event => {
    if(!dragRef.current || !viewportRef.current) return;
    viewportRef.current.scrollLeft=dragRef.current.left-(event.clientX-dragRef.current.x);
    viewportRef.current.scrollTop=dragRef.current.top-(event.clientY-dragRef.current.y);
  };
  const stopDragging=()=>{dragRef.current=null;};

  return <section className="panel daevanion-explorer">
    <div className="panel-head"><div><p className="eyebrow">ИНТЕРАКТИВНАЯ КАРТА · NCSOFT</p><h2>Даэванион</h2></div><span className="tag">{boards.length} досок</span></div>
    {boards.length ? <>
      <div className="daevanion-board-tabs" role="tablist" aria-label="Доски Даэваниона">
        {boards.map((board,index)=><button type="button" role="tab" aria-selected={String(board.id)===String(activeBoard?.id)} className={String(board.id)===String(activeBoard?.id)?"active":""} key={board.id || board.name || index} onClick={()=>{setActiveId(String(board.id));setZoom(1);setFilter("all");}}>
          {localizeGameText(board.name || "Доска "+(index+1))}
        </button>)}
      </div>
      <div className="daevanion-board-summary">
        <div className="daevanion-board-identity">{icon && <img src={icon} alt="" loading="lazy"/>}<div><b>{boardName(activeBoard)}</b><small>{activeBoard?.open==null?"Статус не указан":Number(activeBoard.open)===1?"Доска активна":"Доска закрыта"}</small></div></div>
        <div className="daevanion-board-count"><strong>{progress.opened==null?"—":progress.opened}<small> / {progress.total??"—"}</small></strong><span>Открыто узлов</span></div>
        <div className="daevanion-board-percent"><strong>{progress.percent==null?"—":progress.percent+"%"}</strong><span>Прогресс</span></div>
      </div>
      {progress.percent!=null && <div className="daevanion-progress-track" role="progressbar" aria-label={"Прогресс "+boardName(activeBoard)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><i style={{width:progress.percent+"%"}}/></div>}
      {busy && <div className="daevanion-loading">Загружаем настоящую сетку узлов NCSOFT…</div>}
      {loadError && <div className="daevanion-error" role="alert"><span>{loadError}</span><button type="button" onClick={()=>setReloadToken(value=>value+1)}>Повторить</button></div>}
      {!busy && detail && <>
        <div className="daevanion-workspace">
          <div className="daevanion-map-panel">
            <div className="daevanion-map-toolbar"><div><b>Доска узлов</b><small>{nodes.length} игровых узлов · пустые клетки скрыты</small></div><div className="daevanion-map-actions">
              <button type="button" aria-label="Уменьшить" onClick={()=>setZoom(value=>Math.max(.65,+(value-.15).toFixed(2)))}>−</button><span>{Math.round(zoom*100)}%</span><button type="button" aria-label="Увеличить" onClick={()=>setZoom(value=>Math.min(1.8,+(value+.15).toFixed(2)))}>+</button><button type="button" aria-label="На весь экран" title="На весь экран" onClick={()=>viewportRef.current?.requestFullscreen?.()}>⛶</button>
            </div></div>
            <div className="daevanion-map-legend"><span><i className="open"/>Открыт</span><span><i className="locked"/>Закрыт</span><span><i className="skill"/>Навык</span><span><i className="route"/>Маршрут</span></div>
            <div className="daevanion-map-viewport" ref={viewportRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
              <div className="daevanion-node-grid" style={{"--grid-cols":colCount,"--grid-rows":rowCount,"--node-size":nodeSize+"px","--node-gap":nodeGap+"px"}}>
                <BoardConnectors nodes={nodes} minRow={minRow} minCol={minCol} rows={rowCount} cols={colCount} size={nodeSize} gap={nodeGap}/>
                {visibleNodes.map((node,index)=><NodeButton key={nodeKey(node)||index} node={node} index={index} selected={nodeKey(selectedNode)===nodeKey(node)} inPath={pathKeys.has(nodeKey(node))} minRow={minRow} minCol={minCol} onSelect={value=>{setSelectedNode(value);setShowRoute(false);}}/>)}
              </div>
            </div>
            <div className="daevanion-map-filters">
              {[["all","Все"],["open","Открытые"],["locked","Закрытые"],["skills","Навыки"],["stats","Характеристики"]].map(([id,label])=><button type="button" key={id} className={filter===id?"active":""} onClick={()=>setFilter(id)}>{label}</button>)}
            </div>
          </div>
          <aside className="daevanion-node-inspector">
            <p className="eyebrow">ИНСПЕКТОР УЗЛА</p>
            {selectedNode ? <>
              <h3>{localizeGameText(selectedNode.name || selectedNode.type || "Узел")}</h3>
              <div className="daevanion-inspector-status">{isOpen(selectedNode)?"◆ ОТКРЫТ":"◇ ЗАКРЫТ"}{selectedNode.grade?" · "+localizeGameText(selectedNode.grade):""}</div>
              <div className="daevanion-inspector-coord">Ряд {selectedNode.row} · Колонка {selectedNode.col} · {isSkill(selectedNode)?"Узел навыка":isStart(selectedNode)?"Стартовый узел":"Узел характеристики"}</div>
              {selectedEffects.length ? selectedEffects.map((effect,index)=><p className="daevanion-inspector-effect" key={index}>{localizeGameText(effect)}</p>) : <p className="muted">Отдельное описание эффекта для узла не предоставлено.</p>}
              {!isOpen(selectedNode) && selectedPath && <div className="daevanion-route-card"><b>Маршрут от стартового узла</b><div><strong>{selectedPath.crystalCost}</strong><span>кристаллов · {selectedPath.unopenedCount} закрытых узлов</span></div><button type="button" onClick={()=>setShowRoute(value=>!value)}>{showRoute?"Скрыть маршрут":"Показать маршрут"}</button><small>Кратчайший путь по соседним клеткам вверх, вниз, влево и вправо.</small></div>}
              {!selectedPath && !isOpen(selectedNode) && <p className="muted">Не удалось построить маршрут от стартового узла по доступной карте.</p>}
            </> : <div className="daevanion-inspector-empty">Выбери узел на доске, чтобы увидеть его тип, эффект, редкость и стоимость открытия.</div>}
          </aside>
        </div>
        <div className="daevanion-effects-overview">
          <section><small>АКТИВНЫЕ ЭФФЕКТЫ ХАРАКТЕРИСТИК</small>{openedEffects.length?openedEffects.map((effect,index)=><p key={index}>{localizeGameText(effect)}</p>):<p className="muted">NCSOFT не вернул эффекты характеристик</p>}</section>
          <section><small>АКТИВНЫЕ ЭФФЕКТЫ НАВЫКОВ</small>{skillEffects.length?skillEffects.map((effect,index)=><p key={index}>{localizeGameText(effect)}</p>):<p className="muted">NCSOFT не вернул эффекты навыков</p>}</section>
        </div>
        <p className="stats-note">Карта строится по координатам row/col из NCSOFT. Пустые записи типа None не рисуются; тип, редкость, открытие и эффекты каждого узла берутся из его реальной записи.</p>
      </>}
    </> : <div className="empty-state"><span>✦</span><b>Доски Даэваниона не получены</b><small>{error || "Публичный профиль не вернул список досок."}</small></div>}
  </section>;
}
