import { getStacks } from "@/lib/wordData";
import Quiz from "@/components/Quiz";
import QuizSetup from "@/components/QuizSetup";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function QuizPage({
  searchParams,
}: {
  searchParams: { stacks?: string };
}) {
  const stacks = getStacks();

  // 未选择题库 → 展示选题界面（支持单选 / 多选）
  if (!searchParams?.stacks) {
    return <QuizSetup stacks={stacks} />;
  }

  const slugs = searchParams.stacks.split(",").filter(Boolean);
  const chosenNames = stacks
    .filter((s) => slugs.includes(s.slug))
    .map((s) => s.name);

  // 词条在客户端按需从 /api/quiz 拉取轻量题池，避免把全量词库塞进 HTML
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🧪"
        title="测验"
        subtitle={`${chosenNames.join(" · ") || "未知题库"} · 随机抽取 10 题`}
      />
      <div className="mt-6">
        <Quiz stacks={slugs} count={10} />
      </div>
    </main>
  );
}
