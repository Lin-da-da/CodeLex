import MistakesClient from "@/components/MistakesClient";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "错题集 · 弱项分布 · CodeLex",
  description: "汇总测验、听说训练与复习中的错题，按技术栈和来源看你的弱项分布。",
};

export default function MistakesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🧯"
        title="错题集 · 弱项分布"
        subtitle="汇总测验 / 训练 / 复习中的错题，按技术栈看你的弱项在哪"
      />
      <MistakesClient />
    </main>
  );
}
