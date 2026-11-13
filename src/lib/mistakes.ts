// 错题集：把「测验 / 听说训练 / 模拟面试 / 复习」四个来源的错题汇总成一份清单。
// 数据保存在本机 localStorage；服务端渲染时所有读取一律返回空值，所有写入为空操作。

import { migrateKey, sk } from "./scope";

const KEY = "codelex:mistakes";
const MASTERED_KEY = "codelex:mistakes:mastered";

export type MistakeSource = "quiz" | "drill" | "interview" | "srs";

export const SOURCE_LABEL: Record<MistakeSource, string> = {
  quiz: "测验",
  drill: "训练",
  interview: "面试",
  srs: "复习",
};

export interface Mistake {
  term: string;
  /** 技术栈 slug；能通过词库反查到则填充 */
  stack?: string;
  /** 最近一次答错的来源 */
  source: MistakeSource;
  /** 累计错误次数 */
  count: number;
  /** 最近一次错误时间戳（epoch ms） */
  lastAt: number;
}

/** localStorage 中的原始条目：按 term 归一化去重后累加。 */
interface MistakeEntry {
  term: string;
  stack?: string;
  count: number;
  lastAt: number;
  sources: MistakeSource[];
}

type MistakeStore = Record<string, MistakeEntry>;

function keyOf(term: string): string {
  return term.trim().toLowerCase();
}

function readStore(): MistakeStore {
  if (typeof window === "undefined") return {};
  try {
    migrateKey(KEY);
    const raw = localStorage.getItem(sk(KEY));
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as MistakeStore;
  } catch {
    return {};
  }
}

function writeStore(store: MistakeStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(sk(KEY), JSON.stringify(store));
  } catch {
    /* 存储不可用时静默失败，不影响答题流程 */
  }
}

/** 汇总全部错题，按 count 降序、lastAt 降序排序。 */
export function getMistakes(): Mistake[] {
  const store = readStore();
  const out: Mistake[] = [];
  for (const k of Object.keys(store)) {
    const e = store[k];
    if (!e || typeof e.term !== "string" || !e.term) continue;
    // sources 末位即最近一次错误的来源（见 addMistake）
    const sources = Array.isArray(e.sources) ? e.sources : [];
    const last = sources.length ? sources[sources.length - 1] : "quiz";
    out.push({
      term: e.term,
      stack: e.stack,
      source: last,
      count: Number(e.count) > 0 ? Number(e.count) : 1,
      lastAt: Number(e.lastAt) || 0,
    });
  }
  return out.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
}

/** 记录一次错误：同一 term 累加次数，并把它从「已掌握」中撤回。 */
export function addMistake(
  term: string,
  source: MistakeSource,
  stack?: string
): void {
  if (typeof window === "undefined") return;
  const t = term.trim();
  if (!t) return;

  const store = readStore();
  const k = keyOf(t);
  const prev = store[k];
  const sources = (prev?.sources ?? []).filter((s) => s !== source);
  sources.push(source);

  store[k] = {
    term: t,
    stack: prev?.stack ?? stack,
    count: (prev?.count ?? 0) + 1,
    lastAt: Date.now(),
    sources,
  };
  writeStore(store);

  // 再次答错 → 撤销「已掌握」标记，让它重新回到清单里
  const mastered = getMastered();
  if (mastered.some((m) => keyOf(m) === k)) {
    saveMastered(mastered.filter((m) => keyOf(m) !== k));
  }
}

/** 标记为已掌握：从错题清单移除，记录到 codelex:mistakes:mastered。 */
export function markMastered(term: string): void {
  if (typeof window === "undefined") return;
  const k = keyOf(term);
  if (!k) return;

  const store = readStore();
  if (store[k]) {
    delete store[k];
    writeStore(store);
  }

  const mastered = getMastered();
  if (!mastered.some((m) => keyOf(m) === k)) {
    saveMastered([...mastered, term.trim()]);
  }
}

export function getMastered(): string[] {
  if (typeof window === "undefined") return [];
  try {
    migrateKey(MASTERED_KEY);
    const raw = localStorage.getItem(sk(MASTERED_KEY));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

function saveMastered(list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    // 上限保护：已掌握列表理论上受词库规模约束，但加一道保险防止异常膨胀
    localStorage.setItem(sk(MASTERED_KEY), JSON.stringify(list.slice(-3000)));
  } catch {
    /* noop */
  }
}

/** 清空全部错题（已掌握记录保留，用于统计「攻克了多少」）。 */
export function clearMistakes(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(sk(KEY));
  } catch {
    /* noop */
  }
}
