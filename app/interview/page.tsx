import { getStacks } from "@/lib/wordData";
import Interviewer from "@/components/Interviewer";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function InterviewPage() {
  const stacks = getStacks();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🎤"
        title="AI 模拟面试"
        subtitle="选择技术栈与难度，AI 面试官用英文提问，你可用中文或英文作答；结束生成中英双语分析报告。"
      />
      <Interviewer stacks={stacks} />
    </main>
  );
}
