import { NextResponse } from "next/server";
import { getStack, getWordsByStack, paginate } from "@/lib/wordData";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const stack = getStack(slug);
  if (!stack) {
    return NextResponse.json({ error: "stack not found", code: 404 }, { status: 404 });
  }

  const url = new URL(req.url);
  const difficulty = url.searchParams.get("difficulty");
  const tag = url.searchParams.get("tag");
  const q = url.searchParams.get("q");
  const page = Number(url.searchParams.get("page") || "1");
  const perPage = Number(url.searchParams.get("perPage") || "20");

  let words = getWordsByStack(slug);
  if (difficulty) words = words.filter((w) => String(w.difficulty) === difficulty);
  if (tag) words = words.filter((w) => (w.tags || []).includes(tag));
  if (q) {
    const t = q.toLowerCase();
    words = words.filter(
      (w) =>
        w.term.toLowerCase().includes(t) ||
        (w.defCn || "").includes(t) ||
        (w.defEn || "").toLowerCase().includes(t) ||
        (w.tags || []).some((tg) => tg.toLowerCase().includes(t))
    );
  }

  // 大数据量：仅返回当前页，避免一次性传输/渲染全部词条
  const p = paginate(words, page, perPage);
  return NextResponse.json({
    items: p.items,
    total: p.total,
    page: p.page,
    perPage: p.perPage,
    totalPages: p.totalPages,
    hasPrev: p.hasPrev,
    hasNext: p.hasNext,
  });
}
