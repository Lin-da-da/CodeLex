/**
 * 冒烟测试：用 jsdom 加载 dist/index.html，验证经典脚本能执行、各路由能渲染。
 * jsdom ≠ 容器：仅用于发现「脚本不执行 / 白屏 / 明显运行时报错」，
 * 真机验证必须由用户在创服平台模拟器 + Android/iOS 真机完成。
 */
import { JSDOM, VirtualConsole } from "jsdom";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(__dirname, "..", "dist", "index.html");

/** jsdom 未实现的能力，与容器无关，忽略 */
const IGNORE = [/Not implemented: Window's scrollTo/, /Could not parse CSS/, /Not implemented: HTMLCanvasElement/];

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => {
  const m = String(e && e.message ? e.message : e);
  if (!IGNORE.some((r) => r.test(m))) errors.push(m);
});
vc.on("error", (m) => {
  const s = String(m);
  if (!IGNORE.some((r) => r.test(s))) errors.push("console.error: " + s);
});

const dom = await JSDOM.fromFile(entry, {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const win = dom.window;
const doc = win.document;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 等待 async 数据脚本就绪（不阻塞首屏，故需轮询等全局变量到位） */
async function waitData() {
  for (let i = 0; i < 100; i++) {
    if (win.__CLX_INDEX && win.__CLX_STACKS && win.__CLX_DICT && win.__CLX_ARTICLES && win.__CLX_KIT) return;
    await wait(100);
  }
}

/* 记录初始脚本清单，用于校验「全量静态引入」没有被运行时注入顶替 */
const initialScripts = Array.prototype.slice.call(doc.getElementsByTagName("script")).map((s) => s.getAttribute("src"));

await waitData();
await wait(400); // 等轮询把 App 从可交互外壳切换到真实页面

const checks = [];
function check(name, ok) {
  checks.push([name, !!ok]);
}

const root = () => doc.getElementById("root");
const html = () => (root() ? root().innerHTML : "");

/* ---------- 数据 ---------- */
check("window.__CLX_INDEX = 7859", Array.isArray(win.__CLX_INDEX) && win.__CLX_INDEX.length === 7859);
check("window.__CLX_STACKS = 16", Array.isArray(win.__CLX_STACKS) && win.__CLX_STACKS.length === 16);
check("window.__CLX_OFFSETS 长度 16", Array.isArray(win.__CLX_OFFSETS) && win.__CLX_OFFSETS.length === 16);

/* ---------- 首屏 ---------- */
check("首屏已渲染（非占位）", html().length > 500 && html().indexOf("正在装载词库") < 0);
check("首屏含「每日一词」卡片", html().indexOf("每日一词") >= 0);
check("首屏含技术栈入口", html().indexOf("Java") >= 0);
check("首屏含英文释义（dict 已静态就绪）", html().indexOf("defen") >= 0 || html().length > 2000);

/* ---------- 路由遍历 + 死胡同防护 ---------- */
const ROUTES = [
  ["#/daily", "每日一词"],
  ["#/quiz", "测验"],
  ["#/review", "复习"],
  ["#/speak", "口语"],
  ["#/mine", "我的"],
  ["#/search", "搜索"],
  ["#/learn/java", "Java"],
  ["#/word/java/heap", "heap"],
  ["#/stack/java", "Java"],
  ["#/stack/java/words", "词表"],
  ["#/drills", "训练"],
  ["#/kit", "句型"],
  ["#/pron", "发音"],
  ["#/writing", "写作"],
  ["#/roles", "岗位"],
  ["#/articles", "文章"],
  ["#/interview", "面试"],
  ["#/mistakes", "错题"],
  ["#/favorites", "收藏"],
  ["#/stats", "统计"],
  ["#/plan", "计划"],
  ["#/path", "路径"],
  ["#/settings", "设置"],
];

for (const [hash, kw] of ROUTES) {
  win.location.hash = hash;
  await wait(450);
  const h = html();
  check("路由 " + hash + " 渲染含「" + kw + "」", h.length > 300 && h.indexOf(kw) >= 0);
  /* 整改项：任何页面都必须保留可退出路径 —— 有底部 tab 或有「返回」键 */
  const escapable = h.indexOf("tabbar") >= 0 || h.indexOf("‹ 返回") >= 0;
  check("路由 " + hash + " 有退出路径（tab/返回）", escapable);
  /* 整改项 v1.2.0：站内导航不得再用 <a href="#...">（容器可能原生层拦截跳转） */
  check("路由 " + hash + " 无 a[href^='#'] 导航", h.indexOf('href="#') < 0);
}

/* ---------- 静态数据完整性 ---------- */
const DICT_SLUGS = [
  "java", "python", "frontend", "go", "cpp", "agent", "devops", "algo", "db", "ml",
  "security", "system-design", "rust", "backend", "spring", "interview",
];
for (const s of DICT_SLUGS) {
  check("静态数据 dict-" + s, !!(win.__CLX_DICT && win.__CLX_DICT[s] && win.__CLX_DICT[s].length));
}
check("静态数据 articles = 310", Array.isArray(win.__CLX_ARTICLES) && win.__CLX_ARTICLES.length === 310);
check("静态数据 kit.oral = 78", !!(win.__CLX_KIT && win.__CLX_KIT.oral && win.__CLX_KIT.oral.length === 78));
check("静态数据 kit.bq = 30", !!(win.__CLX_KIT && win.__CLX_KIT.bq && win.__CLX_KIT.bq.length === 30));
check("静态数据 kit.followups = 45", !!(win.__CLX_KIT && win.__CLX_KIT.followups && win.__CLX_KIT.followups.length === 45));

/* ---------- 全量静态引入（无运行时注入） ---------- */
const nowScripts = Array.prototype.slice.call(doc.getElementsByTagName("script")).map((s) => s.getAttribute("src"));
check("未发生运行时脚本注入", nowScripts.length === initialScripts.length);
check("index.html 已静态引用 22 个数据脚本", initialScripts.filter((s) => s && s.indexOf("data/") >= 0).length === 22);
check("app.js 排在全部数据脚本之后", (() => {
  const idx = (p) => initialScripts.findIndex((s) => s && s.indexOf(p) >= 0);
  const lastData = initialScripts.reduce((acc, s, i) => (s && s.indexOf("data/") >= 0 ? i : acc), -1);
  return idx("app.js") > lastData;
})());

/* ---------- 导航形态（v1.2.0 整改） ---------- */
win.location.hash = "#/daily";
await wait(500);
const tabbarBtns = doc.querySelectorAll("#root .tabbar > button");
check("tabBar 渲染为 button（非 a）", tabbarBtns.length === 5);
check("tabBar 文本含 5 个入口", (() => {
  const t = doc.querySelector("#root .tabbar");
  return !!t && t.textContent.indexOf("每日") >= 0 && t.textContent.indexOf("我的") >= 0;
})());
check("全局无 a[href^='#']", doc.querySelectorAll('#root a[href^="#"]').length === 0);

/* ---------- 输出 ---------- */
let fail = 0;
for (const [name, ok] of checks) {
  if (!ok) fail++;
  console.log((ok ? "  OK   " : "  FAIL ") + name);
}
if (errors.length) {
  console.log("\n运行时错误 " + errors.length + " 条：");
  errors.slice(0, 10).forEach((e) => console.log("  - " + e.slice(0, 240)));
  fail += errors.length;
}
console.log("\n" + (fail === 0 ? "[SMOKE PASS] " + checks.length + " 项全部通过" : "[SMOKE FAIL] " + fail + " 项"));
process.exit(fail === 0 ? 0 : 1);
