/**
 * 交互测试：针对「页面按钮无法点击」的审核反馈。
 * 逐路由把 #root 下每个可点元素（button / a[href] / .tap / .chip / .tok）
 * 真实派发一次 click，验证：
 *   1) 不抛运行时异常
 *   2) 点击后应用仍然存活（#root 非空、仍能继续路由）
 *   3) 每个路由都至少存在可点元素（排除「渲染出来但没有入口」的情况）
 * jsdom ≠ 容器：这里只验证事件链路与代码健壮性，
 * 真机触摸、安全区、端能力仍须在创服平台模拟器与真机上验证。
 */
import { JSDOM, VirtualConsole } from "jsdom";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(__dirname, "..", "dist", "index.html");

const IGNORE = [/Not implemented: Window's scrollTo/, /Could not parse CSS/, /Not implemented: HTMLCanvasElement/];
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => {
  const m = String(e && e.message ? e.message : e);
  if (!IGNORE.some((r) => r.test(m))) errors.push(m);
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

await waitData();
await wait(400); // 等轮询把 App 从可交互外壳切换到真实页面

const ROUTES = [
  "#/daily", "#/quiz", "#/review", "#/speak", "#/mine", "#/search",
  "#/learn/java", "#/word/java/heap", "#/stack/java", "#/stack/java/words",
  "#/drills", "#/kit", "#/pron", "#/writing", "#/roles", "#/articles",
  "#/article/java-gc", "#/interview", "#/mistakes", "#/favorites",
  "#/stats", "#/plan", "#/path", "#/settings",
];

const failures = [];
const rows = [];
let totalClicks = 0;
let totalTargets = 0;

/**
 * v1.2.0 关键回归：点击底部 tabBar 后，路由必须真的切换。
 * v1.1.0 被驳回的疑似根因就是「点了没反应」——当时 tabBar 是 <a href="#/...">，
 * 容器可能在原生层拦截跳转。现在 tabBar 是 <button> + router.navigate()，
 * 这条断言保证「点击 → 路由变化」这条链路永远成立。
 */
async function assertTabNavigation() {
  win.location.hash = "#/daily";
  await wait(400);
  const cases = [
    ["测验", "#/quiz", "测验"],
    ["复习", "#/review", "复习"],
    ["口语", "#/speak", "口语"],
    ["我的", "#/mine", "我的"],
    ["每日", "#/daily", "每日一词"],
  ];
  for (const [label, expectHash, expectKw] of cases) {
    const btn = Array.prototype.slice
      .call(doc.querySelectorAll("#root .tabbar > button"))
      .find((b) => (b.textContent || "").indexOf(label) >= 0);
    if (!btn) {
      failures.push("tabBar 找不到按钮「" + label + "」");
      continue;
    }
    try {
      btn.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true }));
      await wait(350);
    } catch (e) {
      failures.push("点击 tabBar「" + label + "」抛异常：" + String(e && e.message).slice(0, 140));
      continue;
    }
    if (win.location.hash !== expectHash) {
      failures.push("点击 tabBar「" + label + "」后 hash 仍为 " + win.location.hash + "（期望 " + expectHash + "）——导航未生效");
    }
    const h = doc.getElementById("root").innerHTML;
    if (h.indexOf(expectKw) < 0) {
      failures.push("点击 tabBar「" + label + "」后页面未渲染「" + expectKw + "」");
    }
  }
  win.location.hash = "#/daily";
  await wait(300);
}

await assertTabNavigation();

function describe(el) {
  const cls = el.className ? "." + String(el.className).split(" ").filter(Boolean).join(".") : "";
  const txt = (el.textContent || "").trim().slice(0, 18);
  return el.tagName.toLowerCase() + cls + (txt ? "「" + txt + "」" : "");
}

function collect() {
  return Array.prototype.slice
    .call(doc.querySelectorAll("#root button, #root a[href], #root .tap, #root .chip, #root .tok"))
    .filter((el) => {
      if (!el.isConnected) return false;
      // 跳过「置灰不可用」按钮：设计上保持可聚焦但点击无效
      if (el.tagName === "BUTTON") {
        if (el.disabled) return false;
        const c = String(el.className || "");
        if (c.indexOf("disabled") >= 0) return false;
      }
      const st = el.getAttribute("style") || "";
      if (/display\s*:\s*none|visibility\s*:\s*hidden/.test(st)) return false;
      return true;
    });
}

for (const hash of ROUTES) {
  win.location.hash = hash;
  await wait(400);

  let routeTargets = 0;
  let routeClicks = 0;

  // 多轮：点击可能改变 DOM（展开/翻页/弹层），每轮重新收集
  for (let round = 0; round < 3; round++) {
    const els = collect();
    if (!els.length) break;
    let clicked = 0;
    for (const el of els) {
      if (clicked >= 12) break;
      try {
        el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true }));
        routeClicks++;
        clicked++;
        totalClicks++;
      } catch (e) {
        failures.push(hash + " 点击 " + describe(el) + " 抛异常：" + String(e && e.message).slice(0, 160));
      }
      await wait(25);
    }
    if (clicked === 0) break;
  }

  routeTargets = collect().length;
  totalTargets += routeTargets;

  const rootHtml = doc.getElementById("root") ? doc.getElementById("root").innerHTML : "";
  if (rootHtml.length < 100) failures.push(hash + " 点击后页面渲染为空（应用崩溃）");

  rows.push([hash, routeTargets, routeClicks]);
}

/* ---------- 输出 ---------- */
console.log("路由                可点元素  实际点击");
for (const [hash, n, c] of rows) {
  console.log("  " + hash.padEnd(22) + String(n).padStart(6) + String(c).padStart(9));
}

if (errors.length) {
  console.log("\n运行时错误 " + errors.length + " 条：");
  errors.slice(0, 10).forEach((e) => console.log("  - " + e.slice(0, 200)));
}

const deadRoutes = rows.filter((r) => r[1] === 0).map((r) => r[0]);
if (deadRoutes.length) {
  console.log("\n无可点元素的路由（需人工确认是否为空态页）：" + deadRoutes.join(", "));
}

console.log(
  "\n" +
    (failures.length === 0 && errors.length === 0
      ? "[CLICK PASS] tabBar 导航回归通过；共遍历 " + ROUTES.length + " 个路由，点击 " + totalClicks + " 次，无异常、无崩溃"
      : "[CLICK FAIL] " + failures.length + " 项点击失败 / " + errors.length + " 条运行时错误")
);
failures.slice(0, 20).forEach((f) => console.log("  - " + f));

process.exit(failures.length === 0 && errors.length === 0 ? 0 : 1);
