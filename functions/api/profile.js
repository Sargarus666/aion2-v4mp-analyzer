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

function retryAfterSeconds(value) {
  if (!value) return 1;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.min(seconds, 3));
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, Math.min((date - Date.now()) / 1000, 3));
  return 1;
}

async function requestJson(url, { forceRefresh = false } = {}) {
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
      cf: { cacheTtl: forceRefresh ? 0 : 45, cacheEverything: true }
    });
    if (attempt === 0 && (response.status === 429 || response.status === 503)) {
      const waitSeconds = retryAfterSeconds(response.headers.get("Retry-After"));
      await response.body?.cancel();
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
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
    const info = infoResult.status === "fulfilled" ? infoResult.value : {};
    const gear = gearResult.status === "fulfilled" ? gearResult.value : {};
    const warnings = [];
    if (infoResult.status === "rejected") warnings.push("Профиль и статы: " + String(infoResult.reason?.message || "ошибка источника").slice(0, 180));
    if (gearResult.status === "rejected") warnings.push("Экипировка и навыки: " + String(gearResult.reason?.message || "ошибка источника").slice(0, 180));

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
          warnings
        }
      }, { status: 502, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }

    return Response.json({
      ok: true,
      source: "NCSOFT public character API",
      fetchedAt: new Date().toISOString(),
      partial: warnings.length > 0,
      warnings,
      data
    }, { headers: { "Cache-Control": forceRefresh || warnings.length ? "no-store" : "public, max-age=20, s-maxage=45", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Не удалось получить профиль NCSOFT." },
      { status: 502, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }
    );
  }
}
