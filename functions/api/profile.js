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
  const response = await fetch(url, { headers, cf: { cacheTtl: 45, cacheEverything: true } });
  const body = await response.text();
  if (!response.ok) throw new Error("NCSOFT API HTTP " + response.status + ": " + body.slice(0, 180));
  try { return JSON.parse(body); }
  catch { throw new Error("NCSOFT API вернул не JSON: " + body.slice(0, 180)); }
}

function firstObject(...values) {
  return values.find(value => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) || {};
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

    const profile = firstObject(info.profile, info.data?.profile, info.character, info.data?.character);
    const stat = firstObject(info.stat, info.data?.stat, info.character?.stat, info.data?.character?.stat, profile.stat);
    const equipment = firstObject(gear.equipment, gear.data?.equipment, gear.data);
    const skill = firstObject(gear.skill, gear.data?.skill);
    const daevanion = firstObject(info.daevanion, info.data?.daevanion);

    const data = {
      profile, stat, daevanion, equipment, skill,
      title: info.title || info.data?.title || {},
      ranking: info.ranking || info.data?.ranking || {}
    };
    const equipmentList = Array.isArray(equipment.equipmentList) ? equipment.equipmentList : [];
    const statList = Array.isArray(stat.statList) ? stat.statList : [];
    const statSecondList = Array.isArray(stat.statSecondList) ? stat.statSecondList : [];
    const profileName = profile.name || profile.characterName || profile.character_name;
    const combatPower = profile.combatPower ?? profile.combat_power;
    if (!profileName && combatPower == null && !equipmentList.length && !statList.length) {
      return Response.json({
        ok: false,
        error: "NCSOFT вернул пустой профиль. Проверь доступность персонажа и соответствие ID/сервера.",
        diagnostic: {
          infoKeys: Object.keys(info || {}),
          gearKeys: Object.keys(gear || {}),
          profileKeys: Object.keys(profile || {}),
          statCount: statList.length + statSecondList.length,
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
