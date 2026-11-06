import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/daevanion.js";

test("rejects an invalid board id without calling NCSOFT", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("must not fetch"); };
  try {
    const response = await onRequestGet({ request: new Request("https://example.test/api/daevanion?boardId=0") });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("requests the selected board from the fixed NCSOFT character and returns node details", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let cacheTtl = null;
  globalThis.fetch = async (url, options) => {
    requestedUrl = String(url);
    cacheTtl = options.cf.cacheTtl;
    return new Response(JSON.stringify({
      boardId: 17,
      nodeList: [{ nodeId: 1, name: "Start", open: 1, effectList: [{ desc: "Attack +10" }] }],
      openStatEffectList: [{ desc: "Critical Hit +5" }],
      openSkillEffectList: []
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await onRequestGet({ request: new Request("https://example.test/api/daevanion?boardId=17") });
    const body = await response.json();
    const url = new URL(requestedUrl);
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.data.nodeList[0].effectList[0].desc, "Attack +10");
    assert.equal(url.searchParams.get("region"), "eu");
    assert.equal(url.searchParams.get("serverId"), "2316");
    assert.equal(url.searchParams.get("boardId"), "17");
    assert.equal(cacheTtl, 45);
    assert.match(response.headers.get("Cache-Control"), /s-maxage=45/);
  } finally { globalThis.fetch = originalFetch; }
});
