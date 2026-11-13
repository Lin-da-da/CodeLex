/**
 * 搜索：基于预建 haystack（term + defCn + tags）的线性扫描，与网页版口径一致。
 * 栈内搜索额外匹配 defEn（与网页版 /api/stacks/[slug]/words 一致）需 dict，暂不提供。
 */
import { haystack, liteAt, stacks, type Lite } from "./data";

export interface SearchResult {
  items: Lite[];
  total: number;
  facets: { slug: string; name: string; icon: string; count: number }[];
}

export function search(q: string, stackSlug: string, page: number, perPage: number): SearchResult {
  const query = String(q || "").trim().toLowerCase();
  const empty: SearchResult = { items: [], total: 0, facets: [] };
  if (!query) return empty;

  const hay = haystack();
  const st = stacks();
  const counts: Record<string, number> = {};
  const matched: number[] = [];

  for (let i = 0; i < hay.length; i++) {
    if (hay[i].indexOf(query) < 0) continue;
    const l = liteAt(i);
    if (stackSlug && l.slug !== stackSlug) continue;
    counts[l.slug] = (counts[l.slug] || 0) + 1;
    matched.push(i);
  }

  const start = (page - 1) * perPage;
  const items: Lite[] = [];
  for (let i = start; i < matched.length && items.length < perPage; i++) items.push(liteAt(matched[i]));

  const facets: { slug: string; name: string; icon: string; count: number }[] = [];
  for (let i = 0; i < st.length; i++) {
    if (counts[st[i].slug]) facets.push({ slug: st[i].slug, name: st[i].name, icon: st[i].icon, count: counts[st[i].slug] });
  }

  return { items, total: matched.length, facets };
}

/** 中译英反查：中文释义包含关键词（与网页版 findByChinese 一致） */
export function findByChinese(q: string, limit: number): Lite[] {
  const t = String(q || "").trim();
  if (!t) return [];
  const rows = haystack();
  const out: Lite[] = [];
  for (let i = 0; i < rows.length && out.length < limit; i++) {
    const l = liteAt(i);
    if (l.defCn.indexOf(t) >= 0) out.push(l);
  }
  return out;
}
