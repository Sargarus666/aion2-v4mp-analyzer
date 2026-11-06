const characterId = "6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY=";
const params = new URLSearchParams({ region: "eu", lang: "en-US", characterId, serverId: "2316" });
const base = "https://aion2.plaync.com/api/character/";
const headers = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0 (compatible; AION2BuildLab-Diagnostic/1.0)",
  Referer: "https://aion2.plaync.com/"
};

async function readEndpoint(name) {
  const response = await fetch(base + name + "?" + params.toString(), {
    headers,
    signal: AbortSignal.timeout(15000)
  });
  const body = await response.text();
  console.log("NCSOFT_" + name.toUpperCase() + "_HTTP_STATUS", response.status);
  console.log("NCSOFT_" + name.toUpperCase() + "_CONTENT_TYPE", response.headers.get("content-type"));
  if (!response.ok) {
    console.log("NCSOFT_" + name.toUpperCase() + "_ERROR_BODY", body.slice(0, 500));
    return {};
  }
  try { return JSON.parse(body); }
  catch {
    console.log("NCSOFT_" + name.toUpperCase() + "_NON_JSON", body.slice(0, 500));
    return {};
  }
}

const [info, gear] = await Promise.all([readEndpoint("info"), readEndpoint("equipment")]);
for (const [name, root] of [["INFO", info], ["EQUIPMENT", gear]]) {
  console.log("NCSOFT_" + name + "_ROOT_KEYS", Object.keys(root || {}));
  for (const key of Object.keys(root || {})) {
    const value = root[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      console.log("NCSOFT_" + name + "_" + key.toUpperCase() + "_KEYS", Object.keys(value));
      for (const nestedKey of Object.keys(value)) {
        const nested = value[nestedKey];
        if (Array.isArray(nested)) {
          console.log("NCSOFT_" + name + "_" + key.toUpperCase() + "_" + nestedKey.toUpperCase() + "_COUNT", nested.length);
          console.log("NCSOFT_" + name + "_" + key.toUpperCase() + "_" + nestedKey.toUpperCase() + "_SAMPLE", JSON.stringify(nested.slice(0, 4).map(item => {
            if (!item || typeof item !== "object") return item;
            const summary = {};
            for (const [k, v] of Object.entries(item)) {
              if (v == null || ["string", "number", "boolean"].includes(typeof v)) summary[k] = v;
              else if (Array.isArray(v)) summary[k] = { arrayLength: v.length, sample: v.slice(0, 3) };
              else if (typeof v === "object") summary[k] = { keys: Object.keys(v).slice(0, 20) };
            }
            return summary;
          })));
        }
      }
    }
  }
}
const statList = Array.isArray(info?.stat?.statList) ? info.stat.statList : [];
console.log("NCSOFT_INFO_STAT_LIST_COUNT", statList.length);
console.log("NCSOFT_INFO_STAT_SAMPLE", JSON.stringify(statList.map(x => ({
  name: x?.name ?? null,
  type: x?.type ?? null,
  value: x?.value ?? null,
  statSecondList: x?.statSecondList ?? null,
  keys: x && typeof x === "object" ? Object.keys(x) : []
}))));
