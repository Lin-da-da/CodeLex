"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useReviewState } from "@/lib/useReviewState";
import { dueKeys } from "@/lib/srs";
import {
  loadQuizHistory,
  quizStats,
  type QuizRecord,
} from "@/lib/quizHistory";
import {
  loadReviewLog,
  currentStreak,
  last7Days,
  reviewsToday,
  totalReviews,
  type ReviewLog,
} from "@/lib/reviewLog";
import { loadFavorites } from "@/lib/favorites";
import { Card, PageHeader, SectionTitle, Stat, ProgressBar, Btn, EmptyState } from "@/components/ui";

export default function StatsPage() {
  const { state, ready } = useReviewState();
  const [quiz, setQuiz] = useState<QuizRecord[]>([]);
  const [log, setLog] = useState<ReviewLog>({});
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    setQuiz(loadQuizHistory());
    setLog(loadReviewLog());
    setFavCount(loadFavorites().length);
  }, []);

  const review = useMemo(() => {
    const items = Object.values(state);
    const due = ready ? dueKeys(state).length : 0;
    const learned = items.filter((i) => i.interval > 0).length;
    const mastered = items.filter((i) => i.interval >= 21).length;
    const avgEase =
      items.length > 0
        ? (
            items.reduce((s, i) => s + i.ease, 0) / items.length
          ).toFixed(2)
        : "—";
    return {
      scheduled: items.length,
      due,
      learned,
      mastered,
      avgEase,
      masteryPct: items.length > 0 ? Math.round((mastered / items.length) * 100) : 0,
    };
  }, [state, ready]);

  const q = useMemo(() => quizStats(quiz), [quiz]);
  const week = last7Days(log);
  const maxWeek = Math.max(1, ...week.map((d) => d.count));
  const streak = currentStreak(log);
  const todayReviews = reviewsToday(log);
  const totalRev = totalReviews(log);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <PageHeader
        back="/"
        icon="📊"
        title="学习统计"
        subtitle="数据保存在本机浏览器。连续复习、掌握度与测验成绩一目了然。"
        actions={
          <Btn href="/review" variant="ghost">去复习 →</Btn>
        }
      />

      {!ready ? (
        <Card className="p-8 text-center text-slate-400">加载中…</Card>
      ) : (
        <>
          {/* 概览指标 */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="连续学习" value={`${streak} 天`} sub={`今日复习 ${todayReviews} 次`} icon="🔥" accent="rose" />
            <Stat label="已排期复习" value={review.scheduled} sub={`待复习 ${review.due}`} icon="🔁" accent="emerald" />
            <Stat label="测验均分" value={`${q.avg}%`} sub={`${q.totalQuizzes} 次测验`} icon="🧪" accent="sky" />
            <Stat label="我的收藏" value={favCount} sub="可导出复习" icon="⭐" accent="amber" />
          </div>

          {/* 掌握度 */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <SectionTitle>复习掌握度</SectionTitle>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold text-emerald-300">{review.mastered}</div>
                  <div className="text-xs text-slate-500">已熟练掌握（间隔 ≥ 21 天）</div>
                </div>
                <div className="text-right text-sm text-slate-400">
                  共排期 <span className="text-slate-200">{review.scheduled}</span> 词
                  <div>已学 <span className="text-slate-200">{review.learned}</span></div>
                </div>
              </div>
              <ProgressBar value={review.masteryPct} className="mt-4" />
              <p className="mt-2 text-xs text-slate-500">掌握率 {review.masteryPct}%</p>
            </Card>

            <Card className="p-5">
              <SectionTitle hint={`累计 ${totalRev} 次`}>近 7 天复习</SectionTitle>
              <div className="mt-4 flex h-32 items-end justify-between gap-2">
                {week.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{d.count}</span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400"
                      style={{ height: `${(d.count / maxWeek) * 100}%`, minHeight: d.count > 0 ? 6 : 2 }}
                    />
                    <span className="text-[10px] text-slate-600">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* 复习间隔分布 */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-100">{review.learned}</div>
              <div className="mt-1 text-xs text-slate-500">已学习（间隔 &gt; 0）</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-100">{review.mastered}</div>
              <div className="mt-1 text-xs text-slate-500">已掌握（≥ 21 天）</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-100">{review.avgEase}</div>
              <div className="mt-1 text-xs text-slate-500">平均记忆难度 (ease)</div>
            </Card>
          </div>

          {/* 测验历史 */}
          <div className="mt-8">
            <SectionTitle hint={q.totalQuestions > 0 ? `共 ${q.totalQuestions} 题` : undefined}>
              最近测验
            </SectionTitle>
            {quiz.length === 0 ? (
              <EmptyState
                title="还没有测验记录"
                desc="去测验页抽一组题，成绩会自动记录在这里。"
                action={<Btn href="/quiz">开始测验</Btn>}
              />
            ) : (
              <div className="space-y-2">
                {quiz.slice(0, 8).map((r, i) => {
                  const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                  return (
                    <Card key={i} className="flex items-center gap-4 p-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          pct >= 80
                            ? "bg-emerald-500/15 text-emerald-300"
                            : pct >= 50
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {pct}%
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-200">
                          {r.stacks.length ? r.stacks.join(" · ") : "全部词库"}
                        </div>
                        <div className="text-xs text-slate-500">
                          对 {r.score} / {r.total} · 错 {r.wrong.length} 词 ·{" "}
                          {new Date(r.at).toLocaleString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      {r.wrong.length > 0 && (
                        <Link
                          href="/review"
                          className="hidden shrink-0 text-xs text-emerald-300 hover:underline sm:block"
                        >
                          加入复习 →
                        </Link>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
