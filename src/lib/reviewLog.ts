// 复习活动日志（本地保存）。按「天」记录复习/评分次数，用于连续天数（streak）与热力图。
import { migrateKey, sk } from "./scope";

const KEY = "codelex:reviewLog";

export type ReviewLog = Record<string, number>; // yyyy-mm-dd -> 次数

export function loadReviewLog(): ReviewLog {
  if (typeof window === "undefined") return {};
  try {
    migrateKey(KEY);
    const raw = localStorage.getItem(sk(KEY));
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? (obj as ReviewLog) : {};
  } catch {
    return {};
  }
}

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** 累加今天的复习次数（默认 +1）。 */
export function logReview(count = 1): ReviewLog {
  const log = loadReviewLog();
  const k = todayKey();
  log[k] = (log[k] ?? 0) + count;
  try {
    localStorage.setItem(sk(KEY), JSON.stringify(log));
  } catch {
    /* noop */
  }
  return log;
}

export function reviewsToday(log: ReviewLog = loadReviewLog()): number {
  return log[todayKey()] ?? 0;
}

export function totalReviews(log: ReviewLog): number {
  return Object.values(log).reduce((s, n) => s + n, 0);
}

/** 连续学习天数（含今天或昨天）。 */
export function currentStreak(log: ReviewLog): number {
  if (Object.keys(log).length === 0) return 0;
  const d = new Date();
  // 若今天没复习，从昨天起算，避免「今天还没学就打断」
  if (!log[todayKey(d)]) d.setDate(d.getDate() - 1);
  let streak = 0;
  for (;;) {
    const k = d.toISOString().slice(0, 10);
    if ((log[k] ?? 0) > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function last7Days(log: ReviewLog): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  const d = new Date();
  for (let i = 6; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    const k = x.toISOString().slice(0, 10);
    out.push({ date: k, count: log[k] ?? 0 });
  }
  return out;
}
