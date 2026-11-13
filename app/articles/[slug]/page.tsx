import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getArticle,
  getBilingualParagraphs,
  detectLang,
  CATEGORY_MAP,
} from "@/lib/articles";
import { getWordsByStack, getStack } from "@/lib/wordData";
import ArticleReader from "@/components/ArticleReader";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug);
  if (!article) notFound();
  const words = getWordsByStack(article.stackSlug);
  const stack = getStack(article.stackSlug);
  const cat = article.category ? CATEGORY_MAP[article.category] : undefined;
  const paragraphs = getBilingualParagraphs(article);
  const lang = detectLang(article.contentMd);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <PageHeader
        back="/articles"
        icon="📚"
        title={article.title}
        subtitle={(article as { titleCn?: string }).titleCn}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        {stack && (
          <Link
            href={`/stacks/${stack.slug}`}
            className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300 transition hover:border-emerald-500"
          >
            {stack.icon} {stack.name}
          </Link>
        )}
        {cat && (
          <Link
            href={`/articles?category=${article.category}`}
            className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300 transition hover:border-emerald-500"
          >
            {cat.icon} {cat.name}
          </Link>
        )}
        <span className="rounded-full border border-slate-800 px-2.5 py-1 text-slate-500">
          难度 {article.difficulty}
        </span>
        {article.license && (
          <span className="rounded-full border border-slate-800 px-2.5 py-1 text-slate-500">
            {article.license}
          </span>
        )}
      </div>

      <Card className="p-6">
        <ArticleReader
          paragraphs={paragraphs}
          lang={lang}
          words={words}
          stackSlug={article.stackSlug}
          articleSlug={article.slug}
        />
      </Card>
    </main>
  );
}
