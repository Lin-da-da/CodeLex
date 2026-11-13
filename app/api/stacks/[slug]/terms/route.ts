import { NextResponse } from "next/server";
import { getStack, getWordsByStack } from "@/lib/wordData";

export const dynamic = "force-dynamic";

/**
 * 仅返回某技术栈的术语列表（不含释义/代码等完整词条）。
 * 复习队列「加入全部词」只需 term 即可排期，避免拉取整个词库对象。
 */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const stack = getStack(params.slug);
  if (!stack) {
    return NextResponse.json({ error: "stack not found", code: 404 }, { status: 404 });
  }
  const terms = getWordsByStack(params.slug).map((w) => w.term);
  return NextResponse.json({ slug: stack.slug, name: stack.name, terms });
}
