import WritingClient from "@/components/WritingClient";
import { PageHeader } from "@/components/ui";
import { getWriting } from "@/lib/writing";

export const dynamic = "force-dynamic";

export default function WritingPage() {
  const items = getWriting();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <PageHeader
        back="/"
        icon="✍️"
        title="英文技术写作"
        subtitle="可直接套用的 PR、commit、code review、design doc 与进度同步英文模板。"
      />
      <WritingClient items={items} />
    </main>
  );
}
