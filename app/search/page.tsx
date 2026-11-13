import Link from "next/link";
import { searchWords, searchStackFacets } from "@/lib/wordData";
import Pagination from "@/components/Pagination";
import FrequencyBadge from "@/components/FrequencyBadge";
import { PageHeader, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; stack?: string };
}) {
  const q = (searchParams.q || "").trim();
  const page = Number(searchParams.page || "1");
  const stack = searchParams.stack;

  const result = searchWords(q, { page, perPage: PER_PAGE, stack });
  const facets = q ? searchStackFacets(q) : [];
  // 「中 → 英」反查：查询含中文时，命中的是中文释义，需突出对应的英文说法
  const isChinese = /[\u4e00-\u9fa5]/.test(q);

  const baseParams: Record<string, string | undefined> = { q, stack };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <PageHeader back="/" icon="🔍" title="全局搜索" subtitle="跨全部技术栈搜索单词、中文释义或标签。" />

      <form action="/search" method="get" className="mt-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="输入单词、中文释义或标签，跨全部技术栈搜索…"
          autoFocus
          className="input"
        />
      </form>

      {q && (
        <p className="mt-3 text-sm text-slate-500">
          找到 {result.total} 个匹配（{result.stackCount} 个技术栈）
          {stack && ` · 已筛选「${stack}」`}
        </p>
      )}

      {q && isChinese && (
        <p className="mt-2 rounded-lg border border-emerald-800/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          中 → 英 模式：下面是中文意思对应的<strong>英文说法</strong>，点击单词可看详情与跟读。
        </p>
      )}

      {/* 技术栈筛选 */}
      {facets.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/search?q=${encodeURIComponent(q)}`}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              !stack
                ? "border-emerald-500 bg-emerald-900/40 text-emerald-300"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            全部
          </Link>
          {facets.map((f) => (
            <Link
              key={f.slug}
              href={`/search?q=${encodeURIComponent(q)}&stack=${f.slug}`}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                stack === f.slug
                  ? "border-emerald-500 bg-emerald-900/40 text-emerald-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {f.icon} {f.name} <span className="text-slate-500">{f.count}</span>
            </Link>
          ))}
        </div>
      )}

      {/* 结果列表 */}
      <div className="mt-6 space-y-3">
        {result.items.map((r, i) => (
          <div
            key={`${r.stack.slug}-${r.word.term}-${i}`}
            className="card p-4"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <Link
                href={`/word/${encodeURIComponent(r.word.term)}`}
                className="font-mono text-base font-semibold text-emerald-300 hover:underline"
              >
                {r.word.term}
              </Link>
              {r.word.pos && (
                <span className="text-xs text-slate-500">{r.word.pos}</span>
              )}
              <FrequencyBadge frequency={r.word.frequency} size="md" showDot />
              <span className="ml-auto text-xs text-slate-500">
                {r.stack.icon} {r.stack.name}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{r.word.defCn}</p>
            {r.word.defEn && (
              <p className="mt-0.5 text-sm text-slate-500">{r.word.defEn}</p>
            )}
            {r.word.exampleSentences?.[0] && (
              <p className="mt-1 text-sm italic text-slate-400">
                “{r.word.exampleSentences[0]}”
              </p>
            )}
          </div>
        ))}

        {q && result.total === 0 && (
          <EmptyState title="没有匹配的单词" desc="换个关键词试试。" />
        )}
      </div>

      {q && result.total > 0 && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          baseParams={baseParams}
          label="个匹配单词"
        />
      )}
    </main>
  );
}
