import { normalizeProfileResponse, normalizeStatEntries, hasUsefulProfileData } from "../../src/lib/character-data.js";

const CHARACTER = {
  serverId: "2316",
  // Decoded once from the NotMeter URL. URLSearchParams performs the required URL encoding.
  characterId: "6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY=",
  region: "eu"
};

const headers = {
  "Accept": "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0 (compatible; AION2BuildLab/1.0)",
  "Referer": "https://aion2.plaync.com/"
};

function retryAfterMilliseconds(value) {
  if (!value) return 1000;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return 1000;
}

function hasUsefulInfoPayload(payload) {
  return hasUsefulProfileData(normalizeProfileResponse(payload, {}));
}

function hasUsefulEquipmentPayload(payload) {
  const data = normalizeProfileResponse({}, payload);
  const hasRows = value => Array.isArray(value) && value.length > 0;
  const hasPetwing = Object.values(data.petwing || {}).some(value =>
    value != null && (typeof value !== "object" || Object.keys(value).length > 0)
  );
  return hasRows(data.equipment?.equipmentList) ||
    hasRows(data.equipment?.skinList) ||
    hasRows(data.skill?.skillList) ||
    hasRows(data.arcana) ||
    hasPetwing;
}

async function requestJson(url, { forceRefresh = false } = {}) {
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
      cf: { cacheTtl: forceRefresh ? 0 : 45, cacheEverything: true }
    });
    if (attempt === 0 && [429, 502, 503, 504].includes(response.status)) {
      const waitMs = retryAfterMilliseconds(response.headers.get("Retry-After"));
      await response.body?.cancel();
      // Do not retry before the upstream Retry-After deadline. If it exceeds
      // this function's small retry budget, surface the response immediately.
      if (waitMs > 3000) break;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }
    break;
  }
  const body = await response.text();
  if (!response.ok) throw new Error("NCSOFT API HTTP " + response.status + ": " + body.slice(0, 180));
  try { return JSON.parse(body); }
  catch { throw new Error("NCSOFT API вернул не JSON: " + body.slice(0, 180)); }
}

export async function onRequestGet({ request } = {}) {
  try {
    const forceRefresh = Boolean(request && new URL(request.url).searchParams.get("refresh") === "1");
    const params = new URLSearchParams({
      region: CHARACTER.region,
      lang: "en-US",
      characterId: CHARACTER.characterId,
      serverId: CHARACTER.serverId
    });
    const base = "https://aion2.plaync.com/api/character/";
    const [infoResult, gearResult] = await Promise.allSettled([
      requestJson(base + "info?" + params.toString(), { forceRefresh }),
      requestJson(base + "equipment?" + params.toString(), { forceRefresh })
    ]);
    let info = infoResult.status === "fulfilled" ? infoResult.value : {};
    let gear = gearResult.status === "fulfilled" ? gearResult.value : {};
    const warnings = [];
    const failedEndpoints = [];
    if (infoResult.status === "fulfilled" && !hasUsefulInfoPayload(info)) {
      info = {};
      failedEndpoints.push("info");
      warnings.push("Профиль и статы: NCSOFT вернул HTTP 200 без ожидаемых данных.");
    } else if (infoResult.status === "rejected") {
      failedEndpoints.push("info");
      warnings.push("Профиль и статы: " + String(infoResult.reason?.message || "ошибка источника").slice(0, 180));
    }
    if (gearResult.status === "fulfilled" && !hasUsefulEquipmentPayload(gear)) {
      gear = {};
      failedEndpoints.push("equipment");
      warnings.push("Экипировка и навыки: NCSOFT вернул HTTP 200 без ожидаемых данных.");
    } else if (gearResult.status === "rejected") {
      failedEndpoints.push("equipment");
      warnings.push("Экипировка и навыки: " + String(gearResult.reason?.message || "ошибка источника").slice(0, 180));
    }

    const data = normalizeProfileResponse(info, gear);
    const { profile, stat, daevanion, equipment, skill } = data;
    const equipmentList = Array.isArray(equipment.equipmentList) ? equipment.equipmentList : [];
    const statCount = normalizeStatEntries(stat).length;
    const skillCount = Array.isArray(skill.skillList) ? skill.skillList.length : 0;
    const boardCount = Array.isArray(daevanion.boardList) ? daevanion.boardList.length : 0;
    if (!hasUsefulProfileData(data)) {
      return Response.json({
        ok: false,
        error: "NCSOFT вернул пустой профиль. Проверь доступность персонажа и соответствие ID/сервера.",
        diagnostic: {
          infoKeys: Object.keys(info || {}),
          gearKeys: Object.keys(gear || {}),
          profileKeys: Object.keys(profile || {}),
          statCount,
          skillCount,
          boardCount,
          statKeys: Object.keys(stat || {}),
          equipmentCount: equipmentList.length,
          petwingKeys: Object.keys(data.petwing || {}),
          failedEndpoints,
          warnings
        }
      }, { status: 502, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }

    return Response.json({
      ok: true,
      source: "NCSOFT public character API",
      fetchedAt: new Date().toISOString(),
      partial: failedEndpoints.length > 0,
      failedEndpoints,
      warnings,
      data
    }, { headers: { "Cache-Control": forceRefresh || failedEndpoints.length ? "no-store" : "public, max-age=20, s-maxage=45", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Не удалось получить профиль NCSOFT." },
      { status: 502, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }
    );
  }
}
