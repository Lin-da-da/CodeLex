/**
 * 数据层：读取由 scripts/export-xhs-data.mjs 生成的包内 .js 数据。
 * 容器禁止 fetch/XHR，数据只能由 <script src> 注入到 window 上。
 * 【全量静态引入】L0/L1 全部数据已在 index.html 中静态声明，
 * app.js 执行时 window.__CLX_* 必然已就绪，因此加载器命中即同步返回；
 * 运行时注入仅作为「静态脚本缺失」时的兜底，正常路径永不触发。
 */
export const SEP1 = "\u0001";
export const SEP2 = "\u0002";

export interface Stack {
  slug: string;
  name: string;
  icon: string;
  desc: string;
  count: number;
  high: number;
}

export interface Lite {
  i: number;
  term: string;
  slug: string;
  phonetic: string;
  pos: string;
  defCn: string;
  freq: number; // 0=high 1=mid 2=low
  difficulty: number;
  tags: string[];
}

export interface Full extends Lite {
  defEn: string;
  codeExample: string;
  exampleSentence: string;
  exampleSentences: string[];
}

export interface Article {
  slug: string;
  stackSlug: string;
  title: string;
  category: string;
  difficulty: number;
  license: string;
  en: string[];
  cn: string[];
  words: number;
}

export interface Manifest {
  schema: number;
  buildTime: string;
  version?: string;
  total: number;
  articles: number;
}

declare const window: any;

const FREQ_NAME = ["high", "mid", "low"];

/* ------------------------------------------------------------ 基础数据 -- */
let _stacks: Stack[] | null = null;
let _rows: any[] | null = null;
let _offsets: number[] | null = null;
let _hay: string[] | null = null;

function rows(): any[] {
  if (!_rows) _rows = window.__CLX_INDEX || [];
  return _rows;
}
function offsets(): number[] {
  if (!_offsets) _offsets = window.__CLX_OFFSETS || [];
  return _offsets;
}

export function stacks(): Stack[] {
  if (_stacks) return _stacks;
  const raw = window.__CLX_STACKS || [];
  const off = offsets();
  const r = rows();
  _stacks = raw.map((s: any[], i: number) => {
    const start = off[i] || 0;
    const end = i + 1 < off.length ? off[i + 1] : r.length;
    let high = 0;
    for (let k = start; k < end; k++) if (r[k][5] === 0) high++;
    return {
      slug: s[0],
      name: s[1],
      icon: s[2],
      desc: s[3] || "",
      count: end - start,
      high,
    };
  });
  return _stacks;
}

export function stackBySlug(slug: string): Stack | undefined {
  const list = stacks();
  for (let i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
  return undefined;
}

export function total(): number {
  return rows().length;
}

export function manifest(): Manifest {
  return window.__CLX_MANIFEST || { schema: 0, buildTime: "-", total: 0, articles: 0 };
}

export function liteAt(i: number): Lite {
  const r = rows()[i];
  const st = stacks();
  return {
    i,
    term: r[0],
    slug: st[r[1]] ? st[r[1]].slug : "",
    phonetic: r[2],
    pos: r[3],
    defCn: r[4],
    freq: r[5],
    difficulty: r[6],
    tags: r[7] ? String(r[7]).split(" ") : [],
  };
}

export function freqName(f: number): string {
  return FREQ_NAME[f] || "low";
}

/** 检索串：term + defCn + tags（与网页版 wordData.ts 的 haystack 完全一致，不含 defEn） */
export function haystack(): string[] {
  if (_hay) return _hay;
  const r = rows();
  const out = new Array(r.length);
  for (let i = 0; i < r.length; i++) {
    out[i] = (r[i][0] + " " + r[i][4] + " " + (r[i][7] || "")).toLowerCase();
  }
  _hay = out;
  return out;
}

export function stackRange(slug: string): [number, number] {
  const st = stacks();
  const off = offsets();
  for (let i = 0; i < st.length; i++) {
    if (st[i].slug === slug) {
      const start = off[i] || 0;
      const end = i + 1 < off.length ? off[i + 1] : rows().length;
      return [start, end];
    }
  }
  return [0, 0];
}

/** 全库高频词（每日一词候选池，顺序与网页版 highFlat 一致） */
export function highFlat(): number[] {
  const r = rows();
  const out: number[] = [];
  for (let i = 0; i < r.length; i++) if (r[i][5] === 0) out.push(i);
  return out;
}

/* ------------------------------------------------------------ 就绪等待 -- */
/**
 * 全量静态引入：22 个数据脚本在 index.html 中声明为 <script async src>，
 * 浏览器并行下载、不阻塞首屏；应用先渲染可交互外壳（tabBar/导航立即可点），
 * 数据脚本到位后各自把 window.__CLX_* 挂上。这里只做「轮询等待全局就绪」，
 * 不再创建任何运行时 <script>（容器禁止动态注入，避免被审核判为脚本注入），
 * 保证页面永远不会卡在「加载中」且首屏立刻出现可点按钮。
 */
const READY_POLL = 50;
const READY_TIMEOUT = 8000;

function waitFor(check: () => boolean): Promise<boolean> {
  if (check()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let n = 0;
    const iv = setInterval(function () {
      n++;
      const ok = check();
      if (ok || n * READY_POLL >= READY_TIMEOUT) {
        clearInterval(iv);
        resolve(ok);
      }
    }, READY_POLL);
  });
}

export function loadDict(slug: string): Promise<boolean> {
  if (!slug) return Promise.resolve(false); // 防御：栈 slug 缺失时不发起无效轮询
  return waitFor(() => !!(window.__CLX_DICT && window.__CLX_DICT[slug]));
}

export function loadArticles(): Promise<boolean> {
  return waitFor(() => !!window.__CLX_ARTICLES);
}

export function loadKit(): Promise<boolean> {
  return waitFor(() => !!window.__CLX_KIT);
}

/** 同步就绪判定：静态引入命中时为 true，供页面初始化 state，避免首帧禁用/骨架 */
export function articlesReady(): boolean {
  return !!window.__CLX_ARTICLES;
}

export function kitReady(): boolean {
  return !!window.__CLX_KIT;
}

/** 全部数据是否已静态就绪（用于启动自检/调试） */
export function dataReady(): boolean {
  return !!(
    window.__CLX_INDEX &&
    window.__CLX_STACKS &&
    window.__CLX_OFFSETS &&
    window.__CLX_DICT &&
    window.__CLX_ARTICLES &&
    window.__CLX_KIT
  );
}

/* ------------------------------------------------------------ 详情 ---- */
const dictMap: Record<string, Record<string, any[]>> = {};

function dictOf(slug: string): Record<string, any[]> | null {
  const raw = window.__CLX_DICT && window.__CLX_DICT[slug];
  if (!raw) return null;
  if (dictMap[slug]) return dictMap[slug];
  const m: Record<string, any[]> = {};
  for (let i = 0; i < raw.length; i++) m[raw[i][0]] = raw[i];
  dictMap[slug] = m;
  return m;
}

export function dictReady(slug: string): boolean {
  return !!dictOf(slug);
}

/** 取完整词条（需先 loadDict） */
export function full(slug: string, term: string): Full | null {
  const i = indexOf(slug, term);
  if (i < 0) return null;
  const base = liteAt(i);
  const d = dictOf(slug);
  const row = d ? d[term] : null;
  if (!row) return { ...base, defEn: "", codeExample: "", exampleSentence: "", exampleSentences: [] };
  const sents = row[4] ? String(row[4]).split(SEP1) : [];
  return {
    ...base,
    defEn: row[1] || "",
    codeExample: row[2] || "",
    exampleSentence: row[3] || "",
    exampleSentences: sents,
  };
}

/** 栈内按 term 查全局下标 */
export function indexOf(slug: string, term: string): number {
  const [start, end] = stackRange(slug);
  const r = rows();
  const t = term.toLowerCase();
  for (let i = start; i < end; i++) if (r[i][0].toLowerCase() === t) return i;
  return -1;
}

/**
 * term → 全局下标 的倒排索引（首次调用时构建，O(n)）。
 * 文章页逐词点击、岗位词包导出、面试复盘都会高频调用 findTerm，
 * 线性扫 7859 行在低端 WebView 上会造成可感知卡顿，故用 Map 查表。
 * 语义与网页版 getWordByTerm 一致：同名取 rows() 顺序中的第一个。
 */
let _termIndex: Map<string, number> | null = null;

function termIndex(): Map<string, number> {
  if (_termIndex) return _termIndex;
  const m = new Map<string, number>();
  const r = rows();
  for (let i = 0; i < r.length; i++) {
    const k = String(r[i][0]).toLowerCase();
    if (!m.has(k)) m.set(k, i);
  }
  _termIndex = m;
  return m;
}

/** 跨栈按 term 查（返回首个，与网页版 getWordByTerm 一致） */
export function findTerm(term: string): Lite | null {
  const i = termIndex().get(String(term || "").toLowerCase());
  return i === undefined ? null : liteAt(i);
}

/* ------------------------------------------------------------ 文章 ---- */
let _articles: Article[] | null = null;

export function articles(): Article[] {
  if (_articles) return _articles;
  const raw = window.__CLX_ARTICLES || [];
  const st = stacks();
  _articles = raw.map((a: any[]) => {
    const en = a[6] ? String(a[6]).split(SEP2) : [];
    const cn = a[7] ? String(a[7]).split(SEP2) : [];
    let words = 0;
    for (let i = 0; i < en.length; i++) words += en[i].split(/\s+/).length;
    return {
      slug: a[0],
      stackSlug: a[1] >= 0 && st[a[1]] ? st[a[1]].slug : "",
      title: a[2],
      category: a[3],
      difficulty: a[4],
      license: a[5] || "",
      en,
      cn,
      words,
    };
  });
  return _articles;
}

export function articleBySlug(slug: string): Article | null {
  const list = articles();
  for (let i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
  return null;
}

export const CATEGORIES: { slug: string; name: string; icon: string }[] = [
  { slug: "basics", name: "基础概念", icon: "📘" },
  { slug: "internals", name: "原理机制", icon: "🔧" },
  { slug: "concurrency", name: "并发异步", icon: "⚡" },
  { slug: "performance", name: "性能调优", icon: "🚀" },
  { slug: "architecture", name: "架构设计", icon: "🏗️" },
  { slug: "practice", name: "实战用法", icon: "🛠️" },
  { slug: "tooling", name: "工具工程", icon: "📦" },
  { slug: "pitfalls", name: "常见陷阱", icon: "⚠️" },
  { slug: "interview", name: "面试要点", icon: "🎯" },
];

/* ------------------------------------------------------------ 专项 ---- */
export function kit(): any {
  return window.__CLX_KIT || { phrases: [], oral: [], bq: [], followups: [], pron: [], writing: [], roles: [] };
}
