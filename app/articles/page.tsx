import Link from "next/link";
import {
  getArticles,
  getCategoryCounts,
  CATEGORIES,
  CATEGORY_MAP,
} from "@/lib/articles";
import { getStacks } from "@/lib/wordData";
import Pagination from "@/components/Pagination";
import ArticleReadBadge from "@/components/ArticleReadBadge";
import { PageHeader, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

export default function ArticlesPage({
  searchParams,
}: {
  searchParams: { category?: string; stack?: string; page?: string };
}) {
  const category = searchParams.category || "";
  const stack = searchParams.stack || "";
  const page = Number(searchParams.page || "1");

  const all = getArticles();
  const counts = getCategoryCounts();
  const stackMap = new Map(getStacks().map((s) => [s.slug, s]));

  // 服务端筛选
  let list = all;
  if (category) list = list.filter((a) => (a.category || "basics") === category);
  if (stack) list = list.filter((a) => a.stackSlug === stack);

  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const items = list.slice((p - 1) * PER_PAGE, p * PER_PAGE);

  const baseParams: Record<string, string | undefined> = { category, stack };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <PageHeader
        back="/"
        icon="📚"
        title="技术文章"
        subtitle={`${all.length} 篇文章 · 中英对照阅读，点击绿色下划线单词可内联查词并标记生词回流复习。`}
      />

      {/* 分类筛选 */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={`/articles${stack ? `?stack=${stack}` : ""}`}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            !category
              ? "border-emerald-500 bg-emerald-900/40 text-emerald-300"
              : "border-slate-700 text-slate-400 hover:border-slate-500"
          }`}
        >
          全部分类
        </Link>
        {CATEGORIES.filter((c) => counts[c.slug]).map((c) => (
          <Link
            key={c.slug}
            href={`/articles?category=${c.slug}${stack ? `&stack=${stack}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              category === c.slug
                ? "border-emerald-500 bg-emerald-900/40 text-emerald-300"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            {c.icon} {c.name}{" "}
            <span className="text-slate-500">{counts[c.slug]}</span>
          </Link>
        ))}
      </div>

      {/* 技术栈筛选 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-600">技术栈：</span>
        <Link
          href={`/articles${category ? `?category=${category}` : ""}`}
          className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
            !stack
              ? "border-slate-500 bg-slate-800 text-slate-200"
              : "border-slate-800 text-slate-500 hover:border-slate-600"
          }`}
        >
          全部
        </Link>
        {getStacks()
          .filter((s) => all.some((a) => a.stackSlug === s.slug))
          .map((s) => (
            <Link
              key={s.slug}
              href={`/articles?stack=${s.slug}${category ? `&category=${category}` : ""}`}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                stack === s.slug
                  ? "border-slate-500 bg-slate-800 text-slate-200"
                  : "border-slate-800 text-slate-500 hover:border-slate-600"
              }`}
            >
              {s.icon} {s.name}
            </Link>
          ))}
      </div>

      {/* 文章列表 */}
      {items.length === 0 ? (
        <EmptyState title="该筛选条件下暂无文章" desc="换个分类或技术栈试试。" />
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((a) => {
            const cat = a.category ? CATEGORY_MAP[a.category] : undefined;
            const st = stackMap.get(a.stackSlug);
            return (
              <li key={a.slug}>
                <Link
                  href={`/articles/${a.slug}`}
                  className="card card-hover block p-4"
                >
                  <div className="font-semibold">{a.title}</div>
                  {(a as { titleCn?: string }).titleCn && (
                    <div className="mt-0.5 text-sm text-slate-400">
                      {(a as { titleCn?: string }).titleCn}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {st && <span>{st.icon} {st.name}</span>}
                    {cat && (
                      <span className="rounded-full border border-slate-700 px-2 py-0.5">
                        {cat.icon} {cat.name}
                      </span>
                    )}
                    <span>难度 {a.difficulty}</span>
                    {a.license && <span>{a.license}</span>}
                    <ArticleReadBadge slug={a.slug} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={p}
        totalPages={totalPages}
        total={list.length}
        baseParams={baseParams}
        label="篇文章"
      />
    </main>
  );
}
