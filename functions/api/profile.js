// Read-only importer for the public, server-rendered Shuggo.GG character page.
// It deliberately does not call Shuggo.GG private /api routes or official game endpoints.
const ALLOWED_HOSTS = new Set(["shugo.gg", "www.shugo.gg"]);
const MAX_HTML_BYTES = 2_000_000;

function decodeEntities(value = "") {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function getMeta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    if ((attrs.property || "").toLowerCase() === key || (attrs.name || "").toLowerCase() === key) {
      return decodeEntities(attrs.content || "");
    }
  }
  return "";
}

function toVisibleText(html) {
  return decodeEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "\n")
    .replace(/<img\b[^>]*alt\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi, (_, a, b) => "\n" + (a || b || "") + "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:div|section|article|li|h[1-6]|p|button|tr|dt|dd|header|footer)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\t\r ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim());
}

function findJsonLd(html) {
  const result = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { result.push(JSON.parse(match[1])); } catch { /* Ignore malformed structured data. */ }
  }
  return result;
}

function collectJsonLd(value, out = []) {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) { for (const item of value) collectJsonLd(item, out); return out; }
  out.push(value);
  for (const child of Object.values(value)) collectJsonLd(child, out);
  return out;
}

function sectionLines(lines, heading, stopHeadings) {
  const start = lines.findIndex(line => new RegExp("^" + heading + "$", "i").test(line.trim()));
  if (start < 0) return [];
  const result = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (stopHeadings.some(next => new RegExp("^" + next + "$", "i").test(line))) break;
    if (line && !/^(?:Image:|Favorite|Share|Updated|Lv\.?\s*\d+)$/i.test(line)) result.push(line);
  }
  return result.slice(0, 80);
}

function parseProfile(html, profileUrl) {
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || getMeta(html, "og:title"));
  const description = getMeta(html, "description") || getMeta(html, "og:description");
  const text = toVisibleText(html);
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  const ld = collectJsonLd(findJsonLd(html));
  const person = ld.find(item => /Person/i.test(String(item["@type"] || ""))) || {};
  const combined = [title, description, text].join("\n");
  const number = (pattern) => {
    const match = combined.match(pattern);
    return match ? Number(match[1].replace(/[,\s]/g, "")) : null;
  };
  const level = number(/\b(?:Lv\.?|Level)\s*(\d{1,2})\b/i);
  const gearScore = number(/\b(?:iLvl|GS|Gear\s*Score)\s*[:·]?\s*([\d, ]+)/i);
  const combatPower = number(/\b(?:CP|Combat\s*Power)\s*[:·]?\s*([\d, ]+)/i);
  const equipment = [];
  for (const match of text.matchAll(/\+(\d{1,2})\s+([^\n]{2,90})/g)) {
    const name = match[2].trim();
    if (name && !equipment.some(item => item.name === name && item.enchantLevel === Number(match[1]))) {
      equipment.push({ name, enchantLevel: Number(match[1]), source: "public profile HTML" });
    }
  }
  const headings = ["Weapons", "Armor", "Accessories", "Runes", "Arcana", "Pet & Wings", "Skills", "Statistics"];
  const sections = {};
  for (const heading of headings) sections[heading] = sectionLines(lines, heading, headings.filter(h => h !== heading));
  const classMatch = combined.match(/\b(Ranger|Gladiator|Templar|Assassin|Sorcerer|Spiritmaster|Chanter|Cleric|Brawler)\b/i);
  const name = person.name || (title.match(/^(.+?)\s+-\s+AION\s+2/i) || [])[1] || "";
  const image = typeof person.image === "string" ? person.image : person.image?.url || getMeta(html, "og:image");

  return {
    character: name,
    className: classMatch?.[1] || "",
    level,
    gearScore,
    combatPower,
    image,
    title,
    description,
    equipment,
    sections,
    structuredDataFound: ld.length > 0,
    profileUrl,
    fetchedAt: new Date().toISOString(),
    source: "Shuggo.GG public character page",
    limitations: [
      "Импорт читает только публичный HTML профиля.",
      "Скрытые вкладки, специализации навыков, точные параметры камней и часть аркан могут не присутствовать в HTML.",
      "Данные не запрашиваются из закрытых внутренних API Shuggo.GG."
    ]
  };
}

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const profile = requestUrl.searchParams.get("url");
  if (!profile) return Response.json({ ok: false, error: "Добавь ссылку на публичный профиль." }, { status: 400 });

  let target;
  try { target = new URL(profile); } catch {
    return Response.json({ ok: false, error: "Некорректная ссылка." }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname) || !/^\/character\/(global|kr|tw)\//i.test(target.pathname)) {
    return Response.json({ ok: false, error: "Разрешены только публичные страницы персонажей shugo.gg." }, { status: 400 });
  }
  target.search = "";
  target.hash = "";

  try {
    const response = await fetch(target.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AION2BuildLab/0.2; +https://github.com/Sargarus666/aion2-v4mp-analyzer)", "Accept": "text/html" },
      redirect: "follow",
      cf: { cacheTtl: 120, cacheEverything: true }
    });
    const finalUrl = new URL(response.url || target.toString());
    if (!ALLOWED_HOSTS.has(finalUrl.hostname)) {
      return Response.json({ ok: false, error: "Профиль перенаправил на неизвестный домен." }, { status: 502 });
    }
    if (!response.ok) {
      return Response.json({ ok: false, error: "Shuggo.GG вернул HTTP " + response.status + ".", upstreamStatus: response.status }, { status: 502 });
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_HTML_BYTES) return Response.json({ ok: false, error: "Страница слишком большая для безопасного импорта." }, { status: 413 });
    const html = await response.text();
    if (html.length > MAX_HTML_BYTES) return Response.json({ ok: false, error: "Страница слишком большая для безопасного импорта." }, { status: 413 });
    const profileData = parseProfile(html, target.toString());
    if (!profileData.character && !profileData.gearScore && !profileData.combatPower && profileData.equipment.length === 0) {
      return Response.json({ ok: false, parser: "public-html-v1", error: "Страница открылась, но знакомые поля профиля не найдены. Возможно, Shuggo.GG изменил разметку или API временно недоступен." }, { status: 422 });
    }
    return Response.json({ ok: true, parser: "public-html-v1", profile: profileData }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120", "X-Content-Type-Options": "nosniff" }
    });
  } catch {
    return Response.json({ ok: false, error: "Не удалось получить страницу Shuggo.GG. Попробуй позже." }, { status: 502 });
  }
}
