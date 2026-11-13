import fs from "fs";
import path from "path";
import type { WordSeed, TechStack } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const SEED_DIR = path.join(DATA_DIR, "seed");

/* -------------------------------------------------------------------------- */
/* 缓存层                                                                     */
/*                                                                             */
/* 词库文件体积已达数 MB。此前每次请求都会 readFileSync + JSON.parse 全部      */
/* 词库文件，是「查询太慢」的主因。这里做进程级缓存：首次访问时解析并建立     */
/* 检索索引，之后直接复用；开发模式 HMR 下用 globalThis 兜底避免缓存失效。     */
/*                                                                             */
/* 另：首页 / 每日一词只关心「每栈词数 + 高频数」，原本每次请求都遍历全部     */
/* 词条对象来计数。这里把这两个聚合值在构建缓存时一次性算好，之后请求直接    */
/* 取用，避免每请求重复分配大数组（降低 GC 压力与首字节延迟）。              */
/* -------------------------------------------------------------------------- */

type Cache = {
  stacks: TechStack[];
  stackMap: Map<string, TechStack>;
  /** slug -> 该栈全部词条（只读） */
  words: Map<string, WordSeed[]>;
  /** 全库扁平索引：一次遍历即可完成跨栈检索 */
  flat: FlatWord[];
  /** 扁平条目的检索串（已小写），避免每次检索重复 toLowerCase */
  haystack: string[];
  /** 每栈预聚合：词数 + 高频词数（首页/栈卡片直接取用，免遍历） */
  stackStats: Map<string, { count: number; high: number }>;
  /** 全库高频词扁平索引（每日一词候选池，构建时算一次） */
  highFlat: FlatWord[];
  loadedAt: number;
};

export interface FlatWord {
  stack: TechStack;
  word: WordSeed;
}

const CACHE_KEY = "__codelex_word_cache__";

function getGlobal(): typeof globalThis & { [CACHE_KEY]?: Cache } {
  return globalThis as typeof globalThis & { [CACHE_KEY]?: Cache };
}

/** 构建检索串：术语 + 中文释义 + 标签，合并小写，一次计算多次复用。 */
function buildHaystack(w: WordSeed): string {
  return `${w.term} ${w.defCn || ""} ${(w.tags || []).join(" ")}`.toLowerCase();
}

function buildCache(): Cache {
  const rawStacks: TechStack[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "stacks.json"), "utf-8")
  );
  const stacks = rawStacks.sort((a: TechStack, b: TechStack) => a.order - b.order);

  const stackMap = new Map(stacks.map((s) => [s.slug, s]));
  const words = new Map<string, WordSeed[]>();
  const flat: FlatWord[] = [];
  const haystack: string[] = [];
  const stackStats = new Map<string, { count: number; high: number }>();

  for (const s of stacks) {
    const file = path.join(SEED_DIR, `${s.slug}.json`);
    let arr: WordSeed[] = [];
    if (fs.existsSync(file)) {
      try {
        arr = JSON.parse(fs.readFileSync(file, "utf-8"));
      } catch {
        arr = [];
      }
    }
    words.set(s.slug, arr);

    let high = 0;
    for (const w of arr) {
      flat.push({ stack: s, word: w });
      haystack.push(buildHaystack(w));
      if (w.frequency === "high") high++;
    }
    stackStats.set(s.slug, { count: arr.length, high });
  }

  const highFlat = flat.filter((f) => f.word.frequency === "high");

  return { stacks, stackMap, words, flat, haystack, stackStats, highFlat, loadedAt: Date.now() };
}

function cache(): Cache {
  const g = getGlobal();
  if (!g[CACHE_KEY]) g[CACHE_KEY] = buildCache();
  return g[CACHE_KEY]!;
}

/** 仅供开发调试 / 脚本使用：强制清空缓存（重新读取磁盘数据）。 */
export function invalidateCache() {
  delete getGlobal()[CACHE_KEY];
}

/* -------------------------------------------------------------------------- */
/* 基础读取                                                                   */
/* -------------------------------------------------------------------------- */

export function getStacks(): TechStack[] {
  return cache().stacks;
}

export function getStack(slug: string): TechStack | undefined {
  return cache().stackMap.get(slug);
}

export function getWordsByStack(slug: string): WordSeed[] {
  return cache().words.get(slug) ?? [];
}

export function getAllWords(): { stack: TechStack; words: WordSeed[] }[] {
  const c = cache();
  return c.stacks.map((stack) => ({ stack, words: c.words.get(stack.slug) ?? [] }));
}

/** 每栈预聚合统计（词数 + 高频数），O(栈数) 取用，不遍历词条。 */
export interface StackStat {
  stack: TechStack;
  count: number;
  high: number;
}
export function getStackStats(): StackStat[] {
  const c = cache();
  return c.stacks.map((stack) => {
    const s = c.stackStats.get(stack.slug) ?? { count: 0, high: 0 };
    return { stack, count: s.count, high: s.high };
  });
}

/** 全库总词数。 */
export function getTotalWordCount(): number {
  return cache().flat.length;
}

/** 每日一词候选池（全库高频词），构建时算一次，之后直接复用。 */
export function getDailyCandidates(): FlatWord[] {
  return cache().highFlat;
}

/** 按 term 精确查找词条（跨栈，大小写不敏感，返回首个匹配）。 */
export function getWordByTerm(term: string): FlatWord | undefined {
  const q = term.trim().toLowerCase();
  if (!q) return undefined;
  const c = cache();
  return c.flat.find((f) => f.word.term.toLowerCase() === q);
}

/**
 * 「中 → 英」反查：给出中文释义中包含该关键词的词条。
 * 用于「知道中文意思、不知道英文怎么说」的面试场景。
 */
export function findByChinese(q: string, limit = 40): FlatWord[] {
  const t = q.trim();
  if (!t) return [];
  const c = cache();
  const out: FlatWord[] = [];
  for (let i = 0; i < c.flat.length && out.length < limit; i++) {
    if ((c.flat[i].word.defCn || "").includes(t)) out.push(c.flat[i]);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* 分页工具                                                                   */
/* -------------------------------------------------------------------------- */

export interface Page<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export function paginate<T>(items: T[], page: number, perPage: number): Page<T> {
  const total = items.length;
  const size = Math.max(1, perPage);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (p - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: p,
    perPage: size,
    total,
    totalPages,
    hasPrev: p > 1,
    hasNext: p < totalPages,
  };
}

/* -------------------------------------------------------------------------- */
/* 搜索                                                                       */
/* -------------------------------------------------------------------------- */

export interface SearchOptions {
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数 */
  perPage?: number;
  /** 限定技术栈；不传则跨全部栈搜索 */
  stack?: string;
}

export interface SearchResult extends Page<FlatWord> {
  /** 命中的技术栈数量 */
  stackCount: number;
}

/**
 * 跨栈搜索。
 *  - 检索基于预先构建的小写索引（haystack），避免请求期重复小写化。
 *  - 结果按技术栈顺序 + 命中位置排序，保证分页稳定（不会出现跨页重复/漏项）。
 *  - 大数据量下只对当前页切片返回，避免一次性渲染上千条。
 */
export function searchWords(q: string, opts: SearchOptions = {}): SearchResult {
  const query = q.trim().toLowerCase();
  const c = cache();
  const perPage = Math.min(Math.max(1, opts.perPage ?? 20), 100);
  const page = opts.page ?? 1;

  if (!query) {
    const p = paginate<FlatWord>([], page, perPage);
    return { ...p, stackCount: 0 };
  }

  const matched: FlatWord[] = [];
  const stackSet = new Set<string>();
  const { flat, haystack } = c;

  for (let i = 0; i < flat.length; i++) {
    if (opts.stack && flat[i].stack.slug !== opts.stack) continue;
    if (haystack[i].includes(query)) {
      matched.push(flat[i]);
      stackSet.add(flat[i].stack.slug);
    }
  }

  const p = paginate(matched, page, perPage);
  return { ...p, stackCount: stackSet.size };
}

/**
 * 搜索建议：返回命中词条所属的技术栈分组统计（用于筛选条 UI）。
 */
export function searchStackFacets(q: string): { slug: string; name: string; icon: string; count: number }[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const c = cache();
  const counts = new Map<string, number>();
  for (let i = 0; i < c.flat.length; i++) {
    if (!c.haystack[i].includes(query)) continue;
    const slug = c.flat[i].stack.slug;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return c.stacks
    .filter((s) => counts.has(s.slug))
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      icon: s.icon,
      count: counts.get(s.slug) ?? 0,
    }));
}
