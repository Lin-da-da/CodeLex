// 用户数据空间隔离（多账号共用一台电脑时，避免学习数据串号）。
//
// 背景：收藏 / SRS / 测验历史 / 错题集等学习数据原本全部存在全局 localStorage key 上，
// 同一浏览器上 A 退出、B 登录后，B 会看到 A 的数据。这里给每个登录用户分配一个
// 独立的数据空间，把 base key 映射成 "<base>:u:<userId>"。
//
// 未登录时 sk() 原样返回 base key —— 这是向后兼容的关键：匿名用户的历史数据
// 仍然落在原来的 key 上，不会因为本次改动丢失。
//
// 服务端渲染（SSR）时一律视为 "anon"，不读 localStorage，避免水合不一致。

import { getCurrentUser } from "./localAuth";

/** 未登录用户的数据空间 id */
const ANON_SCOPE = "anon";
/** 登录 / 登出时派发的自定义事件名（与 AuthProvider、/login 保持一致） */
const AUTH_CHANGED_EVENT = "codelex:auth-changed";
/** 迁移标记前缀：codelex:scope-migrated:<scopeId>:<baseKey> */
const MIGRATED_PREFIX = "codelex:scope-migrated:";

/** 模块级缓存：避免每次 sk() 都解析一次 session JSON */
let cachedScope: string | null = null;

/** 订阅者：scope 变化（登录 / 登出 / 其它标签页）时回调 */
const listeners = new Set<() => void>();

/** 当前用户空间 id：已登录返回 "u:<userId>"，未登录（或 SSR）返回 "anon" */
export function getScopeId(): string {
  if (cachedScope === null) cachedScope = computeScopeId();
  return cachedScope;
}

function computeScopeId(): string {
  if (typeof window === "undefined") return ANON_SCOPE;
  try {
    const user = getCurrentUser();
    const id = user && typeof user.id === "string" ? user.id.trim() : "";
    return id ? `u:${id}` : ANON_SCOPE;
  } catch {
    return ANON_SCOPE;
  }
}

/**
 * 把基础 key 映射到当前用户空间。
 * 未登录时原样返回 base（向后兼容，匿名数据不迁移、不丢失）。
 */
export function sk(base: string): string {
  const scope = getScopeId();
  return scope === ANON_SCOPE ? base : `${base}:${scope}`;
}

/** 订阅用户空间变化，返回取消订阅函数。SSR 下只做登记，永远不会有事件。 */
export function onScopeChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 重新计算 scope；变化时刷新缓存并通知订阅者。 */
function refreshScope(): void {
  const prev = getScopeId(); // 顺带确保缓存已初始化
  const next = computeScopeId();
  if (next === prev) return;
  cachedScope = next;
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* 单个订阅者出错不影响其它订阅者 */
    }
  });
}

/**
 * 首次以某个账号访问某个 key 时，把已有的全局（匿名）数据**复制**一份到该账号空间。
 * - 复制而非移动：匿名态的数据保持不动，退出登录后仍能看到原来的内容；
 * - 幂等：靠 codelex:scope-migrated:<scopeId>:<base> 标记位保证只复制一次；
 * - 账号空间已有数据时不再复制，账号自己的数据优先。
 *
 * 开销：命中标记位时只有一次 localStorage.getItem，可安全地在每次读取前调用。
 */
export function migrateKey(base: string): void {
  if (typeof window === "undefined") return;
  const scope = getScopeId();
  if (scope === ANON_SCOPE) return; // 未登录用的就是 base 本身，无需迁移

  try {
    const target = sk(base);
    const flag = `${MIGRATED_PREFIX}${scope}:${base}`;
    if (localStorage.getItem(flag)) return;

    // 目标空间已有数据：说明这个账号已经隔离过了，账号自己的数据优先
    if (localStorage.getItem(target) !== null) {
      localStorage.setItem(flag, "1");
      return;
    }

    const raw = localStorage.getItem(base);
    // base 也为空：本次无事可做，且**不落标记**，
    // 这样之后匿名使用产生的数据，仍有机会在下次登录时带入账号。
    if (raw === null) return;

    localStorage.setItem(target, raw);
    localStorage.setItem(flag, "1");
  } catch {
    /* 存储不可用（隐私模式 / 配额）时静默跳过，不影响正常使用 */
  }
}

// 模块级只注册一次监听，保证订阅者回调触发时缓存已经是最新值
if (typeof window !== "undefined") {
  window.addEventListener(AUTH_CHANGED_EVENT, refreshScope);
  // 多标签页：其它标签页登录 / 登出时同步
  window.addEventListener("storage", refreshScope);
}
