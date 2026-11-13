/**
 * 学习记录：收藏 / 错题 / 各类日志 / 偏好。数据结构与网页版 src/lib/* 保持一致。
 */
import * as store from "./storage";

/* ------------------------------------------------------------ 收藏 ---- */
export interface Fav {
  stackSlug: string;
  term: string;
}
const FAV_MAX = 2000;

export function favKey(slug: string, term: string): string {
  return slug + "::" + term;
}
export function loadFavorites(): Fav[] {
  return store.get<Fav[]>("favorites", []);
}
export function saveFavorites(list: Fav[]): void {
  store.set("favorites", list.slice(-FAV_MAX));
}
export function toggleFavorite(slug: string, term: string): Fav[] {
  const cur = loadFavorites();
  const k = favKey(slug, term);
  let hit = false;
  const next: Fav[] = [];
  for (let i = 0; i < cur.length; i++) {
    if (favKey(cur[i].stackSlug, cur[i].term) === k) {
      hit = true;
      continue;
    }
    next.push(cur[i]);
  }
  if (!hit) next.push({ stackSlug: slug, term });
  saveFavorites(next);
  return next;
}
export function isFavorite(list: Fav[], slug: string, term: string): boolean {
  const k = favKey(slug, term);
  for (let i = 0; i < list.length; i++) if (favKey(list[i].stackSlug, list[i].term) === k) return true;
  return false;
}

/* ------------------------------------------------------------ 错题 ---- */
export type MistakeSource = "quiz" | "drill" | "interview" | "srs";
export const SOURCE_LABEL: Record<string, string> = {
  quiz: "测验",
  drill: "训练",
  interview: "面试",
  srs: "复习",
};

export interface Mistake {
  term: string;
  stack?: string;
  source: MistakeSource;
  count: number;
  lastAt: number;
}

export function loadMistakes(): Mistake[] {
  return store.get<Mistake[]>("mistakes", []);
}
export function loadMistakesMastered(): string[] {
  return store.get<string[]>("mistakesMastered", []);
}
export function addMistake(term: string, stack: string, source: MistakeSource): void {
  const list = loadMistakes();
  const k = term.trim().toLowerCase();
  let found = false;
  for (let i = 0; i < list.length; i++) {
    if (list[i].term.toLowerCase() === k) {
      list[i].count += 1;
      list[i].lastAt = Date.now();
      list[i].source = source;
      if (stack) list[i].stack = stack;
      found = true;
      break;
    }
  }
  if (!found) list.push({ term, stack, source, count: 1, lastAt: Date.now() });
  store.set("mistakes", list.slice(-3000));
}
export function markMistakeMastered(term: string): void {
  const list = loadMistakes();
  const k = term.trim().toLowerCase();
  const next = list.filter((m) => m.term.toLowerCase() !== k);
  store.set("mistakes", next);
  const done = loadMistakesMastered();
  done.push(term);
  store.set("mistakesMastered", done.slice(-3000));
}
export function clearMistakes(): void {
  store.set("mistakes", []);
  store.set("mistakesMastered", []);
}

/* ------------------------------------------------------------ 日志 ---- */
export interface QuizRecord {
  at: number;
  stacks: string[];
  score: number;
  total: number;
  wrong: string[];
}

export function loadQuizHistory(): QuizRecord[] {
  return store.get<QuizRecord[]>("quizHistory", []);
}
export function addQuizRecord(rec: QuizRecord): void {
  store.set("quizHistory", [rec].concat(loadQuizHistory()).slice(0, 200));
}

export interface PracticeEntry {
  at: number;
  type: string;
  term?: string;
  score?: number;
}
export function loadPracticeLog(): PracticeEntry[] {
  return store.get<PracticeEntry[]>("practiceLog", []);
}
export function addPractice(type: string, term?: string, score?: number): void {
  const e: PracticeEntry = { at: Date.now(), type, term, score };
  store.set("practiceLog", loadPracticeLog().concat([e]).slice(-1000));
}

export function loadReadArticles(): string[] {
  return store.get<string[]>("readArticles", []);
}
export function markArticleRead(slug: string): void {
  const list = loadReadArticles();
  for (let i = 0; i < list.length; i++) if (list[i] === slug) return;
  list.push(slug);
  store.set("readArticles", list.slice(-500));
}

export interface InterviewSession {
  at: number;
  stack: string;
  level: string;
  mode: string;
  items: { q: string; a: string }[];
  score?: number;
  review?: string[];
}
export function loadInterviews(): InterviewSession[] {
  return store.get<InterviewSession[]>("interviewSessions", []);
}
export function addInterview(s: InterviewSession): void {
  store.set("interviewSessions", loadInterviews().concat([s]).slice(-200));
}

export function loadKitMastered(): string[] {
  return store.get<string[]>("kitMastered", []);
}
export function toggleKitMastered(id: string): string[] {
  const list = loadKitMastered();
  const next: string[] = [];
  let hit = false;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === id) {
      hit = true;
      continue;
    }
    next.push(list[i]);
  }
  if (!hit) next.push(id);
  store.set("kitMastered", next);
  return next;
}

/* ------------------------------------------------------------ 偏好 ---- */
export interface Prefs {
  showEn: boolean;
  writingShowCn: boolean;
  reduceMotion: boolean;
}
export function loadPrefs(): Prefs {
  const p = store.get<Prefs>("prefs", { showEn: false, writingShowCn: true, reduceMotion: false });
  return {
    showEn: !!p.showEn,
    writingShowCn: p.writingShowCn !== false,
    reduceMotion: !!p.reduceMotion,
  };
}
export function savePrefs(p: Prefs): void {
  store.set("prefs", p);
}
