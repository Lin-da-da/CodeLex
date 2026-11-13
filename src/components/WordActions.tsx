"use client";

import { useState } from "react";
import { ensureScheduled, loadReview, saveReview } from "@/lib/srs";
import { useFavorites } from "@/lib/favorites";

/** 词条操作：收藏 + 加入复习队列（本地保存）。可在服务端页面中作为客户端组件嵌入。 */
export default function WordActions({
  stackSlug,
  term,
  size = "md",
}: {
  stackSlug: string;
  term: string;
  size?: "sm" | "md";
}) {
  const { toggle, has } = useFavorites();
  const [added, setAdded] = useState(false);
  const fav = has(stackSlug, term);

  function addReview() {
    const ns = ensureScheduled(loadReview(), stackSlug, term);
    saveReview(ns);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  const cls =
    size === "sm"
      ? "rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
      : "btn btn-ghost";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => toggle(stackSlug, term)} className={cls}>
        {fav ? "★ 已收藏" : "☆ 收藏"}
      </button>
      <button
        type="button"
        onClick={addReview}
        className={cls}
        disabled={added}
      >
        {added ? "✓ 已加入复习" : "＋ 加入复习"}
      </button>
    </div>
  );
}
