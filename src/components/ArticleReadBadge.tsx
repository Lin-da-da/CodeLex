"use client";

import { useEffect, useState } from "react";
import { hasReadArticle } from "@/lib/readingLog";

/**
 * 文章列表里的「已读」标识。读状态只存在于本机 localStorage，
 * 为避免 SSR 水合不一致，组件先渲染空、挂载后再读本地状态填充。
 */
export default function ArticleReadBadge({ slug }: { slug: string }) {
  const [read, setRead] = useState(false);

  useEffect(() => {
    setRead(hasReadArticle(slug));
  }, [slug]);

  if (!read) return null;
  return (
    <span className="rounded-full border border-emerald-700 bg-emerald-900/40 px-2 py-0.5 text-emerald-300">
      ✓ 已读
    </span>
  );
}
