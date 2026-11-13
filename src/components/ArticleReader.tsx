"use client";

import { useEffect, useRef, useState } from "react";
import type { WordSeed } from "@/types";
import { ensureScheduled, loadReview, reviewKey, saveReview } from "@/lib/srs";
import { addReadArticle } from "@/lib/readingLog";
import { insertArticleMark, upsertReview } from "@/lib/userData";
import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/lib/favorites";
import { usePrefs } from "@/components/PrefsProvider";
import SpeakButton from "@/components/SpeakButton";
import FrequencyBadge from "@/components/FrequencyBadge";
import { speak } from "@/lib/tts";

function stripMarkdown(md: string): string {
  return md
    .replace(/[#*`>_]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ViewMode = "en" | "cn" | "both";

export default function ArticleReader({
  paragraphs,
  lang,
  words,
  stackSlug,
  articleSlug,
}: {
  /** 段落对：{ en, cn }，缺失译文一侧为空串 */
  paragraphs: { en: string; cn: string }[];
  /** 原文主体语言 */
  lang: "en" | "zh";
  words: WordSeed[];
  stackSlug: string;
  articleSlug: string;
}) {
  const { user } = useAuth();
  const { toggle: toggleFav, has: hasFav } = useFavorites();
  const { showEn } = usePrefs();
  const map = new Map<string, WordSeed>();
  words.forEach((w) => map.set(w.term.toLowerCase(), w));

  const [selected, setSelected] = useState<WordSeed | null>(null);
  const [marked, setMarked] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [mode, setMode] = useState<ViewMode>(lang === "zh" ? "cn" : "both");

  // 学情埋点：读到文章底部即记一次「已读」（纯记录，不影响页面任何可见行为）。
  // 关键修复：短文章一打开就「触底」会被误判为已读 → 改为：
  //  - 长文章：必须发生真实滚动并触底才记；
  //  - 短文章（一屏内读得完、无法滚动）：停留足够久（真正读完）才记，避免一打开就虚高 L2。
  const readLoggedRef = useRef(false);
  useEffect(() => {
    readLoggedRef.current = false;
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;

    function markRead() {
      if (readLoggedRef.current) return;
      readLoggedRef.current = true;
      addReadArticle(articleSlug);
    }

    function onScroll() {
      if (readLoggedRef.current) return;
      const doc = document.documentElement;
      if (doc.scrollTop + window.innerHeight >= doc.scrollHeight - 80) {
        markRead();
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    // 内容不足一屏、无法滚动时，用「停留 15 秒」作为真实读完的信号
    const doc = document.documentElement;
    const canScroll = doc.scrollHeight > window.innerHeight + 80;
    if (!canScroll) {
      dwellTimer = setTimeout(markRead, 15000);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (dwellTimer) clearTimeout(dwellTimer);
    };
  }, [articleSlug]);

  function renderPara(p: string) {
    return p.split(/(\s+)/).map((tok, i) => {
      const core = tok.replace(/[^A-Za-z]/g, "").toLowerCase();
      const word = core ? map.get(core) : undefined;
      if (word) {
        return (
          <button
            key={i}
            onClick={() => setSelected(word)}
            className="rounded px-0.5 text-emerald-300 underline decoration-dotted hover:bg-emerald-900/40"
          >
            {tok}
          </button>
        );
      }
      return <span key={i}>{tok}</span>;
    });
  }

  function markUnknown() {
    if (!selected) return;
    const ns = ensureScheduled(loadReview(), stackSlug, selected.term);
    saveReview(ns);
    setMarked((m) => (m.includes(selected.term) ? m : [...m, selected.term]));
    if (user) {
      const item = ns[reviewKey(stackSlug, selected.term)];
      if (item) upsertReview(user.id, [item]);
      insertArticleMark(user.id, articleSlug, selected.term, stackSlug);
    }
    setToast(`已标记「${selected.term}」并加入复习队列`);
    setTimeout(() => setToast(""), 2000);
  }

  const fav = selected ? hasFav(stackSlug, selected.term) : false;
  const sentences = selected
    ? selected.exampleSentences?.length
      ? selected.exampleSentences
      : selected.exampleSentence
      ? [selected.exampleSentence]
      : []
    : [];

  const hasTranslation = paragraphs.some((p) => p.en && p.cn);

  const MODE_BTN =
    "rounded-lg border px-3 py-1.5 text-xs transition disabled:opacity-40";
  const modeBtn = (m: ViewMode, label: string) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      disabled={!hasTranslation && m !== lang}
      className={`${MODE_BTN} ${
        mode === m
          ? "border-emerald-500 bg-emerald-900/40 text-emerald-300"
          : "border-slate-700 text-slate-400 hover:border-slate-500"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => speak(stripMarkdown(paragraphs.map((p) => p.en).join(" ")))}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-emerald-500 hover:text-emerald-300"
        >
          🔊 朗读英文全文
        </button>

        {hasTranslation && (
          <div className="flex items-center gap-1.5">
            {modeBtn("en", "仅英文")}
            {modeBtn("cn", "仅中文")}
            {modeBtn("both", "中英对照")}
          </div>
        )}

        <span className="text-xs text-slate-500">点击绿色下划线单词可查词并加入复习</span>
      </div>

      {/* 正文 */}
      <article className="max-w-2xl text-[15px] leading-8 text-slate-200">
        {mode === "both" ? (
          <div className="space-y-6">
            {paragraphs.map((p, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-800 bg-slate-900/30 p-4"
              >
                <p className="mb-3">{renderPara(p.en)}</p>
                {p.cn && (
                  <p className="border-t border-slate-800 pt-3 text-slate-400">
                    {renderPara(p.cn)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          paragraphs.map((p, i) => (
            <p key={i} className="mb-4">
              {renderPara(mode === "en" ? p.en : p.cn || p.en)}
            </p>
          ))
        )}
      </article>

      <p className="mt-6 text-sm text-slate-500">
        提示：点击正文中<span className="text-emerald-300">绿色下划线</span>的单词可查词；共标记{" "}
        {marked.length} 个生词。
      </p>

      {selected && (
        <div className="card fixed bottom-6 left-1/2 w-[min(92vw,520px)] -translate-x-1/2 p-5 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div>
                <div className="font-mono text-lg font-semibold">{selected.term}</div>
                {selected.phonetic && (
                  <div className="text-slate-500">/{selected.phonetic}/</div>
                )}
              </div>
              <SpeakButton text={selected.term} />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleFav(stackSlug, selected.term)}
                title={fav ? "取消收藏" : "收藏"}
                className={`text-xl ${fav ? "text-amber-400" : "text-slate-500 hover:text-amber-300"}`}
              >
                {fav ? "★" : "☆"}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {selected.pos && <span className="text-xs text-slate-500">{selected.pos}</span>}
            <FrequencyBadge frequency={selected.frequency} size="md" showDot />
          </div>

          <p className="mt-2 text-slate-100">{selected.defCn}</p>
          {showEn && selected.defEn && (
            <p className="mt-1 flex items-start gap-2 text-sm text-slate-400">
              <span>{selected.defEn}</span>
              <SpeakButton text={selected.defEn} className="mt-0.5 shrink-0" />
            </p>
          )}
          {sentences.length > 0 && (
            <ul className="mt-2 space-y-1">
              {sentences.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm italic text-slate-300">
                  <span>“{s}”</span>
                  <SpeakButton text={s} className="mt-0.5 shrink-0" />
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={markUnknown}
            className="btn btn-amber mt-4 w-full"
          >
            标记为生词并加入复习
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 top-6 z-20 -translate-x-1/2 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
