// 词库完整性校验：检查每个 data/seed/<slug>.json 符合 WordSeed 规范。
// 运行：npm run validate:seed
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data");
const SEED = path.join(DATA, "seed");

const stacks = JSON.parse(fs.readFileSync(path.join(DATA, "stacks.json"), "utf-8"));
let total = 0;
let errors = 0;

for (const s of stacks) {
  const file = path.join(SEED, `${s.slug}.json`);
  if (!fs.existsSync(file)) {
    console.log(`✗ 缺失词库文件: ${file}`);
    errors++;
    continue;
  }
  let words;
  try {
    words = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    console.log(`✗ ${s.slug} JSON 解析失败: ${e.message}`);
    errors++;
    continue;
  }
  const seen = new Set();
  let stackErrors = 0;
  let high = 0;
  let mid = 0;
  let low = 0;
  words.forEach((w, i) => {
    const where = `[${s.slug}#${i}]`;
    if (!w || typeof w.term !== "string" || !w.term.trim()) {
      console.log(`${where} 缺少 term`);
      stackErrors++;
      return;
    }
    const key = w.term.toLowerCase();
    if (seen.has(key)) {
      console.log(`${where} 重复 term: ${w.term}`);
      stackErrors++;
    } else {
      seen.add(key);
    }
    if (!w || typeof w.defCn !== "string" || !w.defCn.trim()) {
      console.log(`${where} 缺少 defCn`);
      stackErrors++;
    }
    if (!w || !w.exampleSentence || typeof w.exampleSentence !== "string" || !w.exampleSentence.trim()) {
      console.log(`${where} 缺少 exampleSentence(短句)`);
      stackErrors++;
    }
    if (w && w.exampleSentences !== undefined) {
      if (!Array.isArray(w.exampleSentences) || w.exampleSentences.length === 0) {
        console.log(`${where} exampleSentences 非法`);
        stackErrors++;
      } else if (w.exampleSentences.some((s) => !s || !String(s).trim())) {
        console.log(`${where} exampleSentences 含空短句`);
        stackErrors++;
      }
    }
    if (w && w.difficulty !== undefined && (typeof w.difficulty !== "number" || w.difficulty < 1 || w.difficulty > 5)) {
      console.log(`${where} difficulty 越界: ${w.difficulty}`);
      stackErrors++;
    }
    if (w && w.tags !== undefined && !Array.isArray(w.tags)) {
      console.log(`${where} tags 非数组`);
      stackErrors++;
    }
    if (!w || !w.frequency || !["high", "mid", "low"].includes(w.frequency)) {
      console.log(`${where} 缺少/非法 frequency: ${w && w.frequency}`);
      stackErrors++;
    } else if (w.frequency === "high") high++;
    else if (w.frequency === "mid") mid++;
    else low++;
  });
  total += words.length;
  errors += stackErrors;
  console.log(`• ${s.name}: ${words.length} 词 [高${high}/中${mid}/低${low}], 错误 ${stackErrors}`);
}

console.log(`\n合计 ${total} 词, 错误 ${errors}`);
process.exit(errors > 0 ? 1 : 0);
