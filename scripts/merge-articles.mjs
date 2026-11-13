// 通用文章合并脚本：把子代理生成的 articles-<slug>-extraN.json 合并进 articles-<slug>.json。
// 校验：必填字段、category 枚举、difficulty 1-5、stackSlug 匹配、contentMd 与 contentCn 段落数一致。
// 运行：node scripts/merge-articles.mjs
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data");
const stacks = JSON.parse(fs.readFileSync(path.join(DATA, "stacks.json"), "utf-8"));

const REQUIRED = ["slug", "stackSlug", "title", "difficulty", "category", "contentMd", "contentCn", "titleEn", "titleCn", "license"];
const CATEGORIES = ["basics", "internals", "concurrency", "performance", "architecture", "practice", "tooling", "pitfalls", "interview"];

function paraCount(s) {
  return String(s || "").split("\n\n").filter((p) => p.trim().length > 0).length;
}

let grandAdded = 0, grandDup = 0, grandDropped = 0;
const drops = [];

for (const stack of stacks) {
  const baseFile = path.join(DATA, `articles-${stack.slug}.json`);
  const extraFiles = fs
    .readdirSync(DATA)
    .filter((f) => new RegExp(`^articles-${stack.slug}-extra\\d+\\.json$`).test(f))
    .sort();
  if (extraFiles.length === 0) continue;

  const base = fs.existsSync(baseFile) ? JSON.parse(fs.readFileSync(baseFile, "utf-8")) : [];
  const seen = new Set(base.map((a) => a.slug));
  const out = [...base];
  let added = 0, dup = 0, dropped = 0;

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
        dropped++; fileDropped++; drops.push(`${where} 缺字段: ${missing.join(",")}`); continue;
      }
      if (!CATEGORIES.includes(a.category)) {
        dropped++; fileDropped++; drops.push(`${where} 非法 category: ${a.category}`); continue;
      }
      if (typeof a.difficulty !== "number" || a.difficulty < 1 || a.difficulty > 5) {
        dropped++; fileDropped++; drops.push(`${where} difficulty 越界: ${a.difficulty}`); continue;
      }
      if (a.stackSlug !== stack.slug) {
        dropped++; fileDropped++; drops.push(`${where} stackSlug 应为 ${stack.slug}，实为 ${a.stackSlug}`); continue;
      }
      const en = paraCount(a.contentMd);
      const cn = paraCount(a.contentCn);
      if (en !== cn) {
        dropped++; fileDropped++; drops.push(`${where} 段落数不一致 EN=${en} CN=${cn}`); continue;
      }
      if (seen.has(a.slug)) { dup++; continue; }
      seen.add(a.slug);
      out.push(a);
      added++; fileAdded++;
    }
    console.log(`• ${stack.slug} / ${f}: 新增 ${fileAdded}，丢弃 ${fileDropped}`);
  }

  fs.writeFileSync(baseFile, JSON.stringify(out, null, 2));
  console.log(`  → ${stack.name}: ${base.length} + ${added} = ${out.length} 篇\n`);
  grandAdded += added; grandDup += dup; grandDropped += dropped;
}

console.log(`合并完成：新增 ${grandAdded}，去重 ${grandDup}，丢弃 ${grandDropped}`);
if (drops.length) {
  console.log("\n被丢弃的条目：");
  for (const d of drops) console.log("  - " + d);
}
process.exit(grandDropped > 0 ? 2 : 0);
