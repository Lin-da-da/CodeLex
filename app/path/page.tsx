import PathClient from "@/components/PathClient";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function PathPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🗺️"
        title="学习路径"
        subtitle="四个阶段逐级通关：L1 掌握 300 个高频词 → L2 精读 20 篇文章 → L3 完成 50 次听说练习 → L4 打完 3 场模拟面试。每个阶段的进度都由你的真实学习数据判定。"
      />
      <PathClient />
    </main>
  );
}
