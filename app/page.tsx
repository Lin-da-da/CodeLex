import Link from "next/link";
import { getStacks, getStackStats, getTotalWordCount } from "@/lib/wordData";
import { getDailyWord } from "@/lib/daily";
import FrequencyBadge from "@/components/FrequencyBadge";
import SpeakButton from "@/components/SpeakButton";
import { Card, PageHeader, SectionTitle, Btn } from "@/components/ui";

export const dynamic = "force-dynamic";

const FEATURES = [
  { href: "/daily", icon: "📅", title: "每日一词", desc: "每天精学一个高频术语，养成习惯。" },
  { href: "/quiz", icon: "🧪", title: "测验", desc: "跨技术栈随机抽题，检验记忆。" },
  { href: "/review", icon: "🔁", title: "间隔复习", desc: "SRS 排期，遗忘曲线自动提醒。" },
  { href: "/articles", icon: "📚", title: "技术文章", desc: "中英对照阅读，点词即查。" },
  { href: "/drills", icon: "🎧", title: "听说训练", desc: "听力辨词 + 中译英默写，补听说短板。" },
  { href: "/interview-kit", icon: "🗣️", title: "口语中心", desc: "句型模板、60 秒口述、BQ、三级追问链。" },
  { href: "/interview", icon: "🎤", title: "AI 模拟面试", desc: "英文问答 + 追问深度 + 双语能力报告。" },
  { href: "/pronunciation", icon: "🔊", title: "易错发音", desc: "程序员常读错的技术词，跟读打分。" },
  { href: "/roles", icon: "💼", title: "岗位词包", desc: "按 JD 打包必背词，面试前精准突击。" },
  { href: "/writing", icon: "✍️", title: "英文写作", desc: "PR / commit / review / design doc 模板。" },
  { href: "/mistakes", icon: "🧯", title: "错题集", desc: "汇总各来源错题，看清弱项分布。" },
  { href: "/plan", icon: "🎯", title: "冲刺计划", desc: "设定面试日期，自动生成每日任务。" },
  { href: "/path", icon: "🗺️", title: "学习路径", desc: "四阶段路线图，真实数据算进度。" },
  { href: "/stats", icon: "📊", title: "学习统计", desc: "连续天数、掌握度与成绩趋势。" },
  { href: "/favorites", icon: "⭐", title: "我的收藏", desc: "生词本，随时复习与导出。" },
];

export default function Home() {
  const stacks = getStacks();
  const stats = getStackStats();
  const totalWords = getTotalWordCount();
  const daily = getDailyWord();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-emerald-900/30 via-slate-900/40 to-slate-950 p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/50 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            🚀 程序员领域英文 · 已收录 {totalWords.toLocaleString()} 词 / {stacks.length} 技术栈
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Code<span className="text-emerald-400">Lex</span>
          </h1>
          <p className="mt-3 max-w-xl text-balance text-slate-300">
            按技术栈系统学习编程英文单词与文章：背词、测验、读源码级文章，
            <span className="text-emerald-300">生词自动回流复习</span>，用最短路径补齐工程师的英语短板。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Btn href="/daily" variant="primary">📅 今日一词</Btn>
            <Btn href="/quiz" variant="ghost">🧪 开始测验</Btn>
            <Btn href="/stats" variant="ghost">📊 学习统计</Btn>
          </div>
        </div>
      </header>

      {/* 每日一词 速览 */}
      {daily && (
        <section className="mt-8">
          <SectionTitle hint={<Link href="/daily" className="hover:text-emerald-300">查看全部 →</Link>}>
            每日一词
          </SectionTitle>
          <Link href="/daily">
            <Card hover className="flex flex-wrap items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl">
                📅
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-emerald-300">
                    {daily.word.term}
                  </span>
                  <FrequencyBadge frequency={daily.word.frequency} size="sm" />
                  <span className="text-xs text-slate-500">
                    {daily.stack.icon} {daily.stack.name}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">{daily.word.defCn}</p>
              </div>
              <div className="flex items-center gap-1">
                <SpeakButton text={daily.word.term} />
                <span className="text-emerald-400">→</span>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* 功能入口 */}
      <section className="mt-10">
        <SectionTitle>学习中心</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Link key={f.href} href={f.href} className="animate-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
              <Card hover className="h-full p-5">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-2 font-semibold text-slate-100">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{f.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 技术栈 */}
      <section className="mt-10">
        <SectionTitle hint="点击进入背词">技术栈词库</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(({ stack, count, high }, i) => (
            <Link
              key={stack.slug}
              href={`/learn/${stack.slug}`}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Card hover className="h-full p-5">
                <div className="flex items-start justify-between">
                  <div className="text-2xl">{stack.icon}</div>
                  <span className="rounded-full bg-slate-800/70 px-2.5 py-0.5 text-xs text-slate-300">
                    {count} 词
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">{stack.name}</h3>
                <p className="mt-1 text-sm text-slate-400 line-clamp-2">{stack.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <FrequencyBadge frequency="high" size="sm" />
                  <span>{high} 高频</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 频率分层说明 */}
      <section className="mt-10">
        <Card className="p-5 text-sm text-slate-400">
          <span className="font-semibold text-slate-300">频率分层：</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <FrequencyBadge frequency="high" size="md" showDot />
              <span className="text-slate-500">面试必背</span>
            </span>
            <span className="text-slate-700">/</span>
            <span className="inline-flex items-center gap-1.5">
              <FrequencyBadge frequency="mid" size="md" showDot />
              <span className="text-slate-500">巩固即可</span>
            </span>
            <span className="text-slate-700">/</span>
            <span className="inline-flex items-center gap-1.5">
              <FrequencyBadge frequency="low" size="md" showDot />
              <span className="text-slate-500">进阶拓展</span>
            </span>
          </div>
        </Card>
      </section>
    </main>
  );
}
