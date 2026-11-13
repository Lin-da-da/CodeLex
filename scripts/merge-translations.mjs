// 把 data/translations-*.json 里的译文合并进各技术栈的文章数据。
// 规则：
//   - 原文为英文（contentMd 以英文为主）→ 译文写入 contentCn
//   - 原文为中文 → 译文写入 contentEn
//   - 同时写入 titleCn（中文标题）与 titleEn（英文标题）
// 运行：node scripts/merge-translations.mjs
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data");

/** 判断文本主体语言 */
function detectLang(md) {
  const cn = (md.match(/[一-鿿]/g) || []).length;
  const en = (md.match(/[A-Za-z]/g) || []).length;
  return cn * 3 > en ? "zh" : "en";
}

// —— 1. 汇总所有译文 ——
const translationFiles = fs
  .readdirSync(DATA)
  .filter((f) => f.startsWith("translations-") && f.endsWith(".json"))
  .sort();

const trMap = new Map();
for (const f of translationFiles) {
  const arr = JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8"));
  for (const t of arr) trMap.set(t.slug, t);
  console.log(`• 读取译文 ${f}: ${arr.length} 条`);
}
console.log(`  译文合计 ${trMap.size} 条\n`);

// —— 2. 收集文章文件 ——
const stacks = JSON.parse(fs.readFileSync(path.join(DATA, "stacks.json"), "utf-8"));
const files = [path.join(DATA, "articles.json")];
for (const s of stacks) {
  const f = path.join(DATA, `articles-${s.slug}.json`);
  if (fs.existsSync(f)) files.push(f);
}

let merged = 0;
let missing = 0;
let paraMismatch = 0;
const missingList = [];

for (const file of files) {
  const arr = JSON.parse(fs.readFileSync(file, "utf-8"));
  for (const a of arr) {
    const t = trMap.get(a.slug);
    if (!t) {
      missing++;
      missingList.push(a.slug);
      continue;
    }
    const lang = detectLang(a.contentMd);
    const srcParas = a.contentMd.split(/\n\n+/).filter((p) => p.trim()).length;
    const trParas = (t.contentCn || "").split(/\n\n+/).filter((p) => p.trim()).length;

    if (srcParas !== trParas) {
      paraMismatch++;
      console.log(`  ! 段落数不一致 ${a.slug}: ${srcParas} vs ${trParas}`);
    }

    if (lang === "zh") {
      // 原文中文，译文是英文
      a.contentEn = t.contentCn;
      a.titleEn = a.title;
      a.titleCn = a.title;
    } else {
      a.contentCn = t.contentCn;
      a.titleEn = a.title;
      a.titleCn = t.titleCn || a.title;
    }
    merged++;
  }
  fs.writeFileSync(file, JSON.stringify(arr, null, 2) + "\n");
}

console.log(`已合并译文 ${merged} 篇到文章数据`);
if (paraMismatch) console.log(`⚠ ${paraMismatch} 篇段落数不一致（对照视图会按段落对齐）`);
if (missing) {
  console.log(`⚠ ${missing} 篇缺少译文：`);
  console.log("  " + missingList.join(", "));
}
