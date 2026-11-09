import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const headerStart = app.indexOf('<header className="topbar">');
const headerEnd = app.indexOf("</header>", headerStart);
const header = headerStart >= 0 && headerEnd > headerStart
  ? app.slice(headerStart, headerEnd)
  : "";

test("header keeps the NCSOFT, Shugo.GG and NotMeter links", () => {
  assert.ok(header, "expected the site header markup");
  assert.ok(header.includes('href="https://aion2.plaync.com/en-us/characters/index?region=eu"'));
  assert.ok(header.includes('href="https://shugo.gg/character/global/eu-kromede/v4mp"'));
  assert.ok(header.includes("href={CHARACTER.sourceUrl}"));
});

test("narrow mobile header does not hide a required profile link", () => {
  assert.equal(
    css.includes(".top-actions .profile-link:nth-of-type(2) { display: none; }"),
    false
  );
  const mobileHeaderRules = css.slice(css.lastIndexOf("@media (max-width:420px)"));
  assert.ok(
    mobileHeaderRules.includes(".top-actions { flex-wrap:nowrap; overflow-x:auto;"),
    "expected a horizontally scrollable link row on narrow phones"
  );
});
