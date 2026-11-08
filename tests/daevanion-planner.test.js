import test from "node:test";
import assert from "node:assert/strict";
import { daevanionNodeCost, findDaevanionPath } from "../src/lib/daevanion-planner.js";

test("maps node grades to crystal costs", () => {
  assert.equal(daevanionNodeCost({ grade: "Common" }), 1);
  assert.equal(daevanionNodeCost({ grade: "Rare" }), 2);
  assert.equal(daevanionNodeCost({ grade: "Epic" }), 3);
  assert.equal(daevanionNodeCost({ grade: "Unique" }), 4);
});

test("finds the cheapest orthogonal route from the start node", () => {
  const nodes = [
    { row: 2, col: 2, type: "Start", open: 1 },
    { row: 2, col: 3, type: "Stat", grade: "Common", open: 0 },
    { row: 2, col: 4, type: "Stat", grade: "Unique", open: 0 },
    { row: 3, col: 2, type: "Stat", grade: "Rare", open: 0 },
    { row: 3, col: 3, type: "SkillLevel", grade: "Epic", open: 0 }
  ];
  const result = findDaevanionPath(nodes, nodes[2]);
  assert.deepEqual(result.nodes.map(node => [node.row, node.col]), [[2,2],[2,3],[2,4]]);
  assert.equal(result.crystalCost, 5);
  assert.equal(result.unopenedCount, 2);
});

test("does not route diagonally or through missing cells", () => {
  const nodes = [
    { row: 1, col: 1, type: "Start", open: 1 },
    { row: 2, col: 2, type: "Stat", grade: "Common", open: 0 }
  ];
  assert.equal(findDaevanionPath(nodes, nodes[1]), null);
});

test("returns zero cost when the selected node is already open", () => {
  const nodes = [
    { row: 0, col: 0, type: "Start", open: 1 },
    { row: 0, col: 1, type: "Stat", grade: "Common", open: 1 }
  ];
  assert.equal(findDaevanionPath(nodes, nodes[1]).crystalCost, 0);
});
