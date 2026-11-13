import { NextResponse } from "next/server";
import { getStacks, getWordsByStack } from "@/lib/wordData";
import { toQuizWord, shuffle, type QuizWord } from "@/lib/quiz";

export const dynamic = "force-dynamic";

/**
 * 测验题池接口。
 *
 * GET /api/quiz?stacks=java,go&pool=60
 *
 * 跨所选技术栈抽取一个「轻量题池」（只含 term/phonetic/defCn/frequency）。
 * 客户端从题池里组卷（10 题 × 4 选 1），因此服务端不必下发全量词条，
 * 避免万级词库下产生数 MB 的 HTML payload。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slugs = (url.searchParams.get("stacks") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const poolSize = Math.min(
    Math.max(Number(url.searchParams.get("pool") || 80), 20),
    200
  );

  const valid = new Set(getStacks().map((s) => s.slug));
  const chosen = slugs.filter((s) => valid.has(s));
  if (chosen.length === 0) {
    return NextResponse.json({ items: [], total: 0, stacks: [] });
  }

  // 合并所选词库，按 term 去重
  const seen = new Set<string>();
  const merged: QuizWord[] = [];
  for (const slug of chosen) {
    for (const w of getWordsByStack(slug)) {
      const k = w.term.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(toQuizWord(w, slug));
    }
  }

  const items = shuffle(merged).slice(0, poolSize);
  return NextResponse.json({
    items,
    total: merged.length,
    stacks: chosen,
  });
}
