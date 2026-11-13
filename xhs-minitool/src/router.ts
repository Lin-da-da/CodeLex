/** hash 路由：容器不支持 history 跳转，单入口 + hash 切换，返回键天然可用 */
export interface Route {
  name: string;
  p1: string;
  p2: string;
  q: Record<string, string>;
}

const subs: ((r: Route) => void)[] = [];

export function parse(hash: string): Route {
  let h = String(hash || "").replace(/^#/, "");
  if (!h) h = "/";
  const qi = h.indexOf("?");
  const path = qi >= 0 ? h.slice(0, qi) : h;
  const qs = qi >= 0 ? h.slice(qi + 1) : "";
  const segs = path.split("/").filter((s) => s.length > 0);
  const q: Record<string, string> = {};
  if (qs) {
    const parts = qs.split("&");
    for (let i = 0; i < parts.length; i++) {
      const kv = parts[i].split("=");
      if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    }
  }
  return {
    name: segs[0] || "daily",
    p1: segs[1] ? decodeURIComponent(segs[1]) : "",
    p2: segs[2] ? decodeURIComponent(segs[2]) : "",
    q,
  };
}

export function current(): Route {
  return parse(window.location.hash);
}

export function navigate(to: string): void {
  const t = to.charAt(0) === "#" ? to : "#" + to;
  if (window.location.hash === t) {
    emit();
    return;
  }
  window.location.hash = t;
}

export function back(): void {
  if (window.history && window.history.length > 1) window.history.back();
  else navigate("/daily");
}

export function subscribe(cb: (r: Route) => void): () => void {
  subs.push(cb);
  return () => {
    const i = subs.indexOf(cb);
    if (i >= 0) subs.splice(i, 1);
  };
}

function emit(): void {
  const r = current();
  for (let i = 0; i < subs.length; i++) subs[i](r);
}

export function start(): void {
  window.addEventListener("hashchange", emit);
  if (!window.location.hash) window.location.replace("#/daily");
  emit();

  /* 兜底轮询：个别容器/WebView 不保证派发 hashchange。
     直接比对字符串，命中才 emit，成本可忽略；有了它，
     即便 hashchange 完全不触发，导航依然能刷新界面。 */
  let last = window.location.hash;
  setInterval(function () {
    const now = window.location.hash;
    if (now !== last) {
      last = now;
      emit();
    }
  }, 150);
}

/**
 * 全局点击委托：兜住任何残留的 <a href="#/...">。
 * 容器可能在原生层拦截 URL 跳转（点击后浏览器什么都没做），
 * 这里统一 preventDefault + 手动导航，保证站内跳转绝不依赖浏览器行为。
 */
export function bindLinkFallback(): void {
  document.addEventListener("click", function (e: any) {
    try {
      const t = e && e.target;
      if (!t || typeof t.closest !== "function") return;
      const a = t.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute("href") || "";
      if (href.length > 1) navigate(href.slice(1));
    } catch (err) {
      /* noop */
    }
  });
}
