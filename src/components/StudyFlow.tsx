"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TechStack } from "@/types";
import type { LearnWord } from "@/lib/learn";
import { ensureScheduled, loadReview, reviewKey, saveReview } from "@/lib/srs";
import { loadUserWords, upsertReview, upsertUserWord } from "@/lib/userData";
import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/lib/favorites";
import { addMistake } from "@/lib/mistakes";
import { usePrefs } from "@/components/PrefsProvider";
import SpeakButton from "@/components/SpeakButton";
import FrequencyBadge from "@/components/FrequencyBadge";
import { ProgressBar } from "@/components/ui";

export default function StudyFlow({
  stack,
  words,
}: {
  stack: TechStack;
  words: LearnWord[];
}) {
  const { user } = useAuth();
  const { toggle: toggleFav, has: hasFav } = useFavorites();
  const { showEn } = usePrefs();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const total = words.length;
  const w = words[idx];

  // 登录后预填历史进度（跨设备）
  useEffect(() => {
    if (!user) return;
    loadUserWords(user.id).then((sets) => {
      const terms = new Set(words.map((x) => x.term));
      setKnown(sets.known.filter((t) => terms.has(t)));
      setUnknown(sets.unknown.filter((t) => terms.has(t)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /** 前进到下一张；已在最后一张时结束本轮。 */
  function goNext() {
    if (idx + 1 >= total) setDone(true);
    else {
      setIdx(idx + 1);
      setFlipped(false);
    }
  }

  /** 回退到上一张。 */
  function goPrev() {
    if (idx <= 0) return;
    setIdx(idx - 1);
    setFlipped(false);
  }

  // 键盘快捷键：← 上一个 · → 下一个 · 空格 翻面
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 输入态（搜索框等）不劫持按键
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (done) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === " ") {
        e.preventDefault();
        setFlipped(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, total, done]);

  function mark(knownFlag: boolean) {
    const term = w.term;
    if (knownFlag) {
      setKnown((k) => (k.includes(term) ? k : [...k, term]));
      if (user) upsertUserWord(user.id, term, "mastered");
    } else {
      setUnknown((u) => (u.includes(term) ? u : [...u, term]));
      // 错题埋点：「不认识」即一次错误（纯记录，不影响页面行为）
      addMistake(term, "srs", stack.slug);
      const ns = ensureScheduled(loadReview(), stack.slug, term);
      saveReview(ns);
      if (user) {
        const item = ns[reviewKey(stack.slug, term)];
        if (item) upsertReview(user.id, [item]);
        upsertUserWord(user.id, term, "unknown");
      }
    }
    goNext();
  }

  if (done) {
    return (
      <div className="card animate-fade-up p-8 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="mt-3 text-2xl font-bold">本轮完成</h2>
        <p className="mt-3 text-slate-300">
          认识 <span className="font-semibold text-emerald-400">{known.length}</span> 词 ·
          待复习 <span className="font-semibold text-amber-400">{unknown.length}</span> 词
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/review" className="btn btn-primary">
            去复习队列
          </Link>
          <Link href={`/stacks/${stack.slug}/words`} className="btn btn-ghost">
            全量词表
          </Link>
          <Link href={`/stacks/${stack.slug}`} className="btn btn-ghost">
            浏览全部
          </Link>
        </div>
      </div>
    );
  }

  const fav = w ? hasFav(stack.slug, w.term) : false;
  const sentences = w
    ? w.exampleSentences?.length
      ? w.exampleSentences
      : w.exampleSentence
      ? [w.exampleSentence]
      : []
    : [];

  const atFirst = idx <= 0;

  return (
    <div className="card p-6">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
        <span className="tabular-nums">
          第 {idx + 1} / {total} 词
        </span>
        <div className="flex items-center gap-2">
          {w?.frequency && <FrequencyBadge frequency={w.frequency} size="md" showDot />}
        </div>
      </div>
      <ProgressBar value={idx + 1} max={total} className="mb-4" />

      <div className="min-h-[200px] rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="font-mono text-3xl font-bold tracking-tight text-emerald-300">
            {w.term}
          </div>
          <div className="flex items-center gap-1">
            <SpeakButton text={w.term} />
            <button
              type="button"
              onClick={() => toggleFav(stack.slug, w.term)}
              title={fav ? "取消收藏" : "收藏"}
              className={`text-lg transition ${fav ? "text-amber-400" : "text-slate-500 hover:text-amber-300"}`}
            >
              {fav ? "★" : "☆"}
            </button>
          </div>
        </div>
        {w.phonetic && <div className="mt-1 text-slate-500">/{w.phonetic}/</div>}
        {w.pos && <div className="text-sm text-slate-400">{w.pos}</div>}

        {flipped && (
          <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
            <p className="text-slate-100">{w.defCn}</p>
            {showEn && w.defEn && (
              <p className="flex items-start gap-2 text-sm text-slate-400">
                <span>{w.defEn}</span>
                <SpeakButton text={w.defEn} className="mt-0.5 shrink-0" />
              </p>
            )}
            {sentences.length > 0 && (
              <ul className="space-y-1">
                {sentences.map((s, si) => (
                  <li key={si} className="flex items-start gap-2 text-sm italic text-slate-300">
                    <span>“{s}”</span>
                    <SpeakButton text={s} className="mt-0.5 shrink-0" />
                  </li>
                ))}
              </ul>
            )}
            {w.codeExample && (
              <pre className="mt-2 max-w-full overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">
                <code>{w.codeExample}</code>
              </pre>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={atFirst}
          className="btn btn-ghost disabled:opacity-40"
          title="上一个（←）"
        >
          ← 上一个
        </button>
        <button
          onClick={() => setFlipped(true)}
          disabled={flipped}
          className="btn btn-ghost disabled:opacity-40"
          title="翻面（空格）"
        >
          翻面看释义
        </button>
        <button onClick={() => mark(false)} className="btn btn-amber">
          不认识
        </button>
        <button onClick={() => mark(true)} className="btn btn-primary">
          认识
        </button>
        <button type="button" onClick={goNext} className="btn btn-ghost" title="下一个（→）">
          下一个 →
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-slate-600">
        快捷键：← 上一个 · → 下一个 · 空格 翻面
      </p>

      {known.length + unknown.length > 0 && (
        <p className="mt-2 text-center text-xs text-slate-500 tabular-nums">
          已判 {known.length + unknown.length} 词 · 认识 {known.length} · 待复习 {unknown.length}
        </p>
      )}
    </div>
  );
}
