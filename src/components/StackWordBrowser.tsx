"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePrefs } from "@/components/PrefsProvider";
import SpeakButton from "@/components/SpeakButton";
import { EmptyState } from "@/components/ui";

/** 快速浏览用的轻量词条：只带上屏必需的最小字段。 */
export interface WordBrowseItem {
  term: string;
  phonetic?: string | null;
  defCn: string;
  defEn?: string | null;
}

const PAGE = 200;

/**
 * 全量词表快速浏览：
 * - 默认只展示「单词 + 音标」，中文释义隐藏，点击展开；
 * - 支持搜索过滤、「全部展开 / 收起」、分批加载（避免上千节点一次性渲染）；
 * - 可一键导出当前结果为 Markdown 速查表（面试前突击）。
 */
export default function StackWordBrowser({
  stackName,
  words,
}: {
  stackName: string;
  words: WordBrowseItem[];
}) {
  const { showEn } = usePrefs();
  const [q, setQ] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return words;
    return words.filter(
      (w) =>
        w.term.toLowerCase().includes(t) ||
        (w.defCn || "").toLowerCase().includes(t) ||
        (w.defEn || "").toLowerCase().includes(t)
    );
  }, [q, words]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  function toggle(term: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  }

  function revealAll() {
    setRevealed(new Set(filtered.map((w) => w.term)));
  }

  function hideAll() {
    setRevealed(new Set());
  }

  function exportCheatSheet() {
    const lines = [
      `# ${stackName} · 英文速查表`,
      "",
      `共 ${filtered.length} 词 · 由 CodeLex 生成`,
      "",
      "| 单词 | 音标 | 中文 |",
      "| --- | --- | --- |",
    ];
    for (const w of filtered) {
      lines.push(
        `| ${w.term} | ${w.phonetic ? `/${w.phonetic}/` : ""} | ${w.defCn.replace(/\|/g, "\\|")} |`
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stackName}-cheatsheet.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allRevealed = filtered.length > 0 && revealed.size >= filtered.length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="过滤单词 / 释义…"
          className="input max-w-sm"
        />
        <span className="text-xs text-slate-500 tabular-nums">
          {filtered.length} / {words.length} 词
        </span>
        <button
          type="button"
          onClick={allRevealed ? hideAll : revealAll}
          className="btn btn-ghost px-3 py-1.5 text-xs"
        >
          {allRevealed ? "全部收起" : "全部展开"}
        </button>
        <button
          type="button"
          onClick={exportCheatSheet}
          className="btn btn-ghost px-3 py-1.5 text-xs"
        >
          ⬇ 导出速查表
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="没有匹配的单词" desc="换个关键词试试。" />
        </div>
      ) : (
        <>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((w) => {
              const open = revealed.has(w.term);
              return (
                <li key={w.term}>
                  <button
                    type="button"
                    onClick={() => toggle(w.term)}
                    aria-expanded={open}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                      open
                        ? "border-emerald-600/60 bg-emerald-500/5"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono font-semibold text-emerald-300">
                        {w.term}
                      </span>
                      {w.phonetic && (
                        <span className="shrink-0 text-xs text-slate-500">
                          /{w.phonetic}/
                        </span>
                      )}
                    </div>
                  </button>

                  {open && (
                    <div className="-mt-1 rounded-b-xl border border-t-0 border-emerald-600/40 bg-emerald-500/5 px-3.5 pb-2.5 pt-2">
                      <p className="text-sm text-slate-100">{w.defCn}</p>
                      {showEn && w.defEn && (
                        <p className="mt-1 text-xs text-slate-400">{w.defEn}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-3">
                        <SpeakButton text={w.term} />
                        <Link
                          href={`/word/${encodeURIComponent(w.term)}`}
                          className="text-xs text-emerald-400 hover:underline"
                        >
                          详情 →
                        </Link>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {visible.length < filtered.length && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="btn btn-ghost"
              >
                加载更多（剩余 {filtered.length - visible.length} 词）
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
