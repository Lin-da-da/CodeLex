import { notFound } from "next/navigation";
import { getStack, getWordsByStack } from "@/lib/wordData";
import { toLearnWord } from "@/lib/learn";
import LearnClient from "@/components/LearnClient";

export const dynamic = "force-dynamic";

export default function LearnPage({ params }: { params: { slug: string } }) {
  const stack = getStack(params.slug);
  if (!stack) notFound();
  const all = getWordsByStack(params.slug);
  // 背词只用轻量字段，避免把代码示例/标签序列化进首屏 HTML
  const words = all.map(toLearnWord);
  return <LearnClient stack={stack} words={words} />;
}
