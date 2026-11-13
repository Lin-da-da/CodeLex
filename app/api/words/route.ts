import { NextResponse } from "next/server";
import { getStacks, getWordsByStack } from "@/lib/wordData";

export const dynamic = "force-dynamic";

/**
 * 按术语批量取词条详情。
 *
 * 用途：复习队列等场景只关心少数已排期的词，没必要把整个词库（数千条）
 * 序列化进 HTML。此接口按 term 精确取回，避免大 payload。
 *
 * GET /api/words?terms=a,b,c            —— 跨栈按 term 查找
 * GET /api/words?terms=a,b&stack=java  —— 限定技术栈
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const terms = (url.searchParams.get("terms") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const stackSlug = url.searchParams.get("stack") || undefined;

  if (terms.length === 0) {
    return NextResponse.json({ items: [] });
  }
  // 单次请求上限，防止滥用
  const limited = terms.slice(0, 200);

  const wanted = new Set(limited.map((t) => t.toLowerCase()));
  const stacks = stackSlug
    ? getStacks().filter((s) => s.slug === stackSlug)
    : getStacks();

  const items: { stackSlug: string; stackName: string; word: unknown }[] = [];
  for (const s of stacks) {
    for (const w of getWordsByStack(s.slug)) {
      if (wanted.has(w.term.toLowerCase())) {
        items.push({ stackSlug: s.slug, stackName: s.name, word: w });
        wanted.delete(w.term.toLowerCase());
        if (wanted.size === 0) break;
      }
    }
    if (wanted.size === 0) break;
  }

  return NextResponse.json({ items });
}
