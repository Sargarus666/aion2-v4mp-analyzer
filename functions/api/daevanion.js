const CHARACTER = {
  serverId: "2316",
  characterId: "6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY=",
  region: "eu"
};

export async function onRequestGet({ request } = {}) {
  try {
    const url = new URL(request.url);
    const boardId = Number(url.searchParams.get("boardId"));
    if (!Number.isSafeInteger(boardId) || boardId <= 0) {
      return Response.json({ ok: false, error: "Укажи корректный boardId из профиля NCSOFT." }, {
        status: 400, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
      });
    }
    const params = new URLSearchParams({
      region: CHARACTER.region,
      lang: "en-US",
      characterId: CHARACTER.characterId,
      serverId: CHARACTER.serverId,
      boardId: String(boardId)
    });
    const upstream = await fetch("https://aion2.plaync.com/api/character/daevanion/detail?" + params.toString(), {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (compatible; AION2BuildLab/1.0)",
        Referer: "https://aion2.plaync.com/"
      },
      signal: AbortSignal.timeout(10000),
      cf: { cacheTtl: 45, cacheEverything: true }
    });
    const body = await upstream.text();
    if (!upstream.ok) throw new Error("NCSOFT Daevanion HTTP " + upstream.status + ": " + body.slice(0, 160));
    let payload;
    try { payload = JSON.parse(body); }
    catch { throw new Error("NCSOFT Daevanion вернул не JSON."); }
    const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
    if (!Array.isArray(data?.nodeList)) {
      return Response.json({ ok: false, error: "NCSOFT не вернул nodeList для этой доски.", diagnostic: { keys: Object.keys(data || {}) } }, {
        status: 502, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
      });
    }
    return Response.json({ ok: true, source: "NCSOFT public Daevanion detail", fetchedAt: new Date().toISOString(), data }, {
      headers: { "Cache-Control": "public, max-age=20, s-maxage=45", "X-Content-Type-Options": "nosniff" }
    });
  } catch (error) {
    return Response.json({ ok: false, error: error?.name === "TimeoutError" ? "NCSOFT не ответил за 10 секунд." : error?.message || "Не удалось получить детали Даэваниона." }, {
      status: 502, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
  }
}
