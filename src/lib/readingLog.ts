// 已精读文章记录（本地保存）。用于「学习路径 L2 阅读进阶」的完成度判定。
import { migrateKey, sk } from "./scope";

const KEY = "codelex:read-articles";

/** 返回已读文章的 slug 列表（去重，按首次阅读顺序）。 */
export function getReadArticles(): string[] {
  if (typeof window === "undefined") return [];
  try {
    migrateKey(KEY);
    const raw = localStorage.getItem(sk(KEY));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

export function hasReadArticle(slug: string): boolean {
  return getReadArticles().includes(slug);
}

/** 记录一篇文章已读；重复调用不会产生重复条目。 */
export function addReadArticle(slug: string): string[] {
  if (typeof window === "undefined" || !slug) return [];
  const cur = getReadArticles();
  if (cur.includes(slug)) return cur;
  const next = [...cur, slug].slice(-500);
  try {
    localStorage.setItem(sk(KEY), JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
}
