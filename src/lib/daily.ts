import { getDailyCandidates, getStacks } from "./wordData";
import type { TechStack, WordSeed } from "@/types";

export interface DailyWord {
  date: string; // yyyy-mm-dd
  term: string;
  word: WordSeed;
  stack: TechStack;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 确定性日期哈希，保证同一天得到同一个词。 */
function hashDate(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 取「每日一词」：优先从高频词中按日期确定性挑选（覆盖全部技术栈）。 */
export function getDailyWord(d = new Date()): DailyWord | null {
  const key = dateKey(d);
  // 候选池在缓存构建时已算好（全库高频词），无需每请求重新过滤全量词条。
  const pool = getDailyCandidates();
  if (pool.length === 0) return null;
  const pick = pool[hashDate(key) % pool.length];
  return {
    date: key,
    term: pick.word.term,
    word: pick.word,
    stack: pick.stack,
  };
}

/** 最近 n 天的每日一词（用于「往期回顾」）。 */
export function getRecentDailyWords(days = 7): DailyWord[] {
  const out: DailyWord[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const w = getDailyWord(d);
    if (w) out.push(w);
  }
  return out;
}

export { getStacks };
