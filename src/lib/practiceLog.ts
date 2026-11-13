// 发音/听说练习记录（本地保存）。用于「学习路径 L3 听说输出」的完成度判定。
import { migrateKey, sk } from "./scope";

const KEY = "codelex:practice-log";

export type PracticeKind = "speak" | "listen" | "write";

export interface PracticeEntry {
  t: number; // epoch ms
  kind: string; // PracticeKind
  term?: string;
}

export function getPracticeLog(): PracticeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    migrateKey(KEY);
    const raw = localStorage.getItem(sk(KEY));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as PracticeEntry[]) : [];
  } catch {
    return [];
  }
}

export function getPracticeCount(): number {
  return getPracticeLog().length;
}

/** 追加一次练习记录（跟读打分 / 听力辨词 / 中译英默写）。 */
export function addPractice(kind: PracticeKind, term?: string): PracticeEntry[] {
  if (typeof window === "undefined") return [];
  const cur = getPracticeLog();
  const entry: PracticeEntry = { t: Date.now(), kind };
  if (term) entry.term = term;
  const next = [...cur, entry].slice(-1000);
  try {
    localStorage.setItem(sk(KEY), JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
}
