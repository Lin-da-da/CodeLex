// 为文章打分类标签（中英对照所需的 category 字段）。
// 规则：按标题/正文关键词打分，取分数最高的分类；无明显信号时按技术栈回落。
// 运行：node scripts/categorize-articles.mjs
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data");

export const CATEGORIES = [
  { slug: "basics", name: "基础概念", icon: "📘" },
  { slug: "internals", name: "原理机制", icon: "🔧" },
  { slug: "concurrency", name: "并发异步", icon: "⚡" },
  { slug: "performance", name: "性能调优", icon: "🚀" },
  { slug: "architecture", name: "架构设计", icon: "🏗️" },
  { slug: "practice", name: "实战用法", icon: "🛠️" },
  { slug: "tooling", name: "工具工程", icon: "📦" },
  { slug: "pitfalls", name: "常见陷阱", icon: "⚠️" },
  { slug: "interview", name: "面试要点", icon: "🎯" },
];

/** 关键词 → 分类 权重表（命中即加分） */
const RULES = [
  // 面试要点
  ["interview", ["interview", "question", "must know", "cheat sheet", "explained simply", "questions"]],
  // 常见陷阱
  ["pitfalls", ["pitfall", "gotcha", "mistake", "avoid", "common mistake", "warning", "trap", "careful", "danger", "wrong", "never ", "don't "]],
  // 性能调优
  ["performance", ["performance", "optimi", "fast", "slow", "speed", "cache", "memory", "profil", "benchmark", "latency", "throughput", "efficien", "tuning", "hot path", "bottleneck", "leak"]],
  // 并发异步
  ["concurrency", ["concurren", "async", "parallel", "thread", "goroutine", "lock", "race", "mutex", "deadlock", "event loop", "await", "coroutine", "atomic", "channel", "callback", "promise"]],
  // 架构设计
  ["architecture", ["architect", "design", "pattern", "scalab", "distributed", "microservice", "modular", "layer", "abstraction", "coupling", "cohesion", "event-driven", "api design", "system design"]],
  // 原理机制
  ["internals", ["how it works", "under the hood", "internals", "memory model", "lifecycle", "implementation", "engine", "runtime", "what happens", "deep dive", "mental model", "mechanism", "原理", "机制"]],
  // 工具工程
  ["tooling", ["build", "tool", "tooling", "setup", "install", "deploy", "ci", "cd", "pipeline", "test", "debug", "monitor", "logging", "configuration", "config", "packag", "dependency", "version", "release", "lint", "format", "container", "docker", "kubernetes", "maven", "gradle", "npm", "webpack", "vite", "git"]],
  // 实战用法
  ["practice", ["how to", "practical", "guide", "tutorial", "build", "create", "write", "use ", "using ", "step", "hands-on", "example", "implement", "work with", "handling", "migrat", "refactor", "实战", "用法"]],
  // 基础概念
  ["basics", ["intro", "basic", "fundamental", "getting started", "what is", "simply", "explained", "101", "overview", "understand", "introduction", "concept", "基础"]],
];

/** 各技术栈的兜底分类 */
const STACK_FALLBACK = {
  java: "internals",
  spring: "practice",
  python: "basics",
  frontend: "practice",
  go: "concurrency",
  cpp: "internals",
  agent: "practice",
  devops: "tooling",
  algo: "basics",
  db: "internals",
  ml: "basics",
  security: "pitfalls",
  "system-design": "architecture",
  rust: "internals",
  backend: "architecture",
};

function classify(article, stackSlug) {
  const text = `${article.slug} ${article.title} ${article.contentMd}`.toLowerCase();
  const scores = {};
  for (const [cat, kws] of RULES) {
    let s = 0;
    for (const kw of kws) {
      if (text.includes(kw)) s += kw.includes(" ") ? 2 : 1;
    }
    if (s > 0) scores[cat] = s;
  }
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return STACK_FALLBACK[stackSlug] || "basics";
  // 命中分差过小（并列）时使用兜底，避免误判
  if (entries.length > 1 && entries[0][1] === entries[1][1]) {
    return STACK_FALLBACK[stackSlug] || entries[0][0];
  }
  return entries[0][0];
}

/** 收集所有文章文件 */
function collect() {
  const stacks = JSON.parse(fs.readFileSync(path.join(DATA, "stacks.json"), "utf-8"));
  const files = [path.join(DATA, "articles.json")];
  for (const s of stacks) {
    const f = path.join(DATA, `articles-${s.slug}.json`);
    if (fs.existsSync(f)) files.push(f);
  }
  return files;
}

const counts = {};
let total = 0;

for (const file of collect()) {
  const arr = JSON.parse(fs.readFileSync(file, "utf-8"));
  for (const a of arr) {
    a.category = classify(a, a.stackSlug);
    counts[a.category] = (counts[a.category] || 0) + 1;
    total++;
  }
  fs.writeFileSync(file, JSON.stringify(arr, null, 2) + "\n");
}

console.log(`已为 ${total} 篇文章打上分类标签：`);
for (const c of CATEGORIES) {
  console.log(`  ${c.icon} ${c.name} (${c.slug}): ${counts[c.slug] || 0} 篇`);
}
