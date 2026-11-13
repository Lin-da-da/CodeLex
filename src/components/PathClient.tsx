"use client";

import { useEffect, useState } from "react";
import { Btn, Card, ProgressBar, SectionTitle, Stat, Tag } from "@/components/ui";
import { loadReview } from "@/lib/srs";
import { getReadArticles } from "@/lib/readingLog";
import { getPracticeCount } from "@/lib/practiceLog";
import { getInterviewSessions } from "@/lib/interviewLog";

interface Progress {
  words: number;
  articles: number;
  practice: number;
  interviews: number;
}

const EMPTY: Progress = { words: 0, articles: 0, practice: 0, interviews: 0 };

interface StageTask {
  icon: string;
  label: string;
  href: string;
}

interface Stage {
  id: string;
  level: string;
  title: string;
  icon: string;
  goal: string;
  current: number;
  target: number;
  rule: string;
  tasks: StageTask[];
}

/** 从 localStorage 汇总四项真实进度（服务端调用时返回全 0）。 */
function readProgress(): Progress {
  return {
    words: Object.keys(loadReview()).length,
    articles: getReadArticles().length,
    practice: getPracticeCount(),
    interviews: getInterviewSessions().length,
  };
}

function pct(cur: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((cur / target) * 100));
}

export default function PathClient() {
  const [p, setP] = useState<Progress>(EMPTY);

  // 首屏渲染用 0，挂载后再读本地数据，避免 SSR / 水合不一致
  useEffect(() => {
    function sync() {
      setP(readProgress());
    }
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const stages: Stage[] = [
    {
      id: "L1",
      level: "L1",
      title: "词汇筑基",
      icon: "🔤",
      goal: "掌握 300 个技术高频词，做到看到术语能秒反应出中文含义",
      current: p.words,
      target: 300,
      rule: "完成判定：SRS 复习队列中被你评级过的词条数量 ≥ 300（在背词 / 复习中评级即累计）",
      tasks: [
        { icon: "📚", label: "按技术栈背词", href: "/stacks" },
        { icon: "📅", label: "今日词单", href: "/daily" },
        { icon: "🔁", label: "复习到期卡片", href: "/review" },
      ],
    },
    {
      id: "L2",
      level: "L2",
      title: "阅读进阶",
      icon: "📖",
      goal: "精读 20 篇英文技术文章，适应长句与真实文档表达",
      current: p.articles,
      target: 20,
      rule: "完成判定：已读文章数 ≥ 20（把文章滚到底即自动记一次已读）",
      tasks: [
        { icon: "📰", label: "技术文章库", href: "/articles" },
        { icon: "✍️", label: "英文写作练习", href: "/writing" },
        { icon: "🔍", label: "生词速查", href: "/search" },
      ],
    },
    {
      id: "L3",
      level: "L3",
      title: "听说输出",
      icon: "🗣️",
      goal: "完成 50 次发音 / 听力 / 默写练习，把被动词汇变成能说出口的",
      current: p.practice,
      target: 50,
      rule: "完成判定：练习次数 ≥ 50（跟读打分、听力辨词、中译英默写各记一次）",
      tasks: [
        { icon: "💬", label: "口语题库与追问链", href: "/interview-kit" },
        { icon: "🔊", label: "发音跟读打分", href: "/pronunciation" },
        { icon: "🎧", label: "听力 / 默写训练", href: "/drills" },
      ],
    },
    {
      id: "L4",
      level: "L4",
      title: "模面冲刺",
      icon: "🎤",
      goal: "完成 3 场完整 AI 模拟面试，拿到报告并针对性补短板",
      current: p.interviews,
      target: 3,
      rule: "完成判定：已完成的模拟面试场次 ≥ 3（每场生成最终报告时记一次）",
      tasks: [
        { icon: "🎙️", label: "AI 模拟面试", href: "/interview" },
        { icon: "🧪", label: "限时测验", href: "/quiz" },
        { icon: "📊", label: "学习统计复盘", href: "/stats" },
      ],
    },
  ];

  const overall = Math.round(
    stages.reduce((s, st) => s + pct(st.current, st.target), 0) / stages.length
  );
  const cleared = stages.filter((st) => st.current >= st.target).length;

  return (
    <div className="animate-fade-up">
      {/* 总览 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="总体完成度" value={`${overall}%`} sub="四个阶段的平均百分比" icon="🚀" />
        <Stat
          label="已通关阶段"
          value={`${cleared} / 4`}
          sub={cleared === 4 ? "全部达成，直接上场吧" : "继续推进下一阶段"}
          icon="🏁"
          accent="amber"
        />
        <Stat
          label="累计练习"
          value={p.words + p.articles + p.practice + p.interviews}
          sub="词条 + 文章 + 练习 + 模面"
          icon="📈"
          accent="sky"
        />
      </div>

      <div className="mt-4">
        <ProgressBar value={overall} max={100} />
      </div>

      {/* 阶段路线 */}
      <div className="mt-8">
        <SectionTitle hint="进度来自你的本地学习数据">四个阶段</SectionTitle>

        <ol className="relative space-y-4">
          <span
            aria-hidden
            className="absolute bottom-8 left-6 top-8 hidden w-px bg-slate-800 sm:block"
          />
          {stages.map((st) => {
            const pctv = pct(st.current, st.target);
            const clearedNow = st.current >= st.target;
            return (
              <li key={st.id} className="relative sm:pl-16">
                <span
                  className={`absolute left-0 top-5 hidden h-12 w-12 items-center justify-center rounded-full border text-xl sm:flex ${
                    clearedNow
                      ? "border-emerald-500 bg-emerald-500/15"
                      : "border-slate-700 bg-slate-900"
                  }`}
                >
                  {st.icon}
                </span>

                <Card className={`p-5 ${clearedNow ? "border-emerald-700/60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {st.level}
                    </span>
                    <h3 className="text-base font-semibold text-slate-200">
                      {st.icon} {st.title}
                    </h3>
                    {clearedNow ? (
                      <Tag active>✓ 已达成</Tag>
                    ) : (
                      <Tag>{pctv}%</Tag>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-400">{st.goal}</p>

                  <div className="mt-4 flex items-center gap-3">
                    <ProgressBar value={st.current} max={st.target} className="flex-1" />
                    <span className="shrink-0 text-sm tabular-nums text-slate-300">
                      {st.current} / {st.target}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">{st.rule}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {st.tasks.map((t) => (
                      <Btn key={t.href} href={t.href} variant="ghost" className="px-3 py-1.5 text-xs">
                        {t.icon} {t.label}
                      </Btn>
                    ))}
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        数据全部保存在本机浏览器；换设备或清理缓存会重置进度。
      </p>
    </div>
  );
}
