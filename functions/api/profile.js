// Read-only import from the public AION 2 character endpoints used by NotMeter.
// The character ID and server ID come from the user's public NotMeter profile URL.
const CHARACTER = {
  serverId: "2316",
  characterId: "6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY=",
  region: "eu"
};

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "AION2BuildLab/0.3 (public character viewer)" },
    cf: { cacheTtl: 60, cacheEverything: true }
  });
  if (!response.ok) throw new Error("Официальный сервис AION 2 ответил HTTP " + response.status);
  return response.json();
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
    const [info, equipment] = await Promise.all([
      getJson(base + "info?" + params.toString()),
      getJson(base + "equipment?" + params.toString())
    ]);
    const data = {
      ...(info || {}),
      ...(equipment || {}),
      profile: info?.profile || info?.data?.profile || info?.character || {},
      stat: info?.stat || info?.data?.stat || {},
      daevanion: info?.daevanion || info?.data?.daevanion || {},
      equipment: equipment?.equipment || equipment?.data?.equipment || equipment?.data || {},
      skill: equipment?.skill || equipment?.data?.skill || {}
    };
    const hasUsefulData = data.profile?.name || data.profile?.combatPower ||
      data.equipment?.equipmentList?.length || data.stat?.statList?.length;
    if (!hasUsefulData) {
      return Response.json({ ok: false, error: "Сервис ответил, но структура профиля отличается от ожидаемой. Нужна проверка ответа API.", debugKeys: { info: Object.keys(info || {}), equipment: Object.keys(equipment || {}) } }, { status: 502 });
    }
    return Response.json({ ok: true, source: "AION2 official public character API", character: "v4mp", server: "Kromede EU", data }, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60", "X-Content-Type-Options": "nosniff" }
    });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Не удалось загрузить публичный профиль AION 2." }, { status: 502 });
  }
}
