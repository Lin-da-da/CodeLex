import Link from "next/link";

/**
 * 通用分页控件。纯服务端渲染，通过 URL 查询参数翻页。
 * 保留已有的查询参数（q / stack 等），只覆盖 page。
 */
export default function Pagination({
  page,
  totalPages,
  total,
  baseParams = {},
  label = "条记录",
}: {
  page: number;
  totalPages: number;
  total: number;
  /** 构造链接时保留的其他查询参数 */
  baseParams?: Record<string, string | undefined>;
  label?: string;
}) {
  if (totalPages <= 1) {
    return total > 0 ? (
      <p className="mt-6 text-center text-xs text-slate-500">
        共 {total} {label}
      </p>
    ) : null;
  }

  function href(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) {
      if (v) params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  // 生成页码序列：首页 … 当前页±1 … 末页
  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (page > 3) push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      push(i);
    }
    if (page < totalPages - 2) push("…");
    push(totalPages);
  }

  const btn =
    "rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-40 disabled:pointer-events-none";

  return (
    <nav
      aria-label="分页"
      className="mt-8 flex flex-col items-center gap-3 border-t border-slate-800 pt-5"
    >
      <p className="text-xs text-slate-500">
        共 {total} {label} · 第 {page} / {totalPages} 页
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          className={`${btn} border-slate-700 text-slate-300 hover:border-emerald-500 ${
            page <= 1 ? "pointer-events-none opacity-40" : ""
          }`}
        >
          上一页
        </Link>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-slate-600">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${btn} ${
                p === page
                  ? "border-emerald-500 bg-emerald-900/40 text-emerald-300"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {p}
            </Link>
          )
        )}

        <Link
          href={href(page + 1)}
          aria-disabled={page >= totalPages}
          className={`${btn} border-slate-700 text-slate-300 hover:border-emerald-500 ${
            page >= totalPages ? "pointer-events-none opacity-40" : ""
          }`}
        >
          下一页
        </Link>
      </div>
    </nav>
  );
}
