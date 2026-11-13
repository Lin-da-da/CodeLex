import { getStacks } from "@/lib/wordData";
import PlanClient from "@/components/PlanClient";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function PlanPage() {
  const stacks = getStacks().map((s) => ({ slug: s.slug, name: s.name, icon: s.icon }));

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🎯"
        title="面试冲刺计划"
        subtitle="设定面试日期，自动生成每天该练什么：按「词汇筑基 → 阅读进阶 → 口语输出 → 模面冲刺」四阶段倒排任务，勾选即记录。"
      />
      <PlanClient stacks={stacks} />
    </main>
  );
}
