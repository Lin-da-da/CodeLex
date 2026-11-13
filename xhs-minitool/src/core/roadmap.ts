/** 冲刺计划与学习路径（规则与网页版 PlanClient / PathClient 一致） */
import * as store from "./storage";
import { loadQuizHistory, loadPracticeLog, loadReadArticles, loadInterviews } from "./track";
import { loadReview } from "./srs";
import { stacks } from "./data";

export interface PlanTask {
  id: string;
  icon: string;
  label: string;
  href: string;
}
export interface PlanDay {
  id: string;
  date: string;
  phase: string;
  phaseName: string;
  tasks: PlanTask[];
}

const PHASES = [
  { key: "A", name: "词汇筑基", ratio: 0.35 },
  { key: "B", name: "阅读进阶", ratio: 0.25 },
  { key: "C", name: "口语输出", ratio: 0.25 },
  { key: "D", name: "模面冲刺", ratio: 0.15 },
];

function splitDays(d: number): number[] {
  const raw = PHASES.map((p) => p.ratio * d);
  const counts = raw.map((n) => Math.floor(n));
  let rest = d - counts.reduce((s, n) => s + n, 0);
  const order = raw.map((n, i) => ({ i, frac: n - Math.floor(n) })).sort((x, y) => y.frac - x.frac);
  let k = 0;
  while (rest > 0 && order.length > 0) {
    counts[order[k % order.length].i] += 1;
    rest -= 1;
    k += 1;
  }
  return counts;
}

function fmtDate(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
}

export function buildPlan(endDate: string, stackSlug: string, minutes: number): PlanDay[] {
  const st = stacks();
  let stackName = "";
  for (let i = 0; i < st.length; i++) if (st[i].slug === stackSlug) stackName = st[i].name;
  const target = new Date(endDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let d = Math.round((target.getTime() - today.getTime()) / 86400000) + 1;
  d = Math.min(60, Math.max(1, d || 1));

  const counts = splitDays(d);
  const wordCount = minutes === 30 ? 20 : minutes === 60 ? 40 : 60;
  const days: PlanDay[] = [];
  let n = 0;
  for (let p = 0; p < PHASES.length; p++) {
    for (let i = 0; i < counts[p]; i++) {
      const date = fmtDate(new Date(today.getTime() + n * 86400000));
      const round = i + 1;
      let tasks: PlanTask[] = [];
      if (PHASES[p].key === "A") {
        tasks = [
          { id: "A-" + n, icon: "📚", label: "背 " + stackName + " 高频词 " + wordCount + " 个（第 " + round + " 轮）", href: "#/learn/" + stackSlug },
          { id: "A2-" + n, icon: "🔁", label: "清掉今日到期的 SRS 复习卡片", href: "#/review" },
        ];
      } else if (PHASES[p].key === "B") {
        tasks = [{ id: "B-" + n, icon: "📰", label: "精读 1 篇技术文章，标记生词", href: "#/articles" }];
        if (minutes >= 60) {
          tasks.push({ id: "B2-" + n, icon: "✍️", label: "用英文写 5 句要点总结", href: "#/writing" });
        }
      } else if (PHASES[p].key === "C") {
        tasks = [
          { id: "C-" + n, icon: "🗣️", label: "60 秒口述「自我介绍 + 项目亮点」，再接 2 个追问", href: "#/kit" },
          { id: "C2-" + n, icon: "🔊", label: "跟读 10 个高频术语并自评", href: "#/pron" },
        ];
      } else {
        tasks = [
          { id: "D-" + n, icon: "🎤", label: "完成 1 场模拟面试", href: "#/interview" },
          { id: "D2-" + n, icon: "🧪", label: "复盘错题：重做测验 + 复习错词", href: "#/mistakes" },
        ];
      }
      days.push({ id: "d" + n, date, phase: PHASES[p].key, phaseName: PHASES[p].name, tasks });
      n += 1;
    }
  }
  return days;
}

export function loadPlan(): any {
  return store.get<any>("plan", null);
}
export function savePlan(p: any): void {
  store.set("plan", p);
}
export function loadPlanDone(): string[] {
  return store.get<string[]>("planDone", []);
}
export function savePlanDone(list: string[]): void {
  store.set("planDone", list);
}

/* ------------------------------------------------------------ 路径 ---- */
export interface PathStep {
  id: string;
  level: string;
  goal: string;
  rule: string;
  current: number;
  target: number;
  href: string;
}

export function pathProgress(): PathStep[] {
  const review = loadReview();
  let scheduled = 0;
  for (const k in review) scheduled += 1;
  const read = loadReadArticles().length;
  const practice = loadPracticeLog().length;
  const interviews = loadInterviews().length;
  return [
    {
      id: "L1",
      level: "L1",
      goal: "掌握 300 个技术高频词，做到看到术语能秒反应出中文含义",
      rule: "完成判定：SRS 复习队列中已排期的词条数量 ≥ 300",
      current: scheduled,
      target: 300,
      href: "#/review",
    },
    {
      id: "L2",
      level: "L2",
      goal: "精读 20 篇英文技术文章，适应长句与真实文档表达",
      rule: "完成判定：已读文章数 ≥ 20（把文章滚到底即自动记一次已读）",
      current: read,
      target: 20,
      href: "#/articles",
    },
    {
      id: "L3",
      level: "L3",
      goal: "完成 50 次发音 / 听力 / 默写练习",
      rule: "完成判定：练习次数 ≥ 50（跟读自评、听力辨词、中译英默写各记一次）",
      current: practice,
      target: 50,
      href: "#/drills",
    },
    {
      id: "L4",
      level: "L4",
      goal: "完成 3 场完整模拟面试，拿到报告并针对性补短板",
      rule: "完成判定：已完成的模拟面试场次 ≥ 3",
      current: interviews,
      target: 3,
      href: "#/interview",
    },
  ];
}
