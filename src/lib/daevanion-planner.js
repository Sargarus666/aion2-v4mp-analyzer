const asArray = value => Array.isArray(value) ? value : [];
const coordinate = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const gradeName = node => String(node?.gradeName ?? node?.grade ?? "").toLowerCase();
const typeName = node => String(node?.type ?? node?.nodeType ?? "").toLowerCase();
const isUsable = node => !["none", "empty", "null"].includes(typeName(node));

export function daevanionNodeCost(node = {}) {
  const grade = gradeName(node);
  if (/unique|уник/.test(grade)) return 4;
  if (/epic|эпич/.test(grade)) return 3;
  if (/rare|редк/.test(grade)) return 2;
  if (/common|обыч/.test(grade)) return 1;
  return 0;
}

export function findDaevanionPath(nodes = [], target) {
  const list = asArray(nodes).filter(node => node && typeof node === "object" && isUsable(node));
  const byPosition = new Map();
  for (const node of list) {
    const row = coordinate(node.row);
    const col = coordinate(node.col);
    if (row === null || col === null) continue;
    byPosition.set(row + ":" + col, node);
  }
  const targetRow = coordinate(target?.row);
  const targetCol = coordinate(target?.col);
  if (targetRow === null || targetCol === null) return null;
  const targetKey = targetRow + ":" + targetCol;
  if (!byPosition.has(targetKey)) return null;
  const start = list.find(node => typeName(node) === "start" || /^(start|начало)$/i.test(String(node.name ?? "")) ||
    (node.open === true || Number(node.open) === 1) && /start/i.test(String(node.name ?? "")));
  if (!start) return null;
  const startKey = coordinate(start.row) + ":" + coordinate(start.col);
  const queue = [startKey];
  const previous = new Map([[startKey, null]]);
  const directions = [[-1,0],[1,0],[0,-1],[0,1]];
  while (queue.length) {
    const key = queue.shift();
    if (key === targetKey) break;
    const [row, col] = key.split(":").map(Number);
    for (const [dr, dc] of directions) {
      const next = (row + dr) + ":" + (col + dc);
      if (!byPosition.has(next) || previous.has(next)) continue;
      previous.set(next, key);
      queue.push(next);
    }
  }
  if (!previous.has(targetKey)) return null;
  const keys = [];
  for (let key = targetKey; key !== null; key = previous.get(key)) keys.push(key);
  keys.reverse();
  const path = keys.map(key => byPosition.get(key));
  const unopened = path.filter(node => !(node.open === true || Number(node.open) === 1) &&
    typeName(node) !== "start");
  const crystalCost = unopened.reduce((sum, node) => sum + daevanionNodeCost(node), 0);
  return {
    nodes: path,
    unopened,
    crystalCost,
    nodeCount: path.length,
    unopenedCount: unopened.length,
    reachable: true
  };
}
