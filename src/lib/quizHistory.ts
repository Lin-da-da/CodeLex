// 测验历史（本地保存，无需登录）。用于「学习统计」仪表盘。
import { migrateKey, sk } from "./scope";

const KEY = "codelex:quizHistory";

export interface QuizRecord {
  at: number; // epoch ms
  stacks: string[];
  score: number;
  total: number;
  wrong: string[];
}

export function loadQuizHistory(): QuizRecord[] {
  if (typeof window === "undefined") return [];
  try {
    migrateKey(KEY);
    const raw = localStorage.getItem(sk(KEY));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as QuizRecord[]) : [];
  } catch {
    return [];
  }
}

export function addQuizRecord(rec: QuizRecord): QuizRecord[] {
  const all = loadQuizHistory();
  const next = [rec, ...all].slice(0, 200);
  try {
    localStorage.setItem(sk(KEY), JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
}

export function quizStats(history: QuizRecord[]) {
  const totalQuizzes = history.length;
  const totalQuestions = history.reduce((s, r) => s + r.total, 0);
  const totalCorrect = history.reduce((s, r) => s + r.score, 0);
  const avg =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const totalWrong = history.reduce((s, r) => s + r.wrong.length, 0);
  return { totalQuizzes, totalQuestions, totalCorrect, avg, totalWrong };
}
