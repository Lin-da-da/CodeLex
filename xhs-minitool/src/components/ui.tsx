import { h, Component, ComponentChildren } from "preact";
import * as router from "../router";

export function Page(props: {
  title: string;
  back?: boolean;
  right?: ComponentChildren;
  children?: ComponentChildren;
  tab?: string;
}) {
  return h(
    "div",
    { class: "page" },
    h(
      "div",
      { class: "topbar" },
      h(
        "button",
        {
          class: "tb-btn",
          onClick: props.back
            ? () => router.back()
            : () => {
                /* 无返回时留空占位 */
              },
        },
        props.back ? "‹ 返回" : ""
      ),
      h("h1", null, props.title),
      h("div", { class: "tb-btn right" }, props.right || "")
    ),
    h(
      "div",
      { class: "content" },
      props.children
    )
  );
}

export function Card(props: { title?: string; children?: ComponentChildren; onClick?: () => void; cls?: string }) {
  return h(
    "div",
    { class: "card" + (props.onClick ? " tap" : "") + (props.cls ? " " + props.cls : ""), onClick: props.onClick },
    props.title ? h("div", { class: "card-title" }, props.title) : null,
    props.children
  );
}

export function Btn(props: {
  children?: ComponentChildren;
  onClick?: (e?: any) => void;
  primary?: boolean;
  ghost?: boolean;
  danger?: boolean;
  sm?: boolean;
  disabled?: boolean;
}) {
  const cls =
    "btn" +
    (props.primary ? " primary" : "") +
    (props.ghost ? " ghost" : "") +
    (props.danger ? " danger" : "") +
    (props.sm ? " sm" : "") +
    (props.disabled ? " disabled" : "");
  return h(
    "button",
    {
      class: cls,
      onClick: props.disabled
        ? undefined
        : (e: any) => {
            if (e && e.preventDefault) e.preventDefault();
            if (props.onClick) props.onClick(e);
          },
    },
    props.children
  );
}

export function Chip(props: { children?: ComponentChildren; kind?: string; onClick?: () => void }) {
  return h(
    "span",
    { class: "chip" + (props.kind ? " " + props.kind : ""), onClick: props.onClick },
    props.children
  );
}

/**
 * 站内导航。
 * 【审核整改】不用 <a href="#/...">：小工具容器普遍在原生层拦截 URL 跳转
 * （shouldOverrideUrlLoading / onNavigationRequest），一旦被拦，
 * 底部 tabBar 与全部入口链接都会「点了没反应」——这正是 v1.1.0 仍被驳回的
 * 疑似根因。改为 <button type="button"> + 显式 router.navigate()，
 * 导航完全走 JS，不依赖浏览器是否允许发生跳转。
 */
export function Link(props: { to: string; cls?: string; children?: ComponentChildren; title?: string }) {
  return h(
    "button",
    {
      type: "button",
      class: "link" + (props.cls ? " " + props.cls : ""),
      title: props.title || "",
      onClick: (e: any) => {
        if (e && e.preventDefault) e.preventDefault();
        router.navigate(props.to);
      },
    },
    props.children
  );
}

export function Empty(props: { icon?: string; children?: ComponentChildren }) {
  return h("div", { class: "empty" }, h("span", { class: "ic" }, props.icon || "🗂"), props.children);
}

/**
 * 整页加载态。
 * 审核整改项：任何「加载中」页面都必须保留可点击的返回键与底部 tab，
 * 否则数据一旦异常，用户会被困死在无导航页面里，表现为「按钮无法点击」。
 */
export function Loading(props: { title?: string; msg?: string; tab?: string }) {
  return h(
    "div",
    { class: "page" },
    h(
      "div",
      { class: "topbar" },
      h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"),
      h("h1", null, props.title || "加载中"),
      h("div", { class: "tb-btn right" }, "")
    ),
    h("div", { class: "content" }, h("div", { class: "boot" }, props.msg || "加载中…")),
    h(TabBar, { active: props.tab || "daily" })
  );
}

export function Seg(props: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return h(
    "div",
    { class: "seg" },
    props.options.map((o) =>
      h(
        "button",
        {
          class: o.key === props.value ? "on" : "",
          onClick: (e: Event) => {
            e.preventDefault();
            props.onChange(o.key);
          },
        },
        o.label
      )
    )
  );
}

export function Stat(props: { v: string; k: string }) {
  return h("div", { class: "stat" }, h("div", { class: "v" }, props.v), h("div", { class: "k" }, props.k));
}

export function Bar(props: { pct: number }) {
  const p = Math.max(0, Math.min(100, props.pct));
  return h("div", { class: "bar" }, h("i", { style: "width:" + p + "%" }));
}

/* ------------------------------------------------------------ 错误边界 -- */
/**
 * 页面渲染抛错时兜底：白屏是最容易被审核判为「功能缺陷」的表现。
 * 捕获后展示可操作的错误页（带返回/回首页），并自动离开出错路由。
 */
export class ErrorBoundary extends Component<{ children?: ComponentChildren }, { err: string }> {
  state = { err: "" };

  componentDidCatch(err: any) {
    const msg = String((err && err.message) || err || "未知错误").slice(0, 300);
    this.setState({ err: msg });
    try {
      router.navigate("/daily"); // 立即离开出错路由，避免反复触发
    } catch (e) {
      /* noop */
    }
  }

  render() {
    if (!this.state.err) return this.props.children;
    const dismiss = () => this.setState({ err: "" });
    return h(
      "div",
      { class: "page" },
      h(
        "div",
        { class: "topbar" },
        h("button", { class: "tb-btn", onClick: dismiss }, "‹ 返回"),
        h("h1", null, "页面出错了"),
        h("div", { class: "tb-btn right" }, "")
      ),
      h(
        "div",
        { class: "content" },
        h(
          "div",
          { class: "card" },
          h("div", { class: "small" }, "这个页面渲染时发生了异常，已阻止白屏。你可以回到首页，其余功能不受影响。"),
          h("div", { class: "code mt12" }, this.state.err)
        ),
        h("button", { class: "btn primary", onClick: dismiss }, "回到首页"),
        h("div", { class: "tiny mute center mt8" }, "若持续出现，请把这个页面截图反馈")
      ),
      h(TabBar, { active: "daily" })
    );
  }
}
let timer: any = null;
export function toast(msg: string): void {
  try {
    let el = document.getElementById("__toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "__toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = "block";
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (el) el.style.display = "none";
    }, 1800);
  } catch (e) {
    /* noop */
  }
}

/* ------------------------------------------------------------ Sheet -- */
/**
 * 底部弹层。始终带显式关闭按钮：容器内部分手势/遮罩点击可能不生效，
 * 不能让弹层成为只能靠系统返回才能退出的陷阱。
 */
export function Sheet(props: { children?: ComponentChildren; onClose: () => void; title?: string }) {
  return h(
    "div",
    null,
    h("div", { class: "mask", onClick: props.onClose }),
    h(
      "div",
      { class: "sheet" },
      h(
        "div",
        { class: "sheet-head" },
        h("span", { class: "bold" }, props.title || ""),
        h("button", { class: "sheet-x", onClick: props.onClose }, "✕ 关闭")
      ),
      props.children
    )
  );
}

/**
 * 页内确认弹层。替代 window.confirm —— 嵌入式 WebView 常禁用/静默忽略
 * confirm()，会让「清空」类按钮点击后毫无反应，表现为按钮失效。
 */
export function Confirm(props: {
  title: string;
  msg: string;
  okLabel?: string;
  danger?: boolean;
  onOk: () => void;
  onCancel: () => void;
}) {
  return h(
    Sheet,
    { title: props.title, onClose: props.onCancel },
    h("div", { class: "small dim" }, props.msg),
    h(
      "div",
      { class: "btn-row mt12" },
      h(Btn, { onClick: props.onCancel }, "取消"),
      h(
        Btn,
        { danger: !!props.danger, primary: !props.danger, onClick: props.onOk },
        props.okLabel || "确定"
      )
    )
  );
}

/* ------------------------------------------------------------ TabBar -- */
const TABS = [
  { key: "daily", icon: "📅", label: "每日" },
  { key: "quiz", icon: "🧪", label: "测验" },
  { key: "review", icon: "🔁", label: "复习" },
  { key: "speak", icon: "🗣️", label: "口语" },
  { key: "mine", icon: "👤", label: "我的" },
];

export function TabBar(props: { active: string }) {
  return h(
    "div",
    { class: "tabbar" },
    TABS.map((t) =>
      h(
        "button",
        {
          type: "button",
          class: props.active === t.key ? "on" : "",
          onClick: (e: any) => {
            if (e && e.preventDefault) e.preventDefault();
            router.navigate("/" + t.key);
          },
        },
        h("span", { class: "ic" }, t.icon),
        h("span", null, t.label)
      )
    )
  );
}
