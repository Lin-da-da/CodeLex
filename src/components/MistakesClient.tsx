"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  clearMistakes,
  getMistakes,
  getMastered,
  markMastered,
  SOURCE_LABEL,
  type Mistake,
  type MistakeSource,
} from "@/lib/mistakes";
import {
  Btn,
  Card,
  EmptyState,
  ProgressBar,
  SectionTitle,
  Stat,
  Tag,
} from "@/components/ui";

/** 展示顺序：先做题场景，再复习场景。 */
const SOURCE_ORDER: MistakeSource[] = ["quiz", "drill", "interview", "srs"];

/** 单次请求取回的术语上限，与 /api/words 一致。 */
const BATCH = 200;

interface DictItem {
  term: string;
  phonetic?: string | null;
  defCn: string;
  stackSlug?: string;
  stackName?: string;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function Bar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm text-slate-200">{label}</span>
        <span className="shrink-0 text-xs tabular-nums text-slate-500">
          {count} · {pct}%
        </span>
      </div>
      <ProgressBar value={pct} className="mt-1.5" />
    </div>
  );
}

export default function MistakesClient() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [mastered, setMastered] = useState<string[]>([]);
  const [dict, setDict] = useState<Record<string, DictItem>>({});
  const [q, setQ] = useState("");
  const [stackFilter, setStackFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<MistakeSource | "">("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  const [ready, setReady] = useState(false);

  // 已请求过的术语（小写），避免取不到的词被反复请求
  const fetched = useRef<Set<string>>(new Set());

  function refresh() {
    setMistakes(getMistakes());
    setMastered(getMastered());
  }

  useEffect(() => {
    refresh();
    setReady(true);
    // 跨标签页同步：另一个标签页答错题时这里也能刷新
    function onStorage(e: StorageEvent) {
      if (!e.key || e.key.startsWith("codelex:mistakes")) refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 中文释义 / 音标 / 技术栈归属在运行时一次性批量补齐（页面只存 term 列表）
  useEffect(() => {
    const missing: string[] = [];
    for (const m of mistakes) {
      const k = m.term.toLowerCase();
      if (!fetched.current.has(k)) {
        fetched.current.add(k);
        missing.push(m.term);
      }
    }
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const next: Record<string, DictItem> = {};
      for (let i = 0; i < missing.length; i += BATCH) {
        const chunk = missing.slice(i, i + BATCH);
        try {
          const res = await fetch(
            `/api/words?terms=${encodeURIComponent(chunk.join(","))}`,
            { cache: "no-store" }
          );
          if (!res.ok) continue;
          const data = (await res.json()) as {
            items?: { stackSlug: string; stackName: string; word: Partial<DictItem> }[];
          };
          for (const it of data.items ?? []) {
            const term = String(it.word?.term ?? "");
            if (!term) continue;
            next[term.toLowerCase()] = {
              term,
              phonetic: it.word?.phonetic ?? null,
              defCn: it.word?.defCn ?? "",
              stackSlug: it.stackSlug,
              stackName: it.stackName,
            };
          }
        } catch {
          /* 取不到就只显示 term，不报错 */
        }
      }
      if (!cancelled && Object.keys(next).length > 0) {
        setDict((d) => ({ ...d, ...next }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mistakes]);

  /** 技术栈 slug：优先用埋点记录的，其次用词库反查结果。 */
  function stackOf(m: Mistake): string {
    return m.stack || dict[m.term.toLowerCase()]?.stackSlug || "";
  }

  function stackLabel(slug: string): string {
    if (!slug) return "未分类";
    for (const d of Object.values(dict)) {
      if (d.stackSlug === slug && d.stackName) return d.stackName;
    }
    return slug;
  }

  const stats = useMemo(() => {
    const today = startOfToday();
    const stacks = new Set(mistakes.map(stackOf));
    return {
      total: mistakes.length,
      stacks: stacks.size,
      today: mistakes.filter((m) => m.lastAt >= today).length,
      mastered: mastered.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mistakes, mastered, dict]);

  const byStack = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of mistakes) {
      const s = stackOf(m);
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([slug, count]) => ({ slug, count, label: stackLabel(slug) }))
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mistakes, dict]);

  const bySource = useMemo(() => {
    const map = new Map<MistakeSource, number>();
    for (const m of mistakes) {
      map.set(m.source, (map.get(m.source) ?? 0) + m.count);
    }
    return SOURCE_ORDER.filter((s) => map.has(s)).map((s) => ({
      source: s,
      count: map.get(s) ?? 0,
      label: SOURCE_LABEL[s],
    }));
  }, [mistakes]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return mistakes.filter((m) => {
      if (stackFilter && stackOf(m) !== stackFilter) return false;
      if (sourceFilter && m.source !== sourceFilter) return false;
      if (!t) return true;
      const d = dict[m.term.toLowerCase()];
      return (
        m.term.toLowerCase().includes(t) || (d?.defCn ?? "").toLowerCase().includes(t)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mistakes, q, stackFilter, sourceFilter, dict]);

  const totalWrong = useMemo(
    () => mistakes.reduce((s, m) => s + m.count, 0),
    [mistakes]
  );

  function toggleReveal(term: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  }

  function master(term: string) {
    markMastered(term);
    refresh();
  }

  function doClear() {
    clearMistakes();
    setConfirmClear(false);
    setRevealed(new Set());
    refresh();
  }

  if (!ready) {
    return <Card className="p-8 text-center text-slate-400">加载中…</Card>;
  }

  if (mistakes.length === 0) {
    return (
      <EmptyState
        title="还没有错题记录"
        desc="去做测验、听说训练或复习，答错的词会自动汇总到这里，方便你回头逐个攻克。"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Btn href="/quiz">开始测验</Btn>
            <Btn href="/drills" variant="ghost">
              听说训练
            </Btn>
            <Btn href="/review" variant="ghost">
              复习队列
            </Btn>
          </div>
        }
      />
    );
  }

  return (
    <div className="animate-fade-up">
      {/* 概览 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="错题（去重后）" value={stats.total} sub={`累计答错 ${totalWrong} 次`} icon="🧯" accent="rose" />
        <Stat label="涉及技术栈" value={stats.stacks} sub="错词分布的技术栈数" icon="🧱" accent="amber" />
        <Stat label="今天新增" value={stats.today} sub="今天新答错的词" icon="🆕" accent="sky" />
        <Stat label="已掌握" value={stats.mastered} sub="标记为已攻克的词" icon="✅" accent="emerald" />
      </div>

      {/* 弱项分布 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle hint={`${byStack.length} 个技术栈`}>弱项分布 · 技术栈</SectionTitle>
          <div className="mt-3 space-y-3">
            {byStack.map((s) => (
              <Bar key={s.slug || "none"} label={s.label} count={s.count} total={stats.total} />
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle hint={`累计 ${totalWrong} 次`}>弱项分布 · 来源</SectionTitle>
          <div className="mt-3 space-y-3">
            {bySource.map((s) => (
              <Bar key={s.source} label={s.label} count={s.count} total={totalWrong} />
            ))}
          </div>
        </Card>
      </div>

      {/* 错题清单 */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <SectionTitle hint={`${filtered.length} / ${mistakes.length} 词`}>
            错题清单
          </SectionTitle>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-300">清空后无法恢复，确定？</span>
              <Btn variant="rose" className="px-3 py-1.5 text-xs" onClick={doClear}>
                确认清空
              </Btn>
              <Btn variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setConfirmClear(false)}>
                取消
              </Btn>
            </div>
          ) : (
            <Btn variant="rose" className="px-3 py-1.5 text-xs" onClick={() => setConfirmClear(true)}>
              清空错题
            </Btn>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索单词 / 中文释义…"
            className="input max-w-xs"
          />
          <Tag as="button" active={stackFilter === ""} onClick={() => setStackFilter("")}>
            全部栈
          </Tag>
          {byStack.map((s) => (
            <Tag
              key={s.slug || "none"}
              as="button"
              active={stackFilter === s.slug}
              onClick={() => setStackFilter(s.slug)}
            >
              {s.label} {s.count}
            </Tag>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-800" />
          <Tag as="button" active={sourceFilter === ""} onClick={() => setSourceFilter("")}>
            全部来源
          </Tag>
          {bySource.map((s) => (
            <Tag
              key={s.source}
              as="button"
              active={sourceFilter === s.source}
              onClick={() => setSourceFilter(s.source)}
            >
              {s.label} {s.count}
            </Tag>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="没有匹配的错题" desc="换个关键词或筛选项试试。" />
        ) : (
          <ul className="space-y-2">
            {filtered.map((m) => {
              const d = dict[m.term.toLowerCase()];
              const open = revealed.has(m.term);
              return (
                <li
                  key={m.term}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 transition hover:border-slate-600"
                >
                  <div className="flex items-center gap-3 p-4">
                    <Link
                      href={`/word/${encodeURIComponent(m.term)}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono font-semibold text-emerald-300">
                          {m.term}
                        </span>
                        {d?.phonetic && (
                          <span className="text-xs text-slate-500">/{d.phonetic}/</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="chip">{SOURCE_LABEL[m.source]}</span>
                        <span className="text-slate-500">{stackLabel(stackOf(m))}</span>
                        <span className="text-rose-300 tabular-nums">错 {m.count} 次</span>
                        <span className="text-slate-600">
                          {m.lastAt
                            ? new Date(m.lastAt).toLocaleDateString("zh-CN", {
                                month: "numeric",
                                day: "numeric",
                              })
                            : ""}
                        </span>
                      </div>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/drills${stackOf(m) ? `?stack=${encodeURIComponent(stackOf(m))}` : ""}`}
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                        title="跳到听说训练，针对该技术栈再练一遍"
                      >
                        再练 →
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleReveal(m.term)}
                        aria-expanded={open}
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                      >
                        {open ? "收起" : "看释义"}
                      </button>
                      <button
                        type="button"
                        onClick={() => master(m.term)}
                        title="标记为已掌握，从清单移除"
                        className="btn btn-ghost px-3 py-1.5 text-xs text-emerald-300"
                      >
                        已掌握 ✓
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-slate-800 px-4 py-3">
                      <p className="text-sm text-slate-100">
                        {d?.defCn || "（词库中暂无释义）"}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
