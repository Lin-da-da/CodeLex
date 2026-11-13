import { getStacks } from "@/lib/wordData";
import ReviewQueue from "@/components/ReviewQueue";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  // 只下发技术栈清单（slug/name），词条详情在复习时按需通过 /api/words 取回，
  // 避免把数千条词库序列化进 HTML 首屏。
  const stacks = getStacks().map((s) => ({ slug: s.slug, name: s.name, icon: s.icon }));
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🔁"
        title="复习队列（SRS）"
        subtitle="基于间隔重复（SM-2）的复习；评级后自动排期，数据本地保存无需登录。"
      />
      <div className="mt-6">
        <ReviewQueue stacks={stacks} />
      </div>
    </main>
  );
}
