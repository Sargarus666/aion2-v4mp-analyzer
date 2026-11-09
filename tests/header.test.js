import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const header = app.match(/<header className="topbar">([\\s\\S]*?)<\\/header>/)?.[1] ?? "";

test("header keeps the NCSOFT, Shugo.GG and NotMeter links", () => {
  assert.match(header, /href="https:\\/\\/aion2\\.plaync\\.com\\/en-us\\/characters\\/index\\?region=eu"/);
  assert.match(header, /href="https:\\/\\/shugo\\.gg\\/character\\/global\\/eu-kromede\\/v4mp"/);
  assert.match(header, /href=\\{CHARACTER\\.sourceUrl\\}/);
});

test("narrow mobile header does not hide a required profile link", () => {
  assert.doesNotMatch(css, /\\.top-actions\\s+\\.profile-link:nth-of-type\\(2\\)\\s*\\{\\s*display:\\s*none;/);
  assert.match(css, /@media\\s*\\(max-width:\\s*420px\\)[\\s\\S]*?\\.top-actions\\s*\\{[^}]*overflow-x:\\s*auto/s);
});
