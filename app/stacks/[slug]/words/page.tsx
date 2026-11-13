import { notFound } from "next/navigation";
import { getStack, getWordsByStack } from "@/lib/wordData";
import StackWordBrowser, {
  type WordBrowseItem,
} from "@/components/StackWordBrowser";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * 技术栈全量词表（快速浏览）：
 * 默认只下发 term / phonetic / 释义，去掉 codeExample、tags、例句等大字段，
 * 控制首屏 payload；中文释义由客户端点击后展开。
 */
export default function StackWordsBrowserPage({
  params,
}: {
  params: { slug: string };
}) {
  const stack = getStack(params.slug);
  if (!stack) notFound();

  const words: WordBrowseItem[] = getWordsByStack(params.slug).map((w) => ({
    term: w.term,
    phonetic: w.phonetic ?? null,
    defCn: w.defCn,
    defEn: w.defEn ?? null,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <PageHeader
        back={`/stacks/${params.slug}`}
        icon={stack.icon}
        title={`${stack.name} · 全量词表`}
        subtitle={`${words.length} 个单词 · 仅显示单词与音标，点击单词查看中文释义`}
      />
      <StackWordBrowser stackName={stack.name} words={words} />
    </main>
  );
}
