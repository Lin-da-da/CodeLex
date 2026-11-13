// AI 模拟面试场次记录（本地保存）。用于「学习路径 L4 模面冲刺」的完成度判定。
import { migrateKey, sk } from "./scope";

const KEY = "codelex:interview-sessions";

/** 可序列化的报告摘要，用于历史存档（不存逐题原文，控制体积）。 */
export interface ReportSummary {
  overall_score: number;
  level: string;
  verdict: string;
  suggestions: string[];
  vocab_to_review: string[];
  weaknesses: string[];
  strengths: string[];
}

export interface InterviewSession {
  t: number; // epoch ms
  stack?: string;
  difficulty?: string;
  score?: number;
  report?: ReportSummary;
}

export function getInterviewSessions(): InterviewSession[] {
  if (typeof window === "undefined") return [];
  try {
    migrateKey(KEY);
    const raw = localStorage.getItem(sk(KEY));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as InterviewSession[]) : [];
  } catch {
    return [];
  }
}

export function getInterviewSessionCount(): number {
  return getInterviewSessions().length;
}

/** 记录一场完成的模拟面试（生成最终报告时调用一次）。 */
export function addInterviewSession(s?: Omit<InterviewSession, "t">): InterviewSession[] {
  if (typeof window === "undefined") return [];
  const cur = getInterviewSessions();
  const next = [...cur, { t: Date.now(), ...s }].slice(-200);
  try {
    localStorage.setItem(sk(KEY), JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
}
