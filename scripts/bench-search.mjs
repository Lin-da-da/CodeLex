// 搜索性能基准：对比「每次请求读盘解析」与「进程级缓存 + 预建索引」。
// 运行：node scripts/bench-search.mjs
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data");
const SEED = path.join(DATA, "seed");

const stacks = JSON.parse(fs.readFileSync(path.join(DATA, "stacks.json"), "utf-8"));

// ---- 旧实现：每次请求都重新读盘 + JSON.parse 全部词库 ----
const t2 = Date.now();
for (const s of stacks) {
  JSON.parse(fs.readFileSync(path.join(SEED, `${s.slug}.json`), "utf-8"));
}
const oldCost = Date.now() - t2;

// ---- 新实现：首次构建缓存 + 预建小写索引 ----
const t0 = Date.now();
const flat = [];
const hay = [];
let bytes = 0;
for (const s of stacks) {
  const raw = fs.readFileSync(path.join(SEED, `${s.slug}.json`), "utf-8");
  bytes += raw.length;
  for (const w of JSON.parse(raw)) {
    flat.push(w);
    hay.push(`${w.term} ${w.defCn || ""} ${(w.tags || []).join(" ")}`.toLowerCase());
  }
}
const cacheCost = Date.now() - t0;

console.log(`词条总数        : ${flat.length}`);
console.log(`种子文件总大小  : ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`旧实现单次请求  : ${oldCost} ms  ← 每次请求都要重付`);
console.log(`新实现建缓存    : ${cacheCost} ms  ← 仅进程首次`);
console.log(`加速比          : ${(oldCost / Math.max(cacheCost, 1)).toFixed(1)}x\n`);

const queries = ["thread", "goroutine", "索引", "cache", "spring", "transaction", "proxy", "virtual"];
let total = 0;
for (const q of queries) {
  const s = Date.now();
  let hits = 0;
  for (let i = 0; i < flat.length; i++) if (hay[i].includes(q)) hits++;
  const dt = Date.now() - s;
  total += dt;
  console.log(`  检索 "${q}" -> ${String(hits).padStart(4)} 命中, ${dt} ms`);
}
console.log(`\n缓存后单次检索 : ${(total / queries.length).toFixed(2)} ms（平均）`);
console.log(`旧实现等价耗时  : ${oldCost} ms（每次请求）`);
