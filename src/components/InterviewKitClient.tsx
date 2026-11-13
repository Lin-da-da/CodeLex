"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BqItem, Followup, OralScript, Phrase } from "@/lib/interviewKitMeta";
import { BQ_CATS, FOLLOWUP_STACKS, PHRASE_CATS } from "@/lib/interviewKitMeta";
import SpeakButton from "@/components/SpeakButton";
import { getKitMastered, markKitMastered, unmarkKitMastered } from "@/lib/kitProgress";
import { Card, EmptyState, Tag } from "@/components/ui";

type Tab = "phrases" | "oral" | "bq" | "followups";

const TABS: { slug: Tab; name: string; icon: string; hint: string }[] = [
  { slug: "phrases", name: "句型模板", icon: "💬", hint: "可直接套用的口语句型" },
  { slug: "oral", name: "60 秒口述", icon: "🎤", hint: "被问「解释一下 X」该怎么说" },
  { slug: "bq", name: "行为面试 BQ", icon: "🧠", hint: "STAR 结构参考答案" },
  { slug: "followups", name: "追问链", icon: "⛓️", hint: "面试官会顺着往下挖 3 层，提前练熟" },
];

/** 每个 tab 的每页条数：卡片越高大每页越少，避免一次性把全部条目渲染进 DOM。 */
const PER_PAGE: Record<Tab, number> = { phrases: 12, oral: 8, bq: 10, followups: 6 };

/** 追问链三级递进的阶段标签。 */
const LEVEL_LABEL = ["概念原理", "权衡边界", "实战排障"];

/** 倒计时：用于口语作答计时。 */
function useCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  return {
    remaining,
    start: (sec: number) => setRemaining(sec),
    stop: () => setRemaining(null),
  };
}

function Timer({
  remaining,
  seconds,
  onStart,
  onStop,
}: {
  remaining: number | null;
  seconds: number;
  onStart: () => void;
  onStop: () => void;
}) {
  const active = remaining !== null;
  const done = active && remaining <= 0;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={active ? onStop : onStart}
        className={`btn px-3 py-1.5 text-xs ${active ? "btn-ghost" : "btn-primary"}`}
      >
        {active ? "停止" : `⏱ 计时 ${seconds}s`}
      </button>
      {active && (
        <span
          className={`tabular-nums text-sm font-semibold ${
            done ? "text-rose-400" : remaining <= 10 ? "text-amber-400" : "text-emerald-400"
          }`}
        >
          {done ? "时间到！" : `${remaining}s`}
        </span>
      )}
    </div>
  );
}

/** 客户端分页控件：基于本地 state 翻页（适配带搜索/筛选的列表，非 URL 分页）。 */
function Pager({
  page,
  pageCount,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (pageCount <= 1) {
    return total > 0 ? (
      <p className="mt-6 text-center text-xs text-slate-500">共 {total} 条</p>
    ) : null;
  }
  const btn =
    "rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-40 disabled:pointer-events-none";

  const pages: (number | "…")[] = [];
  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < pageCount - 2) pages.push("…");
    pages.push(pageCount);
  }

  return (
    <nav
      aria-label="分页"
      className="mt-8 flex flex-col items-center gap-3 border-t border-slate-800 pt-5"
    >
      <p className="text-xs text-slate-500">
        共 {total} 条 · 第 {page} / {pageCount} 页
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={`${btn} border-slate-700 text-slate-300 hover:border-emerald-500`}
        >
          上一页
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-slate-600">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${btn} ${
                p === page
                  ? "border-emerald-500 bg-emerald-900/40 text-emerald-300"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          className={`${btn} border-slate-700 text-slate-300 hover:border-emerald-500`}
        >
          下一页
        </button>
      </div>
    </nav>
  );
}

export default function InterviewKitClient({
  phrases,
  oral,
  bq,
  followups,
}: {
  phrases: Phrase[];
  oral: OralScript[];
  bq: BqItem[];
  followups: Followup[];
}) {
  const [tab, setTab] = useState<Tab>("phrases");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [showCn, setShowCn] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [hideMastered, setHideMastered] = useState(false);
  const [page, setPage] = useState(1);
  const { remaining, start, stop } = useCountdown();
  const timerFor = useRef<string | null>(null);

  // 已掌握进度（口述脚本 / 追问链）从本机存储读取，挂载后填充避免 SSR 水合不一致
  useEffect(() => {
    setMastered(new Set(Object.keys(getKitMastered())));
  }, []);

  function toggleMastered(id: string) {
    if (mastered.has(id)) {
      unmarkKitMastered(id);
      setMastered((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    } else {
      markKitMastered(id);
      setMastered((prev) => new Set(prev).add(id));
    }
  }

  const cats: { slug: string; name: string; icon: string }[] =
    tab === "phrases"
      ? [...PHRASE_CATS]
      : tab === "bq"
      ? [...BQ_CATS]
      : tab === "followups"
      ? [...FOLLOWUP_STACKS]
      : [];

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const source: { id: string; hay: string }[] =
      tab === "phrases"
        ? phrases.map((p) => ({ id: p.id, hay: `${p.en} ${p.cn} ${p.note || ""}` }))
        : tab === "oral"
        ? oral.map((o) => ({ id: o.concept, hay: `${o.concept} ${o.en} ${o.cn} ${o.keywords.join(" ")}` }))
        : tab === "bq"
        ? bq.map((b) => ({ id: b.id, hay: `${b.qEn} ${b.qCn} ${b.aEn} ${b.aCn}` }))
        : followups.map((f) => ({
            id: f.id,
            hay: `${f.topic} ${f.stack} ${f.chain.map((c) => `${c.en} ${c.cn}`).join(" ")} ${
              f.hintEn || ""
            } ${f.hintCn || ""}`,
          }));
    const filteredIds = new Set(
      source.filter((s) => (!t || s.hay.toLowerCase().includes(t))).map((s) => s.id)
    );
    if (tab === "phrases") return phrases.filter((p) => filteredIds.has(p.id) && (!cat || p.cat === cat));
    if (tab === "oral")
      return oral.filter(
        (o) => filteredIds.has(o.concept) && (!hideMastered || !mastered.has(o.concept))
      );
    if (tab === "bq") return bq.filter((b) => filteredIds.has(b.id) && (!cat || b.cat === cat));
    return followups.filter(
      (f) => filteredIds.has(f.id) && (!cat || f.stack === cat) && (!hideMastered || !mastered.has(f.id))
    );
  }, [tab, q, cat, phrases, oral, bq, followups]);

  // 分页：按当前 tab 的每页条数切片，只渲染当前页，避免一次性渲染全部条目。
  const perPage = PER_PAGE[tab];
  const pageCount = Math.max(1, Math.ceil(list.length / perPage));
  const safePage = Math.min(page, pageCount);
  const paged = list.slice((safePage - 1) * perPage, safePage * perPage);

  // 切换 tab / 搜索 / 分类 / 隐藏已掌握时，回到第一页
  useEffect(() => {
    setPage(1);
  }, [tab, q, cat, hideMastered]);

  function toggle(id: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function startTimer(id: string, sec: number) {
    timerFor.current = id;
    start(sec);
  }

  const activeTimer = remaining !== null ? timerFor.current : null;

  return (
    <div>
      {/* Tab */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => {
              setTab(t.slug);
              setCat("");
              setOpen(new Set());
              stop();
            }}
            className={tab === t.slug ? "chip chip-active" : "chip"}
          >
            <span>{t.icon}</span>
            {t.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">{TABS.find((t) => t.slug === tab)?.hint}</p>

      {/* 工具栏 */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === "followups" ? "搜索主题 / 英文 / 中文…" : "搜索关键词…"}
          className="input max-w-xs"
        />
        <span className="text-xs text-slate-500 tabular-nums">{list.length} 条</span>
        {(tab === "oral" || tab === "followups") && (
          <span className="text-xs text-emerald-400/90 tabular-nums">
            已掌握{" "}
            {tab === "oral"
              ? oral.filter((o) => mastered.has(o.concept)).length
              : followups.filter((f) => mastered.has(f.id)).length}{" "}
            / {(tab === "oral" ? oral : followups).length}
          </span>
        )}
        {(tab === "oral" || tab === "followups") && (
          <button
            type="button"
            onClick={() => setHideMastered((v) => !v)}
            className="btn btn-ghost px-3 py-1.5 text-xs"
          >
            {hideMastered ? "显示已掌握" : "隐藏已掌握"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowCn((v) => !v)}
          className="btn btn-ghost px-3 py-1.5 text-xs"
        >
          {showCn ? "隐藏中文" : "显示中文"}
        </button>
      </div>

      {/* 分类筛选 */}
      {cats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Tag as="button" active={!cat} onClick={() => setCat("")}>
            全部
          </Tag>
          {cats.map((c) => (
            <Tag key={c.slug} as="button" active={cat === c.slug} onClick={() => setCat(c.slug)}>
              {c.icon} {c.name}
            </Tag>
          ))}
        </div>
      )}

      {/* 内容 */}
      <div className="mt-5 space-y-3">
        {list.length === 0 ? (
          <EmptyState
            title="没有匹配的条目"
            desc={tab === "followups" ? "换个关键词或技术栈试试。" : "换个关键词试试。"}
          />
        ) : tab === "phrases" ? (
          (paged as Phrase[]).map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] leading-7 text-slate-100">{p.en}</p>
                <SpeakButton text={p.en} className="mt-1 shrink-0" />
              </div>
              {showCn && <p className="mt-1.5 text-sm text-slate-400">{p.cn}</p>}
              {p.note && (
                <p className="mt-2 text-xs text-emerald-400/80">💡 {p.note}</p>
              )}
            </Card>
          ))
        ) : tab === "oral" ? (
          (paged as OralScript[]).map((o) => {
            const id = o.concept;
            const isOpen = open.has(id);
            const done = mastered.has(id);
            return (
              <Card key={id} className={`p-4 ${done ? "border-emerald-800/60" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-emerald-300">{o.concept}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {o.stack}
                    </span>
                    <span className="text-xs text-slate-500">约 {o.seconds}s</span>
                    {done && <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300">✓ 已掌握</span>}
                  </div>
                  <Timer
                    remaining={activeTimer === id ? remaining : null}
                    seconds={o.seconds}
                    onStart={() => startTimer(id, o.seconds)}
                    onStop={stop}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {o.keywords.map((k) => (
                    <span key={k} className="rounded bg-slate-800/70 px-2 py-0.5 text-xs text-slate-300">
                      {k}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    {isOpen ? "收起脚本" : "查看口述脚本"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMastered(id)}
                    className={`text-xs ${done ? "text-slate-400 hover:text-slate-200" : "text-emerald-400 hover:underline"}`}
                  >
                    {done ? "撤销已掌握" : "标记已掌握 ✓"}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-2 border-t border-slate-800 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] leading-7 text-slate-100">{o.en}</p>
                      <SpeakButton text={o.en} className="mt-1 shrink-0" />
                    </div>
                    {showCn && <p className="mt-2 text-sm text-slate-400">{o.cn}</p>}
                  </div>
                )}
              </Card>
            );
          })
        ) : tab === "bq" ? (
          (paged as BqItem[]).map((b) => {
            const isOpen = open.has(b.id);
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{b.qEn}</p>
                    {showCn && <p className="mt-1 text-sm text-slate-400">{b.qCn}</p>}
                  </div>
                  <SpeakButton text={b.qEn} className="mt-1 shrink-0" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Timer
                    remaining={activeTimer === b.id ? remaining : null}
                    seconds={60}
                    onStart={() => startTimer(b.id, 60)}
                    onStop={stop}
                  />
                  <button
                    type="button"
                    onClick={() => toggle(b.id)}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    {isOpen ? "收起参考答案" : "查看参考答案"}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] leading-7 text-slate-100">{b.aEn}</p>
                      <SpeakButton text={b.aEn} className="mt-1 shrink-0" />
                    </div>
                    {showCn && <p className="mt-2 text-sm text-slate-400">{b.aCn}</p>}
                    {b.tips && (
                      <p className="mt-2 text-xs text-emerald-400/80">💡 {b.tips}</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          (paged as Followup[]).map((f) => {
            const isOpen = open.has(f.id);
            const done = mastered.has(f.id);
            const stack = FOLLOWUP_STACKS.find((s) => s.slug === f.stack);
            return (
              <Card key={f.id} className={`p-4 ${done ? "border-emerald-800/60" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-emerald-300">{f.topic}</span>
                    {stack && (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        {stack.icon} {stack.name}
                      </span>
                    )}
                    {done && <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300">✓ 已掌握</span>}
                  </div>
                  <span className="text-xs text-slate-500">3 层追问</span>
                </div>

                {/* 三级递进：越往下越深 */}
                <div className="mt-3 space-y-2.5">
                  {f.chain.map((c) => (
                    <div
                      key={c.level}
                      className="flex items-start gap-2"
                      style={{ marginLeft: (c.level - 1) * 20 }}
                    >
                      <span
                        className={`mt-1 shrink-0 text-xs tabular-nums ${
                          c.level === 1
                            ? "text-slate-400"
                            : c.level === 2
                            ? "text-sky-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {c.level === 1 ? "1" : `↳${c.level}`}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[15px] leading-7 text-slate-100">{c.en}</p>
                          <SpeakButton text={c.en} className="mt-1 shrink-0" />
                        </div>
                        {showCn && <p className="mt-1 text-sm text-slate-400">{c.cn}</p>}
                        <span className="mt-1 inline-block text-xs text-slate-500">
                          {LEVEL_LABEL[c.level - 1]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(f.id)}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    {isOpen ? "收起答题要点" : "查看答题要点"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMastered(f.id)}
                    className={`text-xs ${done ? "text-slate-400 hover:text-slate-200" : "text-emerald-400 hover:underline"}`}
                  >
                    {done ? "撤销已掌握" : "标记已掌握 ✓"}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-2 border-t border-slate-800 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm leading-7 text-slate-200">{f.hintEn}</p>
                      {f.hintEn && <SpeakButton text={f.hintEn} className="mt-1 shrink-0" />}
                    </div>
                    {showCn && f.hintCn && (
                      <p className="mt-2 text-sm text-slate-400">{f.hintCn}</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
      <Pager page={safePage} pageCount={pageCount} total={list.length} onChange={setPage} />
    </div>
  );
}
