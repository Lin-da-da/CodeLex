import fs from "fs";
import path from "path";

export interface Article {
  slug: string;
  stackSlug: string;
  title: string;
  /** 分类（见 CATEGORIES） */
  category?: string;
  difficulty: number;
  /** 正文（Markdown 纯文本，段落以 \n\n 分隔） */
  contentMd: string;
  /** 中文译文（与 contentMd 段落一一对应）；原文为中文时为 null */
  contentCn?: string | null;
  /** 英文译文（与 contentMd 段落一一对应）；原文为英文时为 null */
  contentEn?: string | null;
  license?: string;
}

const DATA = path.join(process.cwd(), "data");

/** 文章分类元数据 */
export const CATEGORIES = [
  { slug: "basics", name: "基础概念", icon: "📘" },
  { slug: "internals", name: "原理机制", icon: "🔧" },
  { slug: "concurrency", name: "并发异步", icon: "⚡" },
  { slug: "performance", name: "性能调优", icon: "🚀" },
  { slug: "architecture", name: "架构设计", icon: "🏗️" },
  { slug: "practice", name: "实战用法", icon: "🛠️" },
  { slug: "tooling", name: "工具工程", icon: "📦" },
  { slug: "pitfalls", name: "常见陷阱", icon: "⚠️" },
  { slug: "interview", name: "面试要点", icon: "🎯" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_MAP: Record<string, { name: string; icon: string }> =
  Object.fromEntries(CATEGORIES.map((c) => [c.slug, { name: c.name, icon: c.icon }]));

/* -------------------------------------------------------------------------- */
/* 缓存层：文章文件在生产环境不随请求变化，进程级缓存避免重复读盘解析           */
/* -------------------------------------------------------------------------- */

type ArticleCache = {
  all: Article[];
  bySlug: Map<string, Article>;
  byCategory: Map<string, Article[]>;
  loadedAt: number;
};

const CACHE_KEY = "__codelex_article_cache__";

function getGlobal(): typeof globalThis & { [CACHE_KEY]?: ArticleCache } {
  return globalThis as typeof globalThis & { [CACHE_KEY]?: ArticleCache };
}

function buildCache(): ArticleCache {
  const baseFile = path.join(DATA, "articles.json");
  const base: Article[] = fs.existsSync(baseFile)
    ? JSON.parse(fs.readFileSync(baseFile, "utf-8"))
    : [];

  let stacks: { slug: string }[] = [];
  try {
    stacks = JSON.parse(fs.readFileSync(path.join(DATA, "stacks.json"), "utf-8"));
  } catch {
    stacks = [];
  }

  const all: Article[] = [...base];
  for (const s of stacks) {
    const f = path.join(DATA, `articles-${s.slug}.json`);
    if (fs.existsSync(f)) {
      try {
        const arr = JSON.parse(fs.readFileSync(f, "utf-8"));
        all.push(...arr);
      } catch {
        /* 忽略损坏的扩展文章文件 */
      }
    }
  }

  const bySlug = new Map(all.map((a) => [a.slug, a]));
  const byCategory = new Map<string, Article[]>();
  for (const a of all) {
    const c = a.category || "basics";
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c)!.push(a);
  }

  return { all, bySlug, byCategory, loadedAt: Date.now() };
}

function cache(): ArticleCache {
  const g = getGlobal();
  if (!g[CACHE_KEY]) g[CACHE_KEY] = buildCache();
  return g[CACHE_KEY]!;
}

export function invalidateArticleCache() {
  delete getGlobal()[CACHE_KEY];
}

/* -------------------------------------------------------------------------- */
/* 读取接口                                                                   */
/* -------------------------------------------------------------------------- */

export function getArticles(): Article[] {
  return cache().all;
}

export function getArticle(slug: string): Article | undefined {
  return cache().bySlug.get(slug);
}

export function getArticlesByStack(stackSlug: string): Article[] {
  return cache().all.filter((a) => a.stackSlug === stackSlug);
}

export function getArticlesByCategory(category: string): Article[] {
  return cache().byCategory.get(category) ?? [];
}

/** 分类 -> 数量统计（用于筛选条） */
export function getCategoryCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of cache().byCategory) out[k] = v.length;
  return out;
}

/* -------------------------------------------------------------------------- */
/* 双语处理                                                                   */
/* -------------------------------------------------------------------------- */

/** 把正文切成段落数组（与译文段落一一对应）。 */
export function splitParagraphs(md: string): string[] {
  return md.split(/\n\n+/).filter((p) => p.trim().length > 0);
}

/**
 * 判断文章主体语言：返回 "en" 或 "zh"。
 * 用于在缺译文时自动回退显示原文。
 */
export function detectLang(md: string): "en" | "zh" {
  const cn = (md.match(/[一-鿿]/g) || []).length;
  const en = (md.match(/[A-Za-z]/g) || []).length;
  return cn * 3 > en ? "zh" : "en";
}

/**
 * 组装对照视图所需的段落对。
 * 返回 [{ en, cn }]，缺失译文的一侧回退为原文。
 */
export function getBilingualParagraphs(article: Article): { en: string; cn: string }[] {
  const paras = splitParagraphs(article.contentMd);
  const src = article.contentCn || article.contentEn;
  const tr = src ? splitParagraphs(src) : [];
  const lang = detectLang(article.contentMd);

  return paras.map((p, i) => {
    const translated = tr[i] ?? "";
    if (lang === "zh") {
      // 原文中文 → 译文为英文
      return { en: translated, cn: p };
    }
    return { en: p, cn: translated };
  });
}
