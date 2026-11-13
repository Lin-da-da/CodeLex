/**
 * 每日一词：确定性日期哈希（与网页版 src/lib/daily.ts 逐行对齐）。
 * 关键：候选池顺序必须与网页版一致，否则同日会选出不同的词。
 */
import { highFlat, liteAt, type Lite } from "./data";

export interface DailyWord {
  date: string;
  lite: Lite;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hashDate(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getDailyWord(d?: Date): DailyWord | null {
  const date = d || new Date();
  const key = dateKey(date);
  const pool = highFlat();
  if (pool.length === 0) return null;
  const pick = pool[hashDate(key) % pool.length];
  return { date: key, lite: liteAt(pick) };
}

export function getRecentDailyWords(days: number): DailyWord[] {
  const out: DailyWord[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getTime() - i * 86400000);
    const w = getDailyWord(d);
    if (w) out.push(w);
  }
  return out;
}
