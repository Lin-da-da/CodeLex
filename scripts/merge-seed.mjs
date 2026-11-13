// 合并每个技术栈的种子词库与子代理生成的扩展词库。
// 规则：读取 data/seed/<slug>.json（基础），再并入 data/seed/<slug>-new*.json（新增，可多个文件），
// 按 term（小写）去重，写回 <slug>.json 并删除 -new 文件。
// 运行：node scripts/merge-seed.mjs
import fs from "fs";
import path from "path";

const SEED = path.join(process.cwd(), "data", "seed");
const stacks = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "stacks.json"), "utf-8")
);

/** 归一化词条：确保 exampleSentences 与 exampleSentence 一致（短句至少存在且被数组包含）。 */
function normalize(w) {
  if (Array.isArray(w.exampleSentences) && w.exampleSentences.length > 0) {
    const list = w.exampleSentences.map((s) => String(s).trim()).filter(Boolean);
    if (!w.exampleSentence) w.exampleSentence = list[0];
    else if (!list.includes(w.exampleSentence)) list.unshift(w.exampleSentence);
    w.exampleSentences = list;
  } else if (w.exampleSentence) {
    w.exampleSentences = [w.exampleSentence];
  }
  return w;
}

let grandAdded = 0;
let grandDup = 0;
let grandBase = 0;

for (const s of stacks) {
  const baseFile = path.join(SEED, `${s.slug}.json`);
  let words = fs.existsSync(baseFile)
    ? JSON.parse(fs.readFileSync(baseFile, "utf-8"))
    : [];

  // 收集该栈所有 -new*.json（按文件名排序，保证顺序稳定）
  const newFiles = fs
    .readdirSync(SEED)
    .filter((f) => f.startsWith(`${s.slug}-new`) && f.endsWith(".json"))
    .sort();

  if (newFiles.length === 0) {
    // 基础词库也做一次归一化，保证老数据也有 exampleSentences
    words = words.map(normalize);
    fs.writeFileSync(baseFile, JSON.stringify(words, null, 2));
    grandBase += words.length;
    console.log(`• ${s.name}: 无新增文件，保持 ${words.length}`);
    continue;
  }

  const baseCount = words.length;
  const seen = new Set(words.map((w) => w.term.toLowerCase()));
  let added = 0;
  let dup = 0;

  for (const nf of newFiles) {
    const adds = JSON.parse(fs.readFileSync(path.join(SEED, nf), "utf-8"));
    for (const raw of adds) {
      const w = normalize(raw);
      const k = (w.term || "").toLowerCase();
      if (!k || seen.has(k)) {
        dup++;
        continue;
      }
      seen.add(k);
      words.push(w);
      added++;
    }
    fs.unlinkSync(path.join(SEED, nf));
  }

  fs.writeFileSync(baseFile, JSON.stringify(words, null, 2));
  grandBase += baseCount;
  grandAdded += added;
  grandDup += dup;
  console.log(
    `• ${s.name}: 基础 ${baseCount} + 新增 ${added}（去重 ${dup}）= ${words.length} 词`
  );
}

console.log(
  `\n合并完成：基础 ${grandBase} + 新增 ${grandAdded}（去重 ${grandDup}）= ${grandBase + grandAdded} 词`
);
