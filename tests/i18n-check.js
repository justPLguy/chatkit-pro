// Sprawdza, czy każdy klucz CK.t("...") użyty w kodzie istnieje we wszystkich językach.
const fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = path.join(__dirname, "..", "src");
const ctx = { window: {}, document: { documentElement: { lang: "pl" } }, navigator: { language: "pl" }, console };
ctx.window.CK = { ready: new Promise(() => {}) };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(SRC, "i18n.js"), "utf8").replace("(() => {\n  const CK = window.CK;", "(() => {\n  const CK = window.CK;"), ctx);
vm.runInContext(fs.readFileSync(path.join(SRC, "i18n-more.js"), "utf8"), ctx);
const DICT = ctx.window.CK.I18N;
const used = new Set();
for (const f of fs.readdirSync(SRC)) {
  const s = fs.readFileSync(path.join(SRC, f), "utf8");
  for (const m of s.matchAll(/\bt\("([a-zA-Z0-9_.]+)"/g)) used.add(m[1]);
}
for (const k of ["delete", "archive", "unarchive"]) { used.add("confirm.chat." + k); used.add("prog." + k); }
for (const k of ["toc", "marks", "notes"]) used.add("mm.view." + k);
for (const k of [...used]) if (k.endsWith(".")) used.delete(k);
let bad = 0;
for (const lang of Object.keys(DICT)) {
  const miss = [...used].filter(k => !(k in DICT[lang]));
  const extra = Object.keys(DICT[lang]).filter(k => !(k in DICT.pl));
  if (miss.length) { bad++; console.log(`FAIL ${lang}: brak ${miss.length}:`, miss.join(", ")); }
  if (extra.length) { bad++; console.log(`FAIL ${lang}: nadmiarowe:`, extra.join(", ")); }
  const varsBad = Object.keys(DICT.pl).filter(k => !DICT.pl[k].includes("{{") && DICT[lang][k] && JSON.stringify((DICT.pl[k].match(/\{\w+\}/g) || []).sort()) !== JSON.stringify((DICT[lang][k].match(/\{\w+\}/g) || []).sort()));
  if (varsBad.length) { bad++; console.log(`FAIL ${lang}: inne zmienne w:`, varsBad.join(", ")); }
}
console.log(bad ? "" : `ok  - i18n: ${used.size} kluczy, języki: ${Object.keys(DICT).join(", ")}`);
process.exitCode = bad ? 1 : 0;

// Wykrywanie języka: kody z regionem i warianty (od 1.3.0)
const CK = ctx.window.CK;
const cases = [["pt-BR", "pt-BR"], ["pt-PT", "pt-BR"], ["zh-CN", "zh-CN"], ["zh-TW", "zh-CN"], ["ja", "ja"], ["ko-KR", "ko"], ["uk-UA", "uk"], ["es-MX", "es"], ["sv-SE", "en"], ["de-AT", "de"]];
for (const [inp, want] of cases) {
  ctx.document.documentElement.lang = inp; ctx.navigator.language = inp;
  CK.applyLang();
  if (CK.lang !== want || !CK.locale) { bad++; console.log(`FAIL wykrywanie: ${inp} → ${CK.lang} (oczekiwano ${want})`); }
}
if (CK.LANG_NAMES.length !== Object.keys(DICT).length) { bad++; console.log("FAIL LANG_NAMES ≠ języki"); }
if (!bad) console.log(`ok  - wykrywanie języka: ${cases.length} przypadków, ${CK.LANG_NAMES.length} pozycji w ustawieniach`);
process.exitCode = bad ? 1 : 0;
