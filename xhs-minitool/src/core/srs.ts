/**
 * 简化版 SM-2（与网页版 src/lib/srs.ts 逐行对齐，参数不得改动）。
 * grade: again=1 / hard=3 / good=4 / easy=5
 */
import * as store from "./storage";

export interface ReviewItem {
  stackSlug: string;
  term: string;
  ease: number;
  interval: number;
  due: string;
  reps: number;
}

export type ReviewState = Record<string, ReviewItem>;

const QUALITY: Record<string, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export function reviewKey(stackSlug: string, term: string): string {
  return stackSlug + "::" + term;
}

export function loadReview(): ReviewState {
  return store.get<ReviewState>("review", {} as ReviewState);
}

export function saveReview(state: ReviewState): void {
  store.set("review", state);
}

export function applyGrade(
  state: ReviewState,
  key: string,
  grade: string,
  stackSlug: string,
  term: string
): ReviewState {
  const cur = state[key] || {
    stackSlug,
    term,
    ease: 2.5,
    interval: 0,
    due: new Date().toISOString(),
    reps: 0,
  };
  const q = QUALITY[grade] || 4;
  let ease = cur.ease;
  let interval = cur.interval;
  let reps = cur.reps;

  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    reps += 1;
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const due = new Date(Date.now() + interval * 86400000).toISOString();
  const next: ReviewState = {};
  for (const k in state) next[k] = state[k];
  next[key] = {
    stackSlug,
    term,
    ease: Math.round(ease * 100) / 100,
    interval,
    due,
    reps,
  };
  return next;
}

export function ensureScheduled(state: ReviewState, stackSlug: string, term: string): ReviewState {
  const key = reviewKey(stackSlug, term);
  if (state[key]) return state;
  const next: ReviewState = {};
  for (const k in state) next[k] = state[k];
  next[key] = {
    stackSlug,
    term,
    ease: 2.5,
    interval: 0,
    due: new Date().toISOString(),
    reps: 0,
  };
  return next;
}

export function dueKeys(state: ReviewState, now: number): string[] {
  const out: string[] = [];
  for (const k in state) {
    if (new Date(state[k].due).getTime() <= now) out.push(k);
  }
  return out;
}

/** 已掌握判定：interval >= 21 天（与网页版统计页一致） */
export function isMastered(item: ReviewItem): boolean {
  return !!item && item.interval >= 21;
}

/* ------------------------------------------------------------ 复习日志 -- */
export interface ReviewLog {
  [date: string]: number;
}

export function loadReviewLog(): ReviewLog {
  return store.get<ReviewLog>("reviewLog", {} as ReviewLog);
}

export function bumpReviewLog(): void {
  const log = loadReviewLog();
  const d = new Date().toISOString().slice(0, 10);
  log[d] = (log[d] || 0) + 1;
  store.set("reviewLog", log);
}

/** 连续学习天数（仅统计 SRS 复习，与网页版口径一致） */
export function streak(log: ReviewLog): number {
  const today = new Date();
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    const v = log[d] || 0;
    if (v > 0) n++;
    else if (i > 0) break;
  }
  return n;
}
