// 面试素材「已掌握」进度（口述脚本 / 追问链），保存在本机 localStorage，
// 用于标记练熟的内容并统计完成度。服务端渲染一律返回空，写入为空操作。

import { migrateKey, sk } from "./scope";

const KEY = "codelex:kit-mastered";

/** 已掌握条目的 id 集合（oral 用 concept，followup 用 id）。 */
export function getKitMastered(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    migrateKey(KEY);
    const raw = localStorage.getItem(sk(KEY));
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? (obj as Record<string, true>) : {};
  } catch {
    return {};
  }
}

export function isKitMastered(id: string): boolean {
  return Boolean(getKitMastered()[id]);
}

export function markKitMastered(id: string): void {
  if (typeof window === "undefined" || !id) return;
  const cur = getKitMastered();
  cur[id] = true;
  try {
    localStorage.setItem(sk(KEY), JSON.stringify(cur));
  } catch {
    /* noop */
  }
}

export function unmarkKitMastered(id: string): void {
  if (typeof window === "undefined" || !id) return;
  const cur = getKitMastered();
  if (!cur[id]) return;
  delete cur[id];
  try {
    localStorage.setItem(sk(KEY), JSON.stringify(cur));
  } catch {
    /* noop */
  }
}
