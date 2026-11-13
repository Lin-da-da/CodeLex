import Link from "next/link";
import { notFound } from "next/navigation";
import { getWordByTerm } from "@/lib/wordData";
import SpeakButton from "@/components/SpeakButton";
import SpeakPractice from "@/components/SpeakPractice";
import WordActions from "@/components/WordActions";
import FrequencyBadge from "@/components/FrequencyBadge";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function WordDetailPage({ params }: { params: { term: string } }) {
  const term = decodeURIComponent(params.term || "");
  const hit = getWordByTerm(term);
  if (!hit) notFound();

  const { stack, word: w } = hit;
  const sentences = w.exampleSentences?.length
    ? w.exampleSentences
    : w.exampleSentence
    ? [w.exampleSentence]
    : [];

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <PageHeader
        back={`/stacks/${stack.slug}`}
        icon={stack.icon}
        title={w.term}
        subtitle={
          <Link href={`/stacks/${stack.slug}`} className="hover:text-emerald-400">
            {stack.name}
          </Link>
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-mono text-3xl font-bold tracking-tight text-emerald-300">
                {w.term}
              </h2>
              <SpeakButton text={w.term} />
            </div>
            {w.phonetic && <p className="mt-1 text-slate-500">/{w.phonetic}/</p>}
            {w.pos && <p className="text-sm text-slate-400">{w.pos}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            {w.frequency && <FrequencyBadge frequency={w.frequency} size="md" showDot />}
            {typeof w.difficulty === "number" && (
              <span className="text-xs text-slate-500">难度 {w.difficulty}/5</span>
            )}
          </div>
        </div>

        <SpeakPractice target={w.term} />

        <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
          <p className="text-slate-100">{w.defCn}</p>
          {w.defEn && (
            <p className="flex items-start gap-2 text-sm text-slate-400">
              <span>{w.defEn}</span>
              <SpeakButton text={w.defEn} className="mt-0.5 shrink-0" />
            </p>
          )}
        </div>

        {sentences.length > 0 && (
          <div className="mt-4 border-t border-slate-800 pt-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">例句</p>
            <ul className="space-y-2">
              {sentences.map((s, i) => (
                <li key={i} className="flex items-start justify-between gap-2">
                  <span className="text-sm italic text-slate-300">“{s}”</span>
                  <SpeakButton text={s} className="mt-0.5 shrink-0" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {w.codeExample && (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-emerald-300">
            <code>{w.codeExample}</code>
          </pre>
        )}

        {w.tags && w.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
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

        <div className="mt-5 border-t border-slate-800 pt-4">
          <WordActions stackSlug={stack.slug} term={w.term} />
        </div>
      </Card>
    </main>
  );
}
