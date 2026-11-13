import { PageHeader, Card } from "@/components/ui";
import SpeakButton from "@/components/SpeakButton";
import SpeakPractice from "@/components/SpeakPractice";
import { getPronItems } from "@/lib/interviewKit";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "易错发音 · CodeLex",
  description: "中国程序员英文面试中最容易读错的技术词汇与缩写。",
};

export default function PronunciationPage() {
  const items = getPronItems();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🔊"
        title="易错发音"
        subtitle={`${items.length} 个技术词汇 · 听标准发音，跟读并打分`}
      />

      <p className="mb-5 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
        点击 <span className="text-emerald-400">🎙 跟读打分</span>{" "}
        会调用浏览器语音识别，把你读的内容转成文字并与目标词比对打分（需麦克风权限，建议用
        Chrome / Edge）。
      </p>

      <div className="space-y-3">
        {items.map((it) => (
          <Card key={it.term} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-lg font-semibold text-emerald-300">
                  {it.term}
                </span>
                {it.ipa && <span className="text-sm text-slate-500">{it.ipa}</span>}
                <SpeakButton text={it.term} />
              </div>
            </div>

            <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {it.common && (
                <p className="text-rose-400/90">
                  <span className="text-slate-500">常见误读：</span>
                  {it.common}
                </p>
              )}
              {it.correct && (
                <p className="text-emerald-400/90">
                  <span className="text-slate-500">正确读法：</span>
                  {it.correct}
                </p>
              )}
            </div>

            {it.tipCn && <p className="mt-1.5 text-xs text-slate-400">💡 {it.tipCn}</p>}

            {it.ex && (
              <div className="mt-2 flex items-start justify-between gap-2 border-t border-slate-800 pt-2">
                <p className="text-sm italic text-slate-300">“{it.ex}”</p>
                <SpeakButton text={it.ex} className="shrink-0" />
              </div>
            )}

            <SpeakPractice target={it.term} />
          </Card>
        ))}
      </div>
    </main>
  );
}
