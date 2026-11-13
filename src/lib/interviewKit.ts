import fs from "fs";
import path from "path";
import type {
  Phrase,
  OralScript,
  BqItem,
  PronItem,
  Followup,
} from "./interviewKitMeta";

/**
 * 面试口语素材加载层（句型 / 60 秒口述脚本 / 行为面试题 / 追问链 / 易错发音）。
 * 与 articles.ts 一致：进程级缓存，避免每次请求重复读盘解析。
 *
 * 注意：本模块依赖 Node 的 fs，只能在服务端组件 / API 路由中使用。
 * 类型与分类常量请从 "./interviewKitMeta" 导入（客户端组件安全）。
 */

export type { Phrase, OralScript, BqItem, PronItem, Followup, FollowupLink } from "./interviewKitMeta";
export {
  PHRASE_CATS,
  BQ_CATS,
  FOLLOWUP_STACKS,
} from "./interviewKitMeta";

const DATA = path.join(process.cwd(), "data");
const CACHE_KEY = "__codelex_interviewkit_cache__";

type KitCache = {
  phrases: Phrase[];
  oral: OralScript[];
  bq: BqItem[];
  pron: PronItem[];
  followups: Followup[];
};

function getGlobal(): typeof globalThis & { [CACHE_KEY]?: KitCache } {
  return globalThis as typeof globalThis & { [CACHE_KEY]?: KitCache };
}

function readJson<T>(file: string): T[] {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return [];
  try {
    const arr = JSON.parse(fs.readFileSync(p, "utf-8"));
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * 口述脚本来自多个批次文件（oral.json + oral-extra*.json），
 * 按 concept 去重后合并，后出现的批次不覆盖已有条目。
 */
function loadOral(): OralScript[] {
  const out: OralScript[] = [];
  const seen = new Set<string>();
  const files = fs
    .readdirSync(DATA)
    .filter((f) => /^oral(-.+)?\.json$/.test(f))
    .sort();
  for (const f of files) {
    for (const item of readJson<OralScript>(f)) {
      const key = String(item?.concept || "").toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function build(): KitCache {
  return {
    phrases: readJson<Phrase>("phrases.json"),
    oral: loadOral(),
    bq: readJson<BqItem>("bq.json"),
    pron: readJson<PronItem>("pronunciation.json"),
    followups: readJson<Followup>("followups.json"),
  };
}

function cache(): KitCache {
  const g = getGlobal();
  if (!g[CACHE_KEY]) g[CACHE_KEY] = build();
  return g[CACHE_KEY]!;
}

export function getPhrases(): Phrase[] {
  return cache().phrases;
}
export function getOralScripts(): OralScript[] {
  return cache().oral;
}
export function getBqItems(): BqItem[] {
  return cache().bq;
}
export function getPronItems(): PronItem[] {
  return cache().pron;
}
export function getFollowups(): Followup[] {
  return cache().followups;
}
