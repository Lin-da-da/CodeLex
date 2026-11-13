import Link from "next/link";
import { notFound } from "next/navigation";
import { getStack, getWordsByStack, paginate } from "@/lib/wordData";
import StackWordsList from "@/components/StackWordsList";
import Pagination from "@/components/Pagination";
import FrequencyBadge from "@/components/FrequencyBadge";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default function StackPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { q?: string; page?: string; freq?: string };
}) {
  const stack = getStack(params.slug);
  if (!stack) notFound();

  const q = (searchParams.q || "").trim();
  const freq = searchParams.freq || "";
  const page = Number(searchParams.page || "1");

  // 服务端筛选 + 分页：只渲染当前页，避免一次性输出上千条
  const allWords = getWordsByStack(params.slug);
  let words = allWords;
  if (freq) words = words.filter((w) => w.frequency === freq);
  if (q) {
    const t = q.toLowerCase();
    words = words.filter(
      (w) =>
        w.term.toLowerCase().includes(t) ||
        (w.defCn || "").includes(q) ||
        (w.defEn || "").toLowerCase().includes(t) ||
        (w.tags || []).some((tag) => tag.toLowerCase().includes(t))
    );
  }

  const p = paginate(words, page, PER_PAGE);
  const baseParams: Record<string, string | undefined> = { q, freq };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <PageHeader
        back="/"
        icon={stack.icon}
        title={stack.name}
        subtitle={
          <>
            {stack.description}
            <span className="ml-1 text-slate-500">
              {words.length === allWords.length
                ? ` · ${allWords.length} 个单词`
                : ` · 匹配 ${words.length} / ${allWords.length} 个单词`}
            </span>
          </>
        }
        actions={
          <>
            <Link
              href={`/learn/${params.slug}`}
              className="btn btn-ghost px-3 py-1.5 text-xs"
            >
              背词
            </Link>
            <Link
              href={`/stacks/${params.slug}/words`}
              className="btn btn-primary px-3 py-1.5 text-xs"
            >
              全量词表
            </Link>
          </>
        }
      />

      {/* 搜索 + 频率筛选（GET 表单，筛选在服务端完成） */}
      <form action={`/stacks/${params.slug}`} method="get" className="space-y-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索单词 / 释义 / 标签…"
          className="input"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">频率：</span>
          {(["high", "mid", "low"] as const).map((f) => {
            const active = freq === f;
            return (
              <button
                key={f}
                type="submit"
                name="freq"
                value={f}
                className={`rounded-full transition ${active ? "ring-2 ring-emerald-500/70" : "opacity-70 hover:opacity-100"}`}
              >
                <FrequencyBadge frequency={f} size="md" showDot />
              </button>
            );
          })}
          {freq && (
            <Link
              href={`/stacks/${params.slug}${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              清除筛选
            </Link>
          )}
        </div>
      </form>

      {p.items.length === 0 ? (
        <p className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
          没有匹配的单词，换个关键词或清除筛选试试。
        </p>
      ) : (
        <StackWordsList stackSlug={stack.slug} words={p.items} />
      )}

      <Pagination
        page={p.page}
        totalPages={p.totalPages}
        total={p.total}
        baseParams={baseParams}
        label="个单词"
      />
    </main>
  );
}
