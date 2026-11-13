import Link from "next/link";
import { getAllWords, getStack, getStacks, getWordsByStack } from "@/lib/wordData";
import DrillsClient from "@/components/DrillsClient";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const SAMPLE = 300;

export const metadata = {
  title: "听说训练 · CodeLex",
  description: "英文听力辨词与中译英默写，针对程序员英文面试的输出能力训练。",
};

function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const copy = arr.slice();
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const j = Math.floor(Math.random() * copy.length);
    out.push(copy[j]);
    copy.splice(j, 1);
  }
  return out;
}

export default function DrillsPage({
  searchParams,
}: {
  searchParams: { stack?: string };
}) {
  const stacks = getStacks();
  const activeSlug = searchParams.stack || "";
  const stack = activeSlug ? getStack(activeSlug) : undefined;

  const seed =
    stack
      ? getWordsByStack(stack.slug).map((w) => ({ w, slug: stack.slug }))
      : getAllWords().flatMap((g) => g.words.map((w) => ({ w, slug: g.stack.slug })));

  const words = sample(seed, SAMPLE).map(({ w, slug }) => ({
    term: w.term,
    phonetic: w.phonetic ?? null,
    defCn: w.defCn,
    defEn: w.defEn ?? null,
    stackSlug: slug,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🎧"
        title="听说训练"
        subtitle="听力辨词 + 中译英默写，练的是「听到就懂、想到就说」"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/drills"
          className={!activeSlug ? "chip chip-active" : "chip"}
        >
          全部
        </Link>
        {stacks.map((s) => (
          <Link
            key={s.slug}
            href={`/drills?stack=${s.slug}`}
            className={activeSlug === s.slug ? "chip chip-active" : "chip"}
          >
            {s.icon} {s.name}
          </Link>
        ))}
      </div>

      <DrillsClient
        pool={words}
        stackName={stack ? stack.name : "全部技术栈"}
        stackSlug={stack?.slug}
      />
    </main>
  );
}
