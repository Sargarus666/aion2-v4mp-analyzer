import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/profile.js";

test("returns a complete profile and uses the short upstream cache", async () => {
  const originalFetch = globalThis.fetch;
  const cacheTtls = [];
  globalThis.fetch = async (url, init) => {
    cacheTtls.push(init.cf.cacheTtl);
    if (String(url).includes("/info?")) {
      return new Response(JSON.stringify({
        data: {
          profile: { name: "v4mp", combatPower: 98198 },
          stat: { statList: [{ name: "ItemLevel", value: 2111 }] },
          daevanion: { boardList: [{ id: 7, name: "Board", openNodeCount: 2, totalNodeCount: 4 }] }
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      data: {
        equipmentList: [{ name: "Longbow" }],
        skillList: [{ name: "Deadshot", skillLevel: 20 }]
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const response = await onRequestGet({
      request: new Request("https://example.test/api/profile")
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.partial, false);
    assert.equal(body.data.profile.name, "v4mp");
    assert.equal(body.data.equipment.equipmentList[0].name, "Longbow");
    assert.deepEqual(cacheTtls, [45, 45]);
    assert.match(response.headers.get("Cache-Control"), /s-maxage=45/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps usable equipment when the profile endpoint fails and bypasses cache on refresh", async () => {
  const originalFetch = globalThis.fetch;
  const cacheTtls = [];
  globalThis.fetch = async (url, init) => {
    cacheTtls.push(init.cf.cacheTtl);
    if (String(url).includes("/info?")) throw new Error("upstream temporarily unavailable");
    return new Response(JSON.stringify({
      data: {
        equipmentList: [{ name: "Longbow" }],
        skillList: [{ name: "Snipe", skillLevel: 16 }]
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const response = await onRequestGet({
      request: new Request("https://example.test/api/profile?refresh=1")
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.partial, true);
    assert.equal(body.data.equipment.equipmentList[0].name, "Longbow");
    assert.equal(body.warnings.length, 1);
    assert.deepEqual(cacheTtls, [0, 0]);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
