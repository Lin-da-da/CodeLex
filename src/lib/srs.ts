import type { Grade } from "./srs-types";
import { migrateKey, sk } from "./scope";

export type { Grade };

export interface ReviewItem {
  stackSlug: string;
  term: string;
  ease: number;
  interval: number;
  due: string; // ISO
  reps: number;
}

export type ReviewState = Record<string, ReviewItem>;

const REVIEW_KEY = "codelex:review";

const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export function reviewKey(stackSlug: string, term: string): string {
  return `${stackSlug}::${term}`;
}

export function loadReview(): ReviewState {
  if (typeof window === "undefined") return {};
  try {
    migrateKey(REVIEW_KEY);
    return JSON.parse(localStorage.getItem(sk(REVIEW_KEY)) || "{}") as ReviewState;
  } catch {
    return {};
  }
}

export function saveReview(state: ReviewState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(sk(REVIEW_KEY), JSON.stringify(state));
}

/** 简化版 SM-2：根据评级更新单条复习状态 */
export function applyGrade(
  state: ReviewState,
  key: string,
  grade: Grade,
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
  const q = QUALITY[grade];
  let { ease, interval, reps } = cur;

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
  return {
    ...state,
    [key]: {
      stackSlug,
      term,
      ease: Math.round(ease * 100) / 100,
      interval,
      due,
      reps,
    },
  };
}

/** 若尚未排入复习，则加入（立即可复习） */
export function ensureScheduled(
  state: ReviewState,
  stackSlug: string,
  term: string
): ReviewState {
  const key = reviewKey(stackSlug, term);
  if (state[key]) return state;
  return {
    ...state,
    [key]: {
      stackSlug,
      term,
      ease: 2.5,
      interval: 0,
      due: new Date().toISOString(),
      reps: 0,
    },
  };
}

export function dueKeys(state: ReviewState, now: number = Date.now()): string[] {
  return Object.keys(state).filter(
    (k) => new Date(state[k].due).getTime() <= now
  );
}
