"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { speak } from "@/lib/tts";
import { addPractice } from "@/lib/practiceLog";
import { addMistake } from "@/lib/mistakes";
import { Btn, Card, EmptyState } from "@/components/ui";

interface Item {
  term: string;
  phonetic?: string | null;
  defCn: string;
  defEn?: string | null;
  /** 该词所属技术栈 slug；用于错题集弱项分布（即使「全部」模式也能定位栈）。 */
  stackSlug?: string;
}

type Tab = "listen" | "recall";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function rand(n: number) {
  return Math.floor(Math.random() * n);
}

export default function DrillsClient({
  pool,
  stackName,
  stackSlug,
}: {
  pool: Item[];
  stackName: string;
  stackSlug?: string;
}) {
  const [tab, setTab] = useState<Tab>("listen");
  const [idx, setIdx] = useState(() => rand(Math.max(1, pool.length)));
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<null | boolean>(null);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);

  const cur = pool[idx];

  // 听力题的四个选项：1 正确 + 3 干扰（稳定到当前题目，避免因渲染产生随机抖动）
  const options = useMemo(() => {
    if (!cur) return [];
    const set = new Set<string>([cur.term]);
    let guard = 0;
    while (set.size < Math.min(4, pool.length) && guard < 200) {
      guard++;
      set.add(pool[rand(pool.length)].term);
    }
    return Array.from(set).sort(() => Math.random() - 0.5);
  }, [idx, cur, pool]);

  // 听力模式：切题后自动朗读
  useEffect(() => {
    if (tab !== "listen" || !cur) return;
    const t = setTimeout(() => speak(cur.term), 250);
    return () => clearTimeout(t);
  }, [tab, idx, cur]);

  function reset() {
    setPicked(null);
    setTyped("");
    setChecked(null);
    setIdx(rand(Math.max(1, pool.length)));
  }

  function switchTab(t: Tab) {
    setTab(t);
    reset();
  }

  if (pool.length === 0) {
    return <EmptyState title="没有可用于练习的单词" desc="换一个技术栈试试。" />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchTab("listen")}
          className={tab === "listen" ? "chip chip-active" : "chip"}
        >
          🎧 听力辨词
        </button>
        <button
          type="button"
          onClick={() => switchTab("recall")}
          className={tab === "recall" ? "chip chip-active" : "chip"}
        >
          ✍️ 中译英默写
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {tab === "listen"
          ? "播放英文发音，从四个选项中选出正确的单词。"
          : "看到中文释义，默写出对应的英文单词Enter 提交"}
        {" · "}
        本轮 对 {right} / 错 {wrong}
      </p>

      <Card className="mt-5 p-6">
        {tab === "listen" ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">听发音，选出正确单词</p>
              <Btn variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => speak(cur.term)}>
                🔊 再听一次
              </Btn>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {options.map((opt) => {
                const isCorrect = opt === cur.term;
                const chosen = picked === opt;
                let cls = "border-slate-700 hover:border-slate-500";
                if (picked) {
                  if (isCorrect) cls = "border-emerald-500 bg-emerald-500/10";
                  else if (chosen) cls = "border-rose-500 bg-rose-500/10";
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={Boolean(picked)}
                    onClick={() => {
                      setPicked(opt);
                      if (isCorrect) setRight((n) => n + 1);
                      else setWrong((n) => n + 1);
                      // 学情埋点：每答一题记一次（纯记录，不影响页面任何可见行为）
                      addPractice("listen", cur.term);
                      // 错题埋点：答错才记（纯记录）；优先用该词所属栈，退化用当前页栈
                      if (!isCorrect) addMistake(cur.term, "drill", cur.stackSlug ?? stackSlug);
                    }}
                    className={`rounded-xl border px-4 py-3 text-left font-mono transition ${cls}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {picked && (
              <div className="mt-4 border-t border-slate-800 pt-4">
                <p className={picked === cur.term ? "text-emerald-400" : "text-rose-400"}>
                  {picked === cur.term ? "✓ 正确" : `✗ 正确答案是 ${cur.term}`}
                </p>
                <p className="mt-1 text-sm text-slate-300">{cur.defCn}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Btn onClick={reset}>下一题</Btn>
                  <Link
                    href={`/word/${encodeURIComponent(cur.term)}`}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    查看详情 →
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider text-slate-500">中文释义</p>
            <p className="mt-1 text-lg text-slate-100">{cur.defCn}</p>

            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (checked !== null) return;
                const ok = norm(typed) === norm(cur.term);
                setChecked(ok);
                if (ok) setRight((n) => n + 1);
                else setWrong((n) => n + 1);
                // 学情埋点：每答一题记一次（纯记录，不影响页面任何可见行为）
                addPractice("write", cur.term);
                // 错题埋点：默写判错才记（纯记录）；优先用该词所属栈，退化用当前页栈
                if (!ok) addMistake(cur.term, "drill", cur.stackSlug ?? stackSlug);
              }}
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="输入英文单词后回车"
                disabled={checked !== null}
                className="input max-w-sm"
              />
              <Btn type="submit" disabled={checked !== null || !typed.trim()}>
                提交
              </Btn>
            </form>

            {checked !== null && (
              <div className="mt-4 border-t border-slate-800 pt-4">
                <p className={checked ? "text-emerald-400" : "text-rose-400"}>
                  {checked ? "✓ 正确" : `✗ 正确答案是 ${cur.term}`}
                </p>
                {cur.phonetic && (
                  <p className="mt-1 text-sm text-slate-500">/{cur.phonetic}/</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Btn onClick={reset}>下一题</Btn>
                  <Link
                    href={`/word/${encodeURIComponent(cur.term)}`}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    查看详情 →
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <p className="mt-4 text-center text-xs text-slate-600">
        词池：{stackName} · {pool.length} 词（随机抽样）
      </p>
    </div>
  );
}
