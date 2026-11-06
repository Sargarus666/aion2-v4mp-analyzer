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
    assert.deepEqual(body.failedEndpoints, ["info"]);
    assert.deepEqual(cacheTtls, [0, 0]);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("retries a 429 response with an HTTP-date Retry-After header", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/info?")) {
      attempts += 1;
      if (attempts === 1) {
        return new Response("rate limited", {
          status: 429,
          headers: { "Retry-After": new Date(Date.now() - 1000).toUTCString() }
        });
      }
      return new Response(JSON.stringify({ data: { profile: { name: "v4mp" } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ data: { equipmentList: [{ name: "Bow" }] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const response = await onRequestGet({ request: new Request("https://example.test/api/profile") });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("does not retry a 429 before a future Retry-After deadline", async () => {
  const originalFetch = globalThis.fetch;
  let infoAttempts = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/info?")) {
      infoAttempts += 1;
      return new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "60" }
      });
    }
    return new Response(JSON.stringify({ data: { equipmentList: [{ name: "Bow" }] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const response = await onRequestGet({ request: new Request("https://example.test/api/profile") });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.partial, true);
    assert.deepEqual(body.failedEndpoints, ["info"]);
    assert.equal(infoAttempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("marks an HTTP-200 empty equipment payload as partial instead of fresh", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/info?")) {
      return new Response(JSON.stringify({ profile: { characterName: "v4mp", combatPower: 98198 } }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ equipment: { equipmentList: [] }, skill: { skillList: [] } }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  };
  try {
    const response = await onRequestGet({ request: new Request("https://example.test/api/profile") });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.partial, true);
    assert.deepEqual(body.failedEndpoints, ["equipment"]);
    assert.match(body.warnings[0], /HTTP 200/);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("marks an HTTP-200 empty info payload as partial when equipment is usable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/info?")) {
      return new Response(JSON.stringify({ profile: {}, stat: { statList: [] }, daevanion: { boardList: [] } }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      equipment: { equipmentList: [{ name: "Bow" }] },
      skill: { skillList: [{ name: "Snipe", skillLevel: 16 }] }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await onRequestGet({ request: new Request("https://example.test/api/profile") });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.partial, true);
    assert.deepEqual(body.failedEndpoints, ["info"]);
    assert.equal(body.data.equipment.equipmentList[0].name, "Bow");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a profile when both HTTP-200 endpoints contain no usable data", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: {} }), {
    status: 200, headers: { "Content-Type": "application/json" }
  });
  try {
    const response = await onRequestGet({ request: new Request("https://example.test/api/profile") });
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.equal(body.ok, false);
    assert.deepEqual(body.diagnostic.failedEndpoints, ["info", "equipment"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("accepts a petwing-only equipment payload as useful data", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/info?")) {
      return new Response(JSON.stringify({
        profile: { characterName: "v4mp", combatPower: 98198 }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      petwing: {
        pet: { id: 1, name: "Equipped Pet" },
        wing: { id: 2, name: "Daeva Wings" },
        wingSkin: null
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
    assert.deepEqual(body.failedEndpoints, []);
    assert.equal(body.data.petwing.pet.name, "Equipped Pet");
    assert.equal(body.data.petwing.wing.name, "Daeva Wings");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
