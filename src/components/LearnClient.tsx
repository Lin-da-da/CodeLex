"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TechStack } from "@/types";
import type { LearnWord } from "@/lib/learn";
import StudyFlow from "@/components/StudyFlow";
import { PageHeader } from "@/components/ui";

/** 基于种子的确定性洗牌：同一 seed 得到同一顺序，便于「重新洗牌」时整体变更。 */
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LearnClient({
  stack,
  words,
}: {
  stack: TechStack;
  words: LearnWord[];
}) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"sequential" | "random">("sequential");
  const [shuffleSeed, setShuffleSeed] = useState(1);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return words;
    return words.filter(
      (w) =>
        w.term.toLowerCase().includes(t) ||
        (w.defCn || "").includes(q.trim()) ||
        (w.defEn || "").toLowerCase().includes(t)
    );
  }, [q, words]);

  const deck = useMemo(() => {
    if (mode === "random") return shuffle(filtered, shuffleSeed);
    return filtered;
  }, [filtered, mode, shuffleSeed]);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <PageHeader
        back="/"
        icon={stack.icon}
        title={`背词 · ${stack.name}`}
        subtitle={`${filtered.length} 词 · 翻卡学习，标记认识 / 不认识`}
        actions={
          <Link
            href={`/stacks/${stack.slug}/words`}
            className="btn btn-ghost px-3 py-1.5 text-xs"
          >
            全量词表
          </Link>
        }
      />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索本技术栈单词 / 释义…"
        className="input"
      />
      <p className="mt-1 text-xs text-slate-500">匹配 {filtered.length} 词</p>

      {/* 背诵模式：顺序 / 随机 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">背诵模式</span>
        <button
          type="button"
          onClick={() => setMode("sequential")}
          className={mode === "sequential" ? "chip chip-active" : "chip"}
        >
          顺序背诵
        </button>
        <button
          type="button"
          onClick={() => setMode("random")}
          className={mode === "random" ? "chip chip-active" : "chip"}
        >
          随机背诵
        </button>
        {mode === "random" && (
          <button
            type="button"
            onClick={() => setShuffleSeed((s) => s + 1)}
            className="btn btn-ghost px-3 py-1.5 text-xs"
          >
            🔀 重新洗牌
          </button>
        )}
      </div>

      <div className="mt-6">
        {deck.length ? (
          <StudyFlow
            key={`${mode}-${shuffleSeed}`}
            stack={stack}
            words={deck}
          />
        ) : (
          <p className="card p-6 text-slate-400">没有匹配的单词。</p>
        )}
      </div>
    </main>
  );
}
