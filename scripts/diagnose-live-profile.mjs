const characterId = "6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY=";
const params = new URLSearchParams({ region: "eu", lang: "en-US", characterId, serverId: "2316" });
const url = "https://aion2.plaync.com/api/character/info?" + params.toString();
const response = await fetch(url, {
  headers: {
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (compatible; AION2BuildLab-Diagnostic/1.0)",
    Referer: "https://aion2.plaync.com/"
  },
  signal: AbortSignal.timeout(15000)
});
const text = await response.text();
console.log("NCSOFT_INFO_HTTP_STATUS", response.status);
console.log("NCSOFT_INFO_CONTENT_TYPE", response.headers.get("content-type"));
if (!response.ok) {
  console.log("NCSOFT_INFO_ERROR_BODY", text.slice(0, 600));
  process.exit(0);
}
let json;
try { json = JSON.parse(text); }
catch {
  console.log("NCSOFT_INFO_NON_JSON", text.slice(0, 600));
  process.exit(0);
}
const root = json && typeof json === "object" ? json : {};
const data = root.data && typeof root.data === "object" ? root.data : {};
const stat = root.stat ?? data.stat ?? root.character?.stat ?? data.character?.stat ?? {};
const list = Array.isArray(stat.statList) ? stat.statList : [];
const second = Array.isArray(stat.statSecondList) ? stat.statSecondList : [];
console.log("NCSOFT_ROOT_KEYS", Object.keys(root));
console.log("NCSOFT_DATA_KEYS", Object.keys(data));
console.log("NCSOFT_PROFILE_KEYS", Object.keys(root.profile ?? data.profile ?? root.character ?? {}));
console.log("NCSOFT_STAT_KEYS", Object.keys(stat));
console.log("NCSOFT_STAT_LIST_COUNT", list.length);
console.log("NCSOFT_STAT_SECOND_LIST_COUNT", second.length);
console.log("NCSOFT_STAT_SAMPLE", JSON.stringify(list.slice(0, 12).map(x => ({
  name: x?.name ?? null,
  type: x?.type ?? null,
  value: x?.value ?? null,
  statSecondList: Array.isArray(x?.statSecondList) ? x.statSecondList.slice(0, 5) : x?.statSecondList ?? null,
  keys: x && typeof x === "object" ? Object.keys(x) : []
}))));
console.log("NCSOFT_TOP_LEVEL_STAT_SAMPLE", JSON.stringify(second.slice(0, 8)));
