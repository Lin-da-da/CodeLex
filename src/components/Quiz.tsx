"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizWord } from "@/lib/quiz";
import { shuffle } from "@/lib/quiz";
import { insertQuizResult } from "@/lib/userData";
import { addQuizRecord } from "@/lib/quizHistory";
import { addMistake } from "@/lib/mistakes";
import { useAuth } from "@/components/AuthProvider";
import FrequencyBadge from "@/components/FrequencyBadge";

type QA = { word: QuizWord; options: string[]; answer: string };

export default function Quiz({ stacks, count = 10 }: { stacks: string[]; count?: number }) {
  const { user } = useAuth();
  const [pool, setPool] = useState<QuizWord[]>([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [qas, setQas] = useState<QA[]>([]);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  // 从服务端拉取轻量题池（避免下发全量词条）
  const loadPool = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/quiz?stacks=${encodeURIComponent(stacks.join(","))}&pool=80`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("题池加载失败");
      const data = await res.json();
      setPool(data.items ?? []);
      setPoolTotal(data.total ?? 0);
    } catch {
      setError("题池加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, [stacks]);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  function start() {
    const src = pool.length ? pool : [];
    if (src.length === 0) return;
    const picked = shuffle(src).slice(0, Math.min(count, src.length));
    const qs: QA[] = picked.map((word) => {
      const correct = word.defCn;
      const distractors = shuffle(
        src.filter((w) => w !== word && w.defCn !== correct)
      )
        .slice(0, 3)
        .map((w) => w.defCn);
      // 干扰项不足时用占位项补齐，保证每题 4 个选项
      const opts = [...distractors];
      while (opts.length < 3) opts.push("—");
      return { word, options: shuffle([correct, ...opts]), answer: correct };
    });
    setQas(qs);
    setStep(0);
    setSelected(null);
    setScore(0);
    setWrong([]);
    setFinished(false);
  }

  function choose(opt: string) {
    if (selected) return;
    setSelected(opt);
    if (opt === qas[step].answer) setScore((s) => s + 1);
    else {
      setWrong((w) =>
        w.includes(qas[step].word.term) ? w : [...w, qas[step].word.term]
      );
      // 错题埋点：只记录，不改变答题的任何可见行为。
      // 优先用该题所属栈 slug（即使跨多栈测验也能定位），退化为单栈时取该栈。
      addMistake(
        qas[step].word.term,
        "quiz",
        qas[step].word.stack ?? (stacks.length === 1 ? stacks[0] : undefined)
      );
    }
  }

  function next() {
    if (step + 1 >= qas.length) {
      setFinished(true);
      addQuizRecord({ at: Date.now(), stacks, score, total: qas.length, wrong });
      if (user) insertQuizResult(user.id, "stack", score, qas.length, wrong);
    } else {
      setStep(step + 1);
      setSelected(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
        正在抽取题池…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-6 text-sm text-rose-200">
        <p>{error}</p>
        <button
          onClick={() => void loadPool()}
          className="mt-4 rounded-lg border border-rose-700 px-4 py-2 text-xs hover:border-rose-500"
        >
          重新加载
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <h2 className="text-2xl font-bold">测验完成 🎉</h2>
        <p className="mt-3 text-slate-300">
          得分 <span className="text-emerald-400 font-semibold">{score}</span> / {qas.length}
        </p>
        {wrong.length > 0 && (
          <p className="mt-2 text-sm text-amber-300">
            答错 {wrong.length} 个：{wrong.slice(0, 8).join("、")}
            {wrong.length > 8 ? " …" : ""}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={start}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            再来一组
          </button>
          <button
            onClick={() => void loadPool()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
          >
            换一批题
          </button>
        </div>
      </div>
    );
  }

  if (qas.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-slate-400">题库中共 {poolTotal} 个词可用。</p>
        <button
          onClick={start}
          disabled={pool.length === 0}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-40"
        >
          开始测验（{count} 题）
        </button>
      </div>
    );
  }

  const qa = qas[step];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          第 {step + 1} / {qas.length} 题
        </span>
        <span>得分 {score}</span>
      </div>
      <div className="rounded-lg bg-slate-950 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-mono text-xl font-semibold">{qa.word.term}</div>
          {qa.word.frequency && (
            <FrequencyBadge frequency={qa.word.frequency} size="sm" />
          )}
        </div>
        {qa.word.phonetic && (
          <div className="text-slate-500">/{qa.word.phonetic}/</div>
        )}
        <p className="mt-3 text-slate-400">选择正确的中文释义：</p>
      </div>

      <div className="mt-4 space-y-2">
        {qa.options.map((opt, i) => {
          const isAnswer = opt === qa.answer;
          const isChosen = opt === selected;
          let cls = "border-slate-700 hover:border-slate-500";
          if (selected) {
            if (isAnswer) cls = "border-emerald-500 bg-emerald-900/40";
            else if (isChosen) cls = "border-rose-500 bg-rose-900/40";
            else cls = "border-slate-800 opacity-60";
          }
          return (
            <button
              key={i}
              onClick={() => choose(opt)}
              disabled={!!selected}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          onClick={next}
          className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          {step + 1 >= qas.length ? "查看结果" : "下一题"}
        </button>
      )}
    </div>
  );
}
