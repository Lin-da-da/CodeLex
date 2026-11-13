/**
 * 导出 CodeLex 数据为小红书小工具可用的包内 .js 数据文件。
 *
 * 只读 data/，输出到 xhs-minitool/public/data/。不修改任何网页版文件。
 * 使用方式：node scripts/export-xhs-data.mjs
 *
 * 产物用 window.__CLX_* 暴露（容器禁止 fetch/XHR，无法读 .json，只能由 <script src> 注入）。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const OUT = path.join(ROOT, "xhs-minitool", "public", "data");
/** 小工具版本号：随 manifest 一起注入，供设置页「运行诊断」展示 */
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "xhs-minitool", "package.json"), "utf-8"));

const SEP1 = "\u0001"; // 例句数组分隔
const SEP2 = "\u0002"; // 段落分隔

const FREQ = { high: 0, mid: 1, low: 2 };

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}
function exists(p) {
  return fs.existsSync(p);
}

/* ---------------------------------------------------------------- 栈 ------ */
const rawStacks = readJson(path.join(DATA, "stacks.json")).slice().sort((a, b) => a.order - b.order);
const stacks = rawStacks.map((s) => ({
  slug: s.slug,
  name: s.name,
  icon: s.icon || "",
  desc: s.description || s.desc || "",
}));

/* --------------------------------------------------------------- 词条 ---- */
const stackIdxBySlug = new Map(stacks.map((s, i) => [s.slug, i]));
const indexRows = []; // [term, stackIdx, phonetic, pos, defCn, freq, difficulty, tagsStr]
const dictByStack = new Map(); // slug -> [ [term, defEn, codeExample, exampleSentence, sentences] ]
const offsets = []; // 每个栈在 indexRows 中的起始下标

stacks.forEach((s, si) => {
  const file = path.join(DATA, "seed", `${s.slug}.json`);
  if (!exists(file)) {
    offsets.push(indexRows.length);
    dictByStack.set(s.slug, []);
    return;
  }
  const words = readJson(file);
  offsets.push(indexRows.length);
  const rows = [];
  for (const w of words) {
    const tags = Array.isArray(w.tags) ? w.tags : [];
    indexRows.push([
      w.term,
      si,
      w.phonetic || "",
      w.pos || "",
      w.defCn || "",
      FREQ[w.frequency] === undefined ? 2 : FREQ[w.frequency],
      Number(w.difficulty) || 0,
      tags.join(" "),
    ]);
    const sents = Array.isArray(w.exampleSentences) ? w.exampleSentences : [];
    rows.push([w.term, w.defEn || "", w.codeExample || "", w.exampleSentence || "", sents.join(SEP1)]);
  }
  dictByStack.set(s.slug, rows);
});

/* --------------------------------------------------------------- 文章 ---- */
/** 与 src/lib/articles.ts 保持一致的加载口径：articles.json + articles-<slug>.json */
const articleFiles = [path.join(DATA, "articles.json")];
for (const s of rawStacks) {
  const f = path.join(DATA, `articles-${s.slug}.json`);
  if (exists(f)) articleFiles.push(f);
}
const rawArticles = [];
for (const f of articleFiles) {
  try {
    rawArticles.push(...readJson(f));
  } catch {
    /* 忽略损坏文件，与网页版一致 */
  }
}

function splitParagraphs(md) {
  return String(md || "")
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);
}
function detectLang(md) {
  const cn = (md.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (md.match(/[A-Za-z]/g) || []).length;
  return cn * 3 > en ? "zh" : "en";
}
const CATS = ["basics", "internals", "concurrency", "performance", "architecture", "practice", "tooling", "pitfalls", "interview"];

const articleRows = rawArticles.map((a) => {
  const paras = splitParagraphs(a.contentMd);
  const tr = splitParagraphs(a.contentCn || a.contentEn || "");
  const lang = detectLang(a.contentMd || "");
  const en = [];
  const cn = [];
  for (let i = 0; i < paras.length; i++) {
    const t = tr[i] || "";
    if (lang === "zh") {
      en.push(t);
      cn.push(paras[i]);
    } else {
      en.push(paras[i]);
      cn.push(t);
    }
  }
  const cat = CATS.indexOf(a.category) >= 0 ? a.category : "basics";
  return [
    a.slug,
    stackIdxBySlug.has(a.stackSlug) ? stackIdxBySlug.get(a.stackSlug) : -1,
    a.title || "",
    cat,
    Number(a.difficulty) || 0,
    a.license || "",
    en.join(SEP2),
    cn.join(SEP2),
  ];
});

/* --------------------------------------------------------------- 专项 ---- */
/** 与 src/lib/interviewKit.ts 一致：oral 跨文件按 concept 去重，先出现者胜 */
const oralFiles = fs
  .readdirSync(DATA)
  .filter((f) => /^oral(-.+)?\.json$/.test(f))
  .sort();
const oral = [];
const seenConcept = new Set();
for (const f of oralFiles) {
  for (const it of readJson(path.join(DATA, f))) {
    const k = String((it && it.concept) || "").toLowerCase();
    if (!k || seenConcept.has(k)) continue;
    seenConcept.add(k);
    oral.push(it);
  }
}

const kit = {
  phrases: readJson(path.join(DATA, "phrases.json")),
  oral,
  bq: readJson(path.join(DATA, "bq.json")),
  followups: readJson(path.join(DATA, "followups.json")),
  pron: readJson(path.join(DATA, "pronunciation.json")),
  writing: readJson(path.join(DATA, "writing.json")),
  roles: readJson(path.join(DATA, "roles.json")),
};

/* --------------------------------------------------------------- 输出 ---- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const manifest = {
  schema: 1,
  buildTime: new Date().toISOString().slice(0, 10),
  version: pkg.version,
  total: indexRows.length,
  articles: articleRows.length,
  stacks: stacks.map((s, i) => ({
    slug: s.slug,
    count: (offsets[i + 1] === undefined ? indexRows.length : offsets[i + 1]) - offsets[i],
  })),
};

function writeGlobal(name, value) {
  const body = `window.${name}=${JSON.stringify(value)};`;
  fs.writeFileSync(path.join(OUT, `${name.replace("__CLX_", "").toLowerCase()}.js`), body, "utf-8");
  return Buffer.byteLength(body, "utf-8");
}

let total = 0;
const sizes = [];

total += (sizes.push(["stacks.js", writeGlobal("__CLX_STACKS", stacks.map((s) => [s.slug, s.name, s.icon, s.desc]))]), sizes[sizes.length - 1][1]);
total += (sizes.push(["index.js", writeGlobal("__CLX_INDEX", indexRows)]), sizes[sizes.length - 1][1]);
total += (sizes.push(["offsets.js", writeGlobal("__CLX_OFFSETS", offsets)]), sizes[sizes.length - 1][1]);
total += (sizes.push(["articles.js", writeGlobal("__CLX_ARTICLES", articleRows)]), sizes[sizes.length - 1][1]);
total += (sizes.push(["kit.js", writeGlobal("__CLX_KIT", kit)]), sizes[sizes.length - 1][1]);
total += (sizes.push(["manifest.js", writeGlobal("__CLX_MANIFEST", manifest)]), sizes[sizes.length - 1][1]);

let dictTotal = 0;
for (const [slug, rows] of dictByStack) {
  const body = `window.__CLX_DICT=window.__CLX_DICT||{};window.__CLX_DICT[${JSON.stringify(slug)}]=${JSON.stringify(rows)};`;
  fs.writeFileSync(path.join(OUT, `dict-${slug}.js`), body, "utf-8");
  const n = Buffer.byteLength(body, "utf-8");
  dictTotal += n;
  total += n;
}
sizes.push(["dict-*.js (16)", dictTotal]);

/* --------------------------------------------------------------- 校验 ---- */
console.log("\n产物体积：");
for (const [n, b] of sizes) console.log(`  ${n.padEnd(18)} ${(b / 1024).toFixed(0).padStart(6)} KB`);
console.log(`  ${"合计".padEnd(16)} ${(total / 1024).toFixed(0).padStart(6)} KB`);
console.log(`\n词条 ${indexRows.length} / 文章 ${articleRows.length} / 栈 ${stacks.length}`);
console.log(`  口述 ${kit.oral.length} / 句型 ${kit.phrases.length} / BQ ${kit.bq.length} / 追问 ${kit.followups.length} / 发音 ${kit.pron.length} / 写作 ${kit.writing.length} / 岗位 ${kit.roles.length}`);

const errs = [];
if (indexRows.length !== 7859) errs.push(`词条数应为 7859，实为 ${indexRows.length}`);
if (articleRows.length !== 310) errs.push(`文章数应为 310，实为 ${articleRows.length}`);
if (kit.oral.length !== 78) errs.push(`口述去重后应为 78，实为 ${kit.oral.length}`);
const idxSize = sizes.find((s) => s[0] === "index.js")[1];
if (idxSize > 1200 * 1024) errs.push(`index.js 超 1.2MB：${(idxSize / 1024).toFixed(0)}KB`);
if (total > 7 * 1024 * 1024) errs.push(`总数据超 7MB：${(total / 1024 / 1024).toFixed(2)}MB`);

if (errs.length) {
  console.error("\n[FAIL]");
  errs.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("\n[OK] 数据导出完成\n");
