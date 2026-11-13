import { h, render } from "preact";
import App from "./app";
import * as router from "./router";
import * as store from "./core/storage";
import * as data from "./core/data";
import { safeAreaBottom } from "./core/native";
import "./style.css";

/**
 * 能力检测：只在 Chrome 61 基线之上做增强，基线层始终保留。
 * 不使用 UA 判断。
 */
function setupEnv() {
  try {
    const root = document.documentElement;

    // Flex gap 行为检测（语法检测不够，必须实测布局）
    const box = document.createElement("div");
    box.style.position = "absolute";
    box.style.visibility = "hidden";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.rowGap = "1px";
    box.appendChild(document.createElement("div"));
    box.appendChild(document.createElement("div"));
    document.body.appendChild(box);
    if (box.scrollHeight === 1) root.className += " supports-flex-gap";
    box.parentNode.removeChild(box);

    // 视口高度：移动端地址栏/软键盘会让 100vh 不准，JS 维护 --app-height
    const setH = function () {
      root.style.setProperty("--app-height", window.innerHeight + "px");
    };
    setH();
    window.addEventListener("resize", setH);

    // 安全区：优先容器注入的窗口信息，其次 env()，再退化为 0
    safeAreaBottom().then(function (b) {
      if (b && b > 0) root.style.setProperty("--safe-b", b + "px");
    });
  } catch (e) {
    /* 检测失败不影响基线样式 */
  }
}

function boot() {
  setupEnv();
  const root = document.getElementById("root");
  // 异步回补平台 Storage 中可能更持久的数据
  store.hydrate();
  router.bindLinkFallback();
  router.start();
  render(h(App, null), root);

  /**
   * 首屏优先 + 数据就绪切换：
   * 数据脚本为 async（不阻塞首屏），App 在数据未就绪时只渲染可交互外壳
   * （tabBar/导航立即可点）。数据到位后轮询重渲染，App 自动切换到真实页面。
   * 这保证审核/低端机在慢网络下也能立刻看到可点按钮，而非卡死或白屏。
   */
  let ticks = 0;
  const id = setInterval(function () {
    ticks++;
    if (data.dataReady() || ticks > 80) {
      render(h(App, null), root); // 数据已到/超时：重渲染以切换到真实页面或保持外壳
      clearInterval(id);
    }
  }, 150);
  // 极端情况下 load 之后数据才就绪，再兜底刷一次
  window.addEventListener("load", function () {
    render(h(App, null), root);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
