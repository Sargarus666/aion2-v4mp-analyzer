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

async function requestJson(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000), cf: { cacheTtl: 45, cacheEverything: true } });
  const body = await response.text();
  if (!response.ok) throw new Error("NCSOFT API HTTP " + response.status + ": " + body.slice(0, 180));
  try { return JSON.parse(body); }
  catch { throw new Error("NCSOFT API вернул не JSON: " + body.slice(0, 180)); }
}

export async function onRequestGet() {
  try {
    const params = new URLSearchParams({
      region: CHARACTER.region,
      lang: "en-US",
      characterId: CHARACTER.characterId,
      serverId: CHARACTER.serverId
    });
    const base = "https://aion2.plaync.com/api/character/";
    const [info, gear] = await Promise.all([
      requestJson(base + "info?" + params.toString()),
      requestJson(base + "equipment?" + params.toString())
    ]);

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
          equipmentCount: equipmentList.length
        }
      }, { status: 502 });
    }

    return Response.json({
      ok: true,
      source: "NCSOFT public character API",
      fetchedAt: new Date().toISOString(),
      data
    }, { headers: { "Cache-Control": "public, max-age=20, s-maxage=45", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Не удалось получить профиль NCSOFT." }, { status: 502 });
  }
}
