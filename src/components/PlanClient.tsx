"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Btn, Card, EmptyState, ProgressBar, SectionTitle, Stat, Tag } from "@/components/ui";
import { migrateKey, sk } from "@/lib/scope";

const PLAN_KEY = "codelex:plan";
const DONE_KEY = "codelex:plan:done";

export interface PlanStack {
  slug: string;
  name: string;
  icon: string;
}

type Minutes = 30 | 60 | 90;

interface PlanConfig {
  date: string;
  stackSlug: string;
  minutes: Minutes;
}

interface Task {
  id: string;
  icon: string;
  label: string;
  href: string;
}

interface PlanDay {
  date: string;
  dayNo: number;
  phaseKey: "A" | "B" | "C" | "D";
  tasks: Task[];
}

const MINUTE_OPTIONS: Minutes[] = [30, 60, 90];

const PHASES = [
  {
    key: "A",
    name: "词汇筑基",
    icon: "🔤",
    ratio: 0.35,
    badge: "border-sky-700 bg-sky-500/10 text-sky-300",
  },
  {
    key: "B",
    name: "阅读进阶",
    icon: "📖",
    ratio: 0.25,
    badge: "border-amber-700 bg-amber-500/10 text-amber-300",
  },
  {
    key: "C",
    name: "口语输出",
    icon: "🗣️",
    ratio: 0.25,
    badge: "border-violet-700 bg-violet-500/10 text-violet-300",
  },
  {
    key: "D",
    name: "模面冲刺",
    icon: "🎤",
    ratio: 0.15,
    badge: "border-emerald-700 bg-emerald-500/10 text-emerald-300",
  },
] as const;

const PHASE_MAP: Record<string, (typeof PHASES)[number]> = {
  A: PHASES[0],
  B: PHASES[1],
  C: PHASES[2],
  D: PHASES[3],
};

/* --------------------------- 日期工具（本地时区） --------------------------- */

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 两个本地零时日期之间的天数差。 */
function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** 按 35/25/25/15 把 D 天切成四个阶段（余数给小数部分最大的阶段）。 */
function splitDays(d: number): number[] {
  const raw = PHASES.map((p) => p.ratio * d);
  const counts = raw.map((n) => Math.floor(n));
  let rest = d - counts.reduce((s, n) => s + n, 0);
  const order = raw
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((x, y) => y.frac - x.frac);
  let k = 0;
  while (rest > 0 && order.length > 0) {
    counts[order[k % order.length].i] += 1;
    rest -= 1;
    k += 1;
  }
  return counts;
}

function tasksFor(
  phaseKey: "A" | "B" | "C" | "D",
  ctx: { stackName: string; stackSlug: string; minutes: Minutes; round: number }
): Task[] {
  const { stackName, stackSlug, minutes, round } = ctx;
  const wordCount = minutes === 30 ? 20 : minutes === 60 ? 40 : 60;
  switch (phaseKey) {
    case "A":
      return [
        {
          id: "A-0",
          icon: "📚",
          label: `背 ${stackName} 高频词 ${wordCount} 个（第 ${round} 轮）`,
          href: stackSlug ? `/learn/${stackSlug}` : "/stacks",
        },
        { id: "A-1", icon: "🔁", label: "清掉今日到期的 SRS 复习卡片", href: "/review" },
      ];
    case "B": {
      const list: Task[] = [
        {
          id: "B-0",
          icon: "📰",
          label: "精读 1 篇技术文章，标记生词并跟读小标题",
          href: "/articles",
        },
      ];
      if (minutes >= 60) {
        list.push({ id: "B-1", icon: "✍️", label: "用英文写 5 句要点总结", href: "/writing" });
      }
      return list;
    }
    case "C":
      return [
        {
          id: "C-0",
          icon: "🗣️",
          label: "60 秒口述「自我介绍 + 项目亮点」，再接 2 个追问",
          href: "/interview-kit",
        },
        { id: "C-1", icon: "🔊", label: "跟读打分 10 个高频术语", href: "/pronunciation" },
      ];
    case "D":
      return [
        { id: "D-0", icon: "🎤", label: "完整 AI 模拟面试 1 场（答完生成报告）", href: "/interview" },
        { id: "D-1", icon: "🧪", label: "复盘错题：重做测验 + 复习错词", href: "/review" },
      ];
  }
}

/* ------------------------------- 主组件 ------------------------------- */

export default function PlanClient({ stacks }: { stacks: PlanStack[] }) {
  const [cfg, setCfg] = useState<PlanConfig>(() => ({
    date: "",
    stackSlug: stacks[0]?.slug ?? "",
    minutes: 60,
  }));
  const [done, setDone] = useState<Record<string, string[]>>({});
  const [hydrated, setHydrated] = useState(false);

  // 首次挂载后才读 localStorage，避免 SSR / 水合不一致
  useEffect(() => {
    try {
      migrateKey(PLAN_KEY);
      migrateKey(DONE_KEY);
      const rawCfg = localStorage.getItem(sk(PLAN_KEY));
      if (rawCfg) {
        const p = JSON.parse(rawCfg) as Partial<PlanConfig>;
        setCfg({
          date: typeof p.date === "string" ? p.date : "",
          stackSlug: typeof p.stackSlug === "string" ? p.stackSlug : stacks[0]?.slug ?? "",
          minutes:
            p.minutes === 30 || p.minutes === 60 || p.minutes === 90 ? p.minutes : 60,
        });
      }
      const rawDone = localStorage.getItem(sk(DONE_KEY));
      if (rawDone) {
        const o = JSON.parse(rawDone) as Record<string, unknown>;
        const next: Record<string, string[]> = {};
        if (o && typeof o === "object") {
          for (const [k, v] of Object.entries(o)) {
            if (Array.isArray(v)) next[k] = v.filter((x) => typeof x === "string");
          }
        }
        setDone(next);
      }
    } catch {
      /* noop */
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 配置变更时写回（仅在读取完成后）
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(sk(PLAN_KEY), JSON.stringify(cfg));
    } catch {
      /* noop */
    }
  }, [cfg, hydrated]);

  const plan = useMemo(() => {
    if (!cfg.date) return null;
    const target = parseYmd(cfg.date);
    if (!target) return null;
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const rawDiff = diffDays(target, base);
    const total = Math.min(60, Math.max(1, rawDiff));
    const counts = splitDays(total);
    const stack = stacks.find((s) => s.slug === cfg.stackSlug) ?? stacks[0];
    const stackName = stack?.name ?? "目标技术栈";
    const stackSlug = stack?.slug ?? "";

    const days: PlanDay[] = [];
    let n = 0;
    PHASES.forEach((ph, pi) => {
      for (let k = 0; k < counts[pi]; k++) {
        const d = new Date(base);
        d.setDate(base.getDate() + n);
        days.push({
          date: ymd(d),
          dayNo: n + 1,
          phaseKey: ph.key,
          tasks: tasksFor(ph.key, { stackName, stackSlug, minutes: cfg.minutes, round: k + 1 }),
        });
        n += 1;
      }
    });

    return { days, rawDiff, total, today: ymd(base) };
  }, [cfg, stacks]);

  const totalTasks = plan ? plan.days.reduce((s, d) => s + d.tasks.length, 0) : 0;
  const doneCount = plan
    ? plan.days.reduce((s, d) => {
        const ids = done[d.date] ?? [];
        return s + d.tasks.filter((t) => ids.includes(t.id)).length;
      }, 0)
    : 0;
  const pct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  function toggleTask(date: string, id: string) {
    const cur = done[date] ?? [];
    const nextList = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    const next = { ...done, [date]: nextList };
    setDone(next);
    try {
      localStorage.setItem(sk(DONE_KEY), JSON.stringify(next));
    } catch {
      /* noop */
    }
  }

  function resetPlan() {
    if (typeof window !== "undefined" && !window.confirm("清空全部勾选记录？计划配置会保留。")) {
      return;
    }
    setDone({});
    try {
      localStorage.removeItem(sk(DONE_KEY));
    } catch {
      /* noop */
    }
  }

  function quickStart() {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setCfg((c) => ({ ...c, date: ymd(d) }));
  }

  return (
    <div className="animate-fade-up">
      {/* 设置区 */}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-400">面试日期</span>
            <input
              type="date"
              value={cfg.date}
              onChange={(e) => setCfg((c) => ({ ...c, date: e.target.value }))}
              className="input"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-400">目标技术栈</span>
            <select
              value={cfg.stackSlug}
              onChange={(e) => setCfg((c) => ({ ...c, stackSlug: e.target.value }))}
              className="input"
            >
              {stacks.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className="block text-sm">
            <span className="mb-1.5 block text-slate-400">每天可投入</span>
            <div className="flex flex-wrap gap-2">
              {MINUTE_OPTIONS.map((m) => (
                <Tag
                  key={m}
                  as="button"
                  active={cfg.minutes === m}
                  onClick={() => setCfg((c) => ({ ...c, minutes: m }))}
                >
                  {m} 分钟
                </Tag>
              ))}
            </div>
          </div>
        </div>

        {plan && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
            <Tag>🔤 词汇 {Math.round(plan.total * 0.35)} 天</Tag>
            <Tag>📖 阅读 {Math.round(plan.total * 0.25)} 天</Tag>
            <Tag>🗣️ 口语 {Math.round(plan.total * 0.25)} 天</Tag>
            <Tag>🎤 模面 {plan.total - Math.round(plan.total * 0.35) - Math.round(plan.total * 0.25) - Math.round(plan.total * 0.25)} 天</Tag>
            <Btn variant="ghost" className="ml-auto px-3 py-1.5 text-xs" onClick={resetPlan}>
              ↺ 重置计划
            </Btn>
          </div>
        )}
      </Card>

      {!plan ? (
        <div className="mt-6">
          <EmptyState
            title="先设定你的面试日期"
            desc="选择面试日期后，这里会按「词汇筑基 → 阅读进阶 → 口语输出 → 模面冲刺」四个阶段，自动倒排出每天该练什么（最多 60 天）。"
            action={<Btn onClick={quickStart}>先用 14 天试试</Btn>}
          />
        </div>
      ) : (
        <>
          {/* 统计区 */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat
              label="剩余天数"
              value={Math.max(0, plan.rawDiff)}
              sub={plan.rawDiff < 0 ? "面试日期已过，建议重新设定" : `目标日 ${cfg.date}`}
              icon="⏳"
            />
            <Stat
              label="已完成任务"
              value={`${doneCount} / ${totalTasks}`}
              sub={`共 ${plan.days.length} 天 · 每天 ${cfg.minutes} 分钟`}
              icon="✅"
              accent="sky"
            />
            <Stat label="完成率" value={`${pct}%`} sub="勾选任务即计入" icon="📈" accent="amber" />
          </div>

          <div className="mt-4">
            <ProgressBar value={doneCount} max={totalTasks} />
          </div>

          {/* 每日任务 */}
          <div className="mt-8">
            <SectionTitle hint={`${plan.days.length} 天 · ${totalTasks} 个任务`}>
              每日任务
            </SectionTitle>

            <div className="space-y-4">
              {plan.days.map((d) => {
                const ph = PHASE_MAP[d.phaseKey];
                const isToday = d.date === plan.today;
                const ids = done[d.date] ?? [];
                return (
                  <Card
                    key={d.date}
                    className={`p-5 ${isToday ? "border-emerald-500 bg-emerald-500/5" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">
                        第 {d.dayNo} 天
                      </span>
                      <span className="text-xs text-slate-500">/ 共 {plan.total} 天</span>
                      <span className="text-xs tabular-nums text-slate-500">{d.date}</span>
                      <span className={`ml-1 rounded-full border px-2.5 py-0.5 text-xs ${ph.badge}`}>
                        {ph.icon} {ph.name}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-medium text-slate-950">
                          今天
                        </span>
                      )}
                    </div>

                    <ul className="mt-3 space-y-2">
                      {d.tasks.map((t) => {
                        const checked = ids.includes(t.id);
                        return (
                          <li key={t.id} className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleTask(d.date, t.id)}
                              aria-label={checked ? "取消完成" : "标记完成"}
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition ${
                                checked
                                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                                  : "border-slate-700 text-transparent hover:border-emerald-500"
                              }`}
                            >
                              ✓
                            </button>
                            <Link
                              href={t.href}
                              className={`text-sm transition hover:text-emerald-300 ${
                                checked ? "text-slate-500 line-through" : "text-slate-200"
                              }`}
                            >
                              <span className="mr-1.5">{t.icon}</span>
                              {t.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
