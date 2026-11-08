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

const boards = Array.isArray(info?.daevanion?.boardList) ? info.daevanion.boardList : [];
const items = Array.isArray(gear?.equipment?.equipmentList) ? gear.equipment.equipmentList : [];
const arcanaRows = items.filter(item => /^(?:arcana|аркана)\\s*\\d+$/i.test(String(item?.slotPosName ?? "").trim()));
const skills = Array.isArray(gear?.skill?.skillList) ? gear.skill.skillList : [];
console.log("NCSOFT_EQUIPMENT_SLOT_NAMES", JSON.stringify([...new Set(items.map(item => item?.slotPosName).filter(Boolean))]));
console.log("NCSOFT_EQUIPMENT_ARCANA_SLOT_COUNT", arcanaRows.length);
console.log("NCSOFT_EQUIPMENT_ARCANA_ROWS", JSON.stringify(arcanaRows.map(({ id, name, slotPosName, grade, enchantLevel, exceedLevel }) => ({
  id, name, slotPosName, grade, enchantLevel, exceedLevel
}))));
console.log("NCSOFT_SKILL_LIST_COUNT", skills.length);
console.log("NCSOFT_SKILL_LEVELS", JSON.stringify(skills.map(({ id, name, skillLevel, acquired, equip }) => ({
  id, name, skillLevel, acquired, equip
}))));
async function readDetail(label, path, extra) {
  if (!extra) { console.log("NCSOFT_" + label + "_SKIPPED", "No source identifier"); return; }
  const query = new URLSearchParams(params);
  for (const [key, value] of Object.entries(extra)) query.set(key, String(value));
  try {
    const response = await fetch(base + path + "?" + query.toString(), {
      headers,
      signal: AbortSignal.timeout(15000)
    });
    const body = await response.text();
    console.log("NCSOFT_" + label + "_HTTP_STATUS", response.status);
    if (!response.ok) { console.log("NCSOFT_" + label + "_ERROR_BODY", body.slice(0, 350)); return; }
    let payload;
    try { payload = JSON.parse(body); } catch { console.log("NCSOFT_" + label + "_NON_JSON", body.slice(0, 350)); return; }
    const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
    console.log("NCSOFT_" + label + "_ROOT_KEYS", Object.keys(data || {}));
    if (label === "DAEVANION") {
      console.log("NCSOFT_DAEVANION_NODE_COUNT", Array.isArray(data?.nodeList) ? data.nodeList.length : null);
      console.log("NCSOFT_DAEVANION_NODE_SAMPLE", JSON.stringify(data?.nodeList?.slice(0, 3) ?? null));
    } else {
      console.log("NCSOFT_ITEM_DETAIL_NAME", data?.name ?? null);
      console.log("NCSOFT_ITEM_DETAIL_MAIN_STATS", JSON.stringify(data?.mainStats?.slice(0, 5) ?? null));
      console.log("NCSOFT_ITEM_DETAIL_SUB_STATS", JSON.stringify(data?.subStats?.slice(0, 5) ?? null));
      console.log("NCSOFT_ITEM_DETAIL_STONES", JSON.stringify(data?.magicStoneStat?.slice(0, 5) ?? null));
    }
  } catch (error) {
    console.log("NCSOFT_" + label + "_ERROR", error?.name + ": " + (error?.message || "unknown"));
  }
}
const firstBoard = boards.find(x => Number.isSafeInteger(Number(x?.id)) && Number(x.id) > 0);
const firstItem = items.find(x => Number.isSafeInteger(Number(x?.id)) && Number(x.id) > 0 && Number.isSafeInteger(Number(x?.slotPos)) && Number(x.slotPos) > 0);
await Promise.all([
  readDetail("DAEVANION", "daevanion/detail", firstBoard ? { boardId: firstBoard.id } : null),
  readDetail("ITEM_DETAIL", "equipment/item", firstItem ? {
    id: firstItem.id, slotPos: firstItem.slotPos,
    enchantLevel: firstItem.enchantLevel ?? 0, exceedLevel: firstItem.exceedLevel ?? 0
  } : null)
]);
