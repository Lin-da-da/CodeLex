import Link from "next/link";
import { getDailyWord, getRecentDailyWords } from "@/lib/daily";
import SpeakButton from "@/components/SpeakButton";
import FrequencyBadge from "@/components/FrequencyBadge";
import WordActions from "@/components/WordActions";
import { Card, PageHeader, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function DailyPage({
  searchParams,
}: {
  searchParams: { d?: string };
}) {
  let day = new Date();
  if (searchParams.d) {
    const parsed = new Date(`${searchParams.d}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) day = parsed;
  }
  const daily = getDailyWord(day);
  const recent = getRecentDailyWords(7);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <PageHeader
        back="/"
        icon="📅"
        title="每日一词"
        subtitle="每天精学一个高频术语，坚持积累程序员地道英文。点 🔊 跟读，☆ 收藏，＋ 加入复习队列。"
      />

      {daily ? (
        <Card className="animate-fade-up overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-br from-emerald-900/20 to-transparent px-6 py-3 text-sm text-slate-400">
            <span>{daily.date}</span>
            <Link
              href={`/stacks/${daily.stack.slug}`}
              className="flex items-center gap-1.5 text-emerald-300 hover:underline"
            >
              {daily.stack.icon} {daily.stack.name}
            </Link>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-3xl font-bold tracking-tight text-emerald-300">
                  {daily.word.term}
                </div>
                {daily.word.phonetic && (
                  <div className="mt-1 text-slate-400">/{daily.word.phonetic}/</div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <SpeakButton text={daily.word.term} />
                {daily.word.defEn && (
                  <SpeakButton text={daily.word.defEn} title="朗读英文释义" />
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {daily.word.pos && (
                <span className="chip">{daily.word.pos}</span>
              )}
              <FrequencyBadge frequency={daily.word.frequency} size="md" showDot />
            </div>

            <p className="mt-4 text-lg text-slate-100">{daily.word.defCn}</p>
            {daily.word.defEn && (
              <p className="mt-1 text-sm text-slate-400">{daily.word.defEn}</p>
            )}

            {daily.word.exampleSentences && daily.word.exampleSentences.length > 0 && (
              <div className="mt-5">
                <SectionTitle>例句</SectionTitle>
                <ul className="space-y-2">
                  {daily.word.exampleSentences.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-slate-950/60 p-3 text-sm italic text-slate-300"
                    >
                      <span className="mt-0.5 shrink-0 text-emerald-400">“</span>
                      <span className="flex-1">{s}</span>
                      <SpeakButton text={s} className="mt-0.5 shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {daily.word.codeExample && (
              <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-[13px] text-emerald-300">
                <code>{daily.word.codeExample}</code>
              </pre>
            )}

            <div className="mt-6 border-t border-slate-800 pt-5">
              <WordActions stackSlug={daily.stack.slug} term={daily.word.term} />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center text-slate-400">暂无可用的每日一词。</Card>
      )}

      {recent.length > 1 && (
        <div className="mt-10">
          <SectionTitle hint="点击回顾">往期回顾</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {recent.slice(1).map((r) => (
              <Link
                key={r.date}
                href={`/daily?d=${r.date}`}
                className="chip hover:border-emerald-500 hover:text-emerald-300"
                title={`${r.stack.name} · ${r.word.defCn}`}
              >
                <span className="text-slate-500">{r.date.slice(5)}</span>
                <span className="font-mono text-emerald-300">{r.word.term}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
