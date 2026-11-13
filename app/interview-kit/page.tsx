import InterviewKitClient from "@/components/InterviewKitClient";
import { PageHeader } from "@/components/ui";
import { getBqItems, getFollowups, getOralScripts, getPhrases } from "@/lib/interviewKit";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "面试口语中心 · CodeLex",
  description: "程序员英文面试口语句型、60 秒概念口述脚本、行为面试 BQ 题库与三层追问链。",
};

export default function InterviewKitPage() {
  const phrases = getPhrases();
  const oral = getOralScripts();
  const bq = getBqItems();
  const followups = getFollowups();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🗣️"
        title="面试口语中心"
        subtitle={`${phrases.length} 条句型 · ${oral.length} 个概念口述脚本 · ${bq.length} 道行为面试题 · ${followups.length} 条追问链`}
      />
      <InterviewKitClient phrases={phrases} oral={oral} bq={bq} followups={followups} />
    </main>
  );
}
