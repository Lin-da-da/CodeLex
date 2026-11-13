/**
 * 面试口语素材的「纯定义层」：类型 + 分类常量。
 *
 * 这里刻意不 import fs / path —— 客户端组件（InterviewKitClient）需要用到
 * 这些类型与分类常量，而 interviewKit.ts 依赖 Node 的 fs，一旦被客户端组件
 * 直接引用，webpack 打包浏览器端就会报 "Module not found: Can't resolve 'fs'"。
 * 把不依赖运行时的定义抽出来，是让同一份类型同时服务服务端与客户端的最小代价做法。
 */

export interface Phrase {
  id: string;
  cat: string;
  en: string;
  cn: string;
  note?: string;
}

export interface OralScript {
  concept: string;
  stack: string;
  seconds: number;
  en: string;
  cn: string;
  keywords: string[];
}

export interface BqItem {
  id: string;
  cat: string;
  qEn: string;
  qCn: string;
  aEn: string;
  aCn: string;
  tips?: string;
}

export interface PronItem {
  term: string;
  ipa: string;
  common?: string;
  correct?: string;
  tipCn?: string;
  ex?: string;
}

/** 追问链中的单级追问。 */
export interface FollowupLink {
  level: number;
  en: string;
  cn: string;
}

/** 一个主题的 3 层追问链：概念原理 → 权衡边界 → 实战排障。 */
export interface Followup {
  id: string;
  stack: string;
  topic: string;
  chain: FollowupLink[];
  hintEn?: string;
  hintCn?: string;
}

export const PHRASE_CATS = [
  { slug: "self-intro", name: "自我介绍", icon: "👋" },
  { slug: "star", name: "项目经历", icon: "🚀" },
  { slug: "explain", name: "解释技术", icon: "🛠️" },
  { slug: "clarify", name: "澄清追问", icon: "❓" },
  { slug: "filler", name: "缓冲句", icon: "⏳" },
  { slug: "wrap", name: "收尾反问", icon: "🎯" },
] as const;

export const BQ_CATS = [
  { slug: "teamwork", name: "团队协作", icon: "🤝" },
  { slug: "conflict", name: "冲突处理", icon: "⚔️" },
  { slug: "failure", name: "失败复盘", icon: "🩹" },
  { slug: "leadership", name: "主导推动", icon: "🧭" },
  { slug: "impact", name: "业务影响", icon: "📈" },
  { slug: "growth", name: "学习成长", icon: "🌱" },
  { slug: "ambiguity", name: "模糊不确定", icon: "🌫️" },
] as const;

export const FOLLOWUP_STACKS = [
  { slug: "java", name: "Java", icon: "☕" },
  { slug: "spring", name: "Spring", icon: "🍃" },
  { slug: "backend", name: "后端通用", icon: "🔌" },
  { slug: "system-design", name: "系统设计", icon: "🏗️" },
  { slug: "db", name: "数据库", icon: "🗄️" },
  { slug: "frontend", name: "前端", icon: "🎨" },
  { slug: "go", name: "Go", icon: "🐹" },
  { slug: "python", name: "Python", icon: "🐍" },
  { slug: "devops", name: "DevOps", icon: "☸️" },
  { slug: "algo", name: "算法", icon: "🧮" },
  { slug: "security", name: "安全", icon: "🛡️" },
  { slug: "ml", name: "机器学习", icon: "🧠" },
] as const;
