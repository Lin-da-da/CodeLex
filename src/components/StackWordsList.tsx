"use client";

import type { WordSeed } from "@/types";
import SpeakButton from "@/components/SpeakButton";
import FrequencyBadge from "@/components/FrequencyBadge";
import { useFavorites } from "@/lib/favorites";

/**
 * 词条列表（纯展示）。筛选与分页由服务端完成（见 app/stacks/[slug]/page.tsx），
 * 客户端只渲染当前页的少量词条，避免大数据量下的渲染卡顿。
 */
export default function StackWordsList({
  stackSlug,
  words,
}: {
  stackSlug: string;
  words: WordSeed[];
}) {
  const { toggle, has } = useFavorites();

  return (
    <ul className="mt-4 space-y-4">
      {words.map((w, i) => {
        const fav = has(stackSlug, w.term);
        const sentences = w.exampleSentences?.length
          ? w.exampleSentences
          : w.exampleSentence
          ? [w.exampleSentence]
          : [];
        return (
          <li
            key={`${w.term}-${i}`}
            className="card p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-semibold">{w.term}</span>
                {w.pos && <span className="text-xs text-slate-500">{w.pos}</span>}
                <SpeakButton text={w.term} />
              </div>
              <div className="flex items-center gap-3">
                <FrequencyBadge frequency={w.frequency} size="md" showDot />
                <button
                  type="button"
                  onClick={() => toggle(stackSlug, w.term)}
                  title={fav ? "取消收藏" : "收藏"}
                  className={`text-sm ${fav ? "text-amber-400" : "text-slate-500 hover:text-amber-300"}`}
                >
                  {fav ? "★ 已收藏" : "☆ 收藏"}
                </button>
              </div>
            </div>
            {w.phonetic && <p className="text-sm text-slate-500">/{w.phonetic}/</p>}
            <p className="mt-1 text-slate-200">{w.defCn}</p>
            {w.defEn && <p className="text-sm text-slate-400">{w.defEn}</p>}
            {sentences.length > 0 && (
              <ul className="mt-2 space-y-1">
                {sentences.map((s, si) => (
                  <li key={si} className="flex items-start gap-2 text-sm italic text-slate-300">
                    <span>“{s}”</span>
                    <SpeakButton text={s} className="mt-0.5 shrink-0" />
                  </li>
                ))}
              </ul>
            )}
            {w.codeExample && (
              <pre className="mt-2 max-w-full overflow-x-auto rounded bg-slate-950 p-3 text-xs text-emerald-300">
                <code>{w.codeExample}</code>
              </pre>
            )}
            {w.tags && w.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {w.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
