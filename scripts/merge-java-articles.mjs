// 合并子代理生成的 Java 后端面试文章到 articles-java.json。
// 规则：读取 articles-java.json（基础）+ 所有 articles-java-extraN.json（新增），
// 按 slug 去重，校验必填字段，并强制 contentMd 与 contentCn 段落数一致（\n\n 切分），
// 写回 articles-java.json。
// 运行：node scripts/merge-java-articles.mjs
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data");
const BASE = path.join(DATA, "articles-java.json");
const extraFiles = fs
  .readdirSync(DATA)
  .filter((f) => /^articles-java-extra\d+\.json$/.test(f))
  .sort();

const REQUIRED = ["slug", "stackSlug", "title", "difficulty", "category", "contentMd", "contentCn", "titleEn", "titleCn", "license"];
const CATEGORIES = ["basics", "internals", "concurrency", "performance", "architecture", "practice", "tooling", "pitfalls", "interview"];

const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, "utf-8")) : [];
const seen = new Set(base.map((a) => a.slug));
let added = 0, dup = 0, dropped = 0;
const drops = [];
const out = [...base];

function paraCount(s) {
  return String(s || "").split("\n\n").filter((p) => p.trim().length > 0).length;
}

for (const f of extraFiles) {
  let arr;
  try {
    arr = JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8"));
  } catch (e) {
    console.log(`✗ ${f} 解析失败: ${e.message}`);
    continue;
  }
  if (!Array.isArray(arr)) { console.log(`✗ ${f} 非数组`); continue; }
  let fileAdded = 0, fileDropped = 0;
  for (const a of arr) {
    const where = `${f}#${a && a.slug ? a.slug : "?"}`;
    const missing = REQUIRED.filter((k) => !(a && a[k] !== undefined && String(a[k]).length > 0));
    if (missing.length) {
      dropped++; fileDropped++;
      drops.push(`${where} 缺字段: ${missing.join(",")}`);
      continue;
    }
    if (!CATEGORIES.includes(a.category)) {
      dropped++; fileDropped++;
      drops.push(`${where} 非法 category: ${a.category}`);
      continue;
    }
    if (typeof a.difficulty !== "number" || a.difficulty < 1 || a.difficulty > 5) {
      dropped++; fileDropped++;
      drops.push(`${where} difficulty 越界: ${a.difficulty}`);
      continue;
    }
    if (a.stackSlug !== "java") {
      dropped++; fileDropped++;
      drops.push(`${where} stackSlug 非 java: ${a.stackSlug}`);
      continue;
    }
    if (paraCount(a.contentMd) !== paraCount(a.contentCn)) {
      dropped++; fileDropped++;
      drops.push(`${where} 段落数不一致 EN=${paraCount(a.contentMd)} CN=${paraCount(a.contentCn)}`);
      continue;
    }
    if (seen.has(a.slug)) {
      dup++; continue;
    }
    seen.add(a.slug);
    out.push(a);
    added++; fileAdded++;
  }
  console.log(`• ${f}: 新增 ${fileAdded}，丢弃 ${fileDropped}`);
}

fs.writeFileSync(BASE, JSON.stringify(out, null, 2));
console.log(`\n合并完成：基础 ${base.length} + 新增 ${added}（去重 ${dup}，丢弃 ${dropped}）= ${out.length} 篇`);
if (drops.length) {
  console.log("\n被丢弃的条目：");
  for (const d of drops) console.log("  - " + d);
}
process.exit(dropped > 0 ? 2 : 0);
