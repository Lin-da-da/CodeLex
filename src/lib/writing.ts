import fs from "fs";
import path from "path";

export interface WritingItem {
  id: string;
  cat: string;
  title: string;
  en: string;
  cn: string;
  tips: string[];
}

export const WRITING_CATS: readonly { slug: string; name: string; icon: string }[] = [
  { slug: "pr", name: "PR 描述", icon: "🔀" },
  { slug: "commit", name: "Commit Message", icon: "📝" },
  { slug: "review", name: "Code Review", icon: "🔍" },
  { slug: "design", name: "Design Doc", icon: "📐" },
  { slug: "sync", name: "进度同步", icon: "📣" },
] as const;

const DATA = path.join(process.cwd(), "data");
const CACHE_KEY = "__codelex_writing_cache__";

type WritingCache = {
  writing: WritingItem[];
};

function getGlobal(): typeof globalThis & { [CACHE_KEY]?: WritingCache } {
  return globalThis as typeof globalThis & { [CACHE_KEY]?: WritingCache };
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

function build(): WritingCache {
  return {
    writing: readJson<WritingItem>("writing.json"),
  };
}

function cache(): WritingCache {
  const g = getGlobal();
  if (!g[CACHE_KEY]) g[CACHE_KEY] = build();
  return g[CACHE_KEY]!;
}

export function getWriting(): WritingItem[] {
  return cache().writing;
}
