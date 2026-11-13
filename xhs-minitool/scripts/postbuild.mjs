/**
 * 构建后处理：把 Vite 产物改造成容器要求的形态
 *  1) 脚本必须是经典脚本：去掉 type="module" / crossorigin（容器禁止 module）
 *  2) 路径必须是相对路径：/assets/... → ./assets/...（zip 离线根目录为 /）
 *  3) app.js 必须排在全部数据脚本之后（数据先注入 window，app 再读取）
 *  4) 硬校验：dist/data 下每个文件都必须被 index.html 静态引用，且不允许悬空引用
 *     （静态引入是审核整改项，漂移会直接导致页面空白/按钮失效）
 * 只处理 dist/index.html，不改源码。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const html = path.join(DIST, "index.html");

let s = fs.readFileSync(html, "utf-8");

// 1) 摘掉 Vite 注入的 module script 与 css link
const scriptRe = /<script[^>]*type="module"[^>]*><\/script>\s*/g;
const linkRe = /<link[^>]*rel="stylesheet"[^>]*>\s*/g;
const mScript = s.match(scriptRe);
const mLink = s.match(linkRe);
s = s.replace(scriptRe, "").replace(linkRe, "");

const appSrc = mScript && mScript[0] ? (mScript[0].match(/src="([^"]+)"/) || [])[1] : "./assets/app.js";
const cssHref = mLink && mLink[0] ? (mLink[0].match(/href="([^"]+)"/) || [])[1] : "./assets/style.css";

const rel = (p) => (p.charAt(0) === "/" ? "." + p : p);

// 2) CSS 放回 head
s = s.replace("</style>", "</style>\n  <link rel=\"stylesheet\" href=\"" + rel(cssHref) + "\" />");

// 3) app.js 放到数据脚本之后
s = s.replace("</body>", "  <script src=\"" + rel(appSrc) + "\"></script>\n</body>");

fs.writeFileSync(html, s, "utf-8");
console.log("[postbuild] index.html 已改写：classic script + 相对路径 + 数据脚本优先");
console.log("  css:", rel(cssHref));
console.log("  js :", rel(appSrc));

/* ---------------------------------------------------------------- 4) 校验 -- */
const dataDir = path.join(DIST, "data");
if (!fs.existsSync(dataDir)) {
  console.error("[postbuild] dist/data 不存在：数据未导出，中止");
  process.exit(1);
}
const onDisk = fs
  .readdirSync(dataDir)
  .filter((f) => f.endsWith(".js"))
  .map((f) => "./data/" + f)
  .sort();

// 按出现顺序提取 html 中的脚本 src（保留顺序，用于校验 app.js 位置）
const ordered = [];
const tagRe = /<script[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g;
let m;
while ((m = tagRe.exec(s)) !== null) ordered.push(m[1]);

const referenced = ordered.filter((p) => p.indexOf("./data/") === 0).sort();

const missing = onDisk.filter((f) => referenced.indexOf(f) < 0);
const dangling = referenced.filter((f) => onDisk.indexOf(f) < 0);

if (missing.length || dangling.length) {
  console.error("[postbuild] 数据脚本引用不一致：");
  if (missing.length) console.error("  未被引用（页面会缺数据）：", missing.join(", "));
  if (dangling.length) console.error("  引用了不存在的文件（404）：", dangling.join(", "));
  process.exit(1);
}

// app.js 必须排在最后一个数据脚本之后
const appIdx = ordered.indexOf(rel(appSrc));
const lastDataIdx = ordered.reduce((acc, p, i) => (p.indexOf("./data/") === 0 ? i : acc), -1);
if (appIdx < 0) {
  console.error("[postbuild] index.html 中未找到 app.js 引用");
  process.exit(1);
}
if (appIdx < lastDataIdx) {
  console.error("[postbuild] app.js 排在数据脚本之前，window.__CLX_* 尚未就绪");
  process.exit(1);
}

console.log(
  "[postbuild] 静态引用校验通过：" +
    onDisk.length +
    " 个数据脚本全部静态引入，app.js 位于其后方（顺序 " +
    (lastDataIdx + 1) +
    " → " +
    appIdx +
    "）"
);
