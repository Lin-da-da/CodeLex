"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TechStack, WordSeed } from "@/types";
import { applyGrade, dueKeys, ensureScheduled, reviewKey, type Grade } from "@/lib/srs";
import { logReview } from "@/lib/reviewLog";
import { useReviewState } from "@/lib/useReviewState";
import { useFavorites } from "@/lib/favorites";
import { usePrefs } from "@/components/PrefsProvider";
import SpeakButton from "@/components/SpeakButton";
import FrequencyBadge from "@/components/FrequencyBadge";

type StackLite = { slug: string; name: string; icon: string };

/** 从 /api/words 拉取词条详情（按需，不随首屏下发全量词库）。 */
async function fetchWords(terms: string[]): Promise<Map<string, WordSeed>> {
  const map = new Map<string, WordSeed>();
  if (terms.length === 0) return map;
  const res = await fetch(
    `/api/words?terms=${encodeURIComponent(terms.join(","))}`,
    { cache: "no-store" }
  );
  if (!res.ok) return map;
  const data = await res.json();
  for (const it of data.items ?? []) {
    map.set(String(it.word.term), it.word as WordSeed);
  }
  return map;
}

export default function ReviewQueue({ stacks }: { stacks: StackLite[] }) {
  const { state, ready, commit } = useReviewState();
  const due = useMemo(() => (ready ? dueKeys(state) : []), [state, ready]);
  const [current, setCurrent] = useState<string | null>(null);
  const [gradedCount, setGradedCount] = useState(0);
  const [detail, setDetail] = useState<{ word: WordSeed; stackSlug: string } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const { toggle: toggleFav, has: hasFav } = useFavorites();
  const { showEn } = usePrefs();

  useEffect(() => {
    if (due.length && !current) setCurrent(due[0]);
    if (current && !state[current]) setCurrent(due[0] ?? null);
  }, [due, current, state]);

  // 当前待复习词的详情按需拉取
  const currentTerm = useMemo(() => {
    if (!current) return null;
    const i = current.indexOf("::");
    return i >= 0 ? current.slice(i + 2) : current;
  }, [current]);

  useEffect(() => {
    if (!current || !currentTerm) {
      setDetail(null);
      return;
    }
    let alive = true;
    setLoadingDetail(true);
    fetchWords([currentTerm]).then((m) => {
      if (!alive) return;
      const w = m.get(currentTerm);
      setDetail(w ? { word: w, stackSlug: current.split("::")[0] } : null);
      setLoadingDetail(false);
    });
    return () => {
      alive = false;
    };
  }, [current, currentTerm]);

  /** 拉取某栈的全部 term（仅字符串，体积极小），批量排期。 */
  async function scheduleStack(st: StackLite) {
    const res = await fetch(`/api/stacks/${st.slug}/terms`, { cache: "no-store" });
    if (!res.ok) return 0;
    const data = await res.json();
    const terms: string[] = data.terms ?? [];
    if (terms.length === 0) return 0;
    let s = state;
    const changed: string[] = [];
    for (const t of terms) {
      const k = reviewKey(st.slug, t);
      if (!s[k]) {
        s = ensureScheduled(s, st.slug, t);
        changed.push(k);
      }
    }
    commit(s, changed);
    return changed.length;
  }

  async function scheduleAll() {
    if (!ready) return;
    setScheduling(true);
    try {
      for (const st of stacks) {
        await scheduleStack(st);
      }
    } finally {
      setScheduling(false);
    }
  }
  const grade = useCallback(
    (g: Grade) => {
      if (!current || !detail) return;
      const ns = applyGrade(state, current, g, detail.stackSlug, detail.word.term);
      commit(ns, [current]);
      logReview(1);
      setGradedCount((c) => c + 1);
      // 评分后立即切到下一张：applyGrade 会把当前 key 排到未来（interval≥1 天），
      // 因而不再出现在 dueKeys 中，但 key 仍留在 state 里，旧effect 的
      // `!state[current]` 判空不会触发，导致停留在已评分的旧卡上。这里主动推进。
      const rest = dueKeys(ns).filter((k) => k !== current);
      setCurrent(rest[0] ?? null);
    },
    [current, detail, state, commit]
  );

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
        加载中…
      </div>
    );
  }

  if (current) {
    const w = detail?.word;
    const fav = w ? hasFav(detail!.stackSlug, w.term) : false;
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
          <span>待复习 {due.length} 张 · 已评分 {gradedCount}</span>
          <span className="text-slate-400">{detail?.stackSlug ?? ""}</span>
        </div>
        <div className="rounded-lg bg-slate-950 p-5">
          {loadingDetail || !w ? (
            <div className="py-6 text-center text-sm text-slate-500">加载词条…</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="font-mono text-2xl font-semibold">{w.term}</div>
                <div className="flex items-center gap-1">
                  <SpeakButton text={w.term} />
                  <button
                    type="button"
                    onClick={() => toggleFav(detail!.stackSlug, w.term)}
                    title={fav ? "取消收藏" : "收藏"}
                    className={`text-lg ${fav ? "text-amber-400" : "text-slate-500 hover:text-amber-300"}`}
                  >
                    {fav ? "★" : "☆"}
                  </button>
                </div>
              </div>
              {w.phonetic && <div className="text-slate-500">/{w.phonetic}/</div>}

              <div className="mt-2 flex items-center gap-2">
                {w.pos && <span className="text-xs text-slate-500">{w.pos}</span>}
                <FrequencyBadge frequency={w.frequency} size="md" showDot />
              </div>

              <p className="mt-3 text-slate-100">{w.defCn}</p>
              {showEn && w.defEn && (
                <p className="mt-1 text-sm text-slate-400">{w.defEn}</p>
              )}
              {(w.exampleSentences?.length ?? 0) > 0 && (
                <ul className="mt-2 space-y-1">
                  {w.exampleSentences!.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm italic text-slate-300">
                      <span>“{s}”</span>
                      <SpeakButton text={s} className="mt-0.5 shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {(["again", "hard", "good", "easy"] as Grade[]).map((g) => (
            <button
              key={g}
              onClick={() => grade(g)}
              disabled={!w}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-40"
            >
              {g === "again" ? "遗忘" : g === "hard" ? "困难" : g === "good" ? "良好" : "简单"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
      <h2 className="text-xl font-bold">
        {due.length === 0 ? "🎉 今日复习完成" : "复习队列为空"}
      </h2>
      <p className="mt-2 text-slate-400">
        已评分 {gradedCount} 张。可将某技术栈全部词加入队列后开始。
      </p>
      <button
        onClick={scheduleAll}
        disabled={scheduling}
        className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        {scheduling ? "正在加入…" : "将所有词加入复习队列"}
      </button>
    </div>
  );
}
