"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SpeakButton from "@/components/SpeakButton";
import { Btn, Card, EmptyState, Tag } from "@/components/ui";
import type { WritingItem } from "@/lib/writing";

const STORAGE_KEY = "codelex:writing:showCn";

const CATS = [
  { slug: "pr", name: "PR 描述", icon: "🔀" },
  { slug: "commit", name: "Commit Message", icon: "📝" },
  { slug: "review", name: "Code Review", icon: "🔍" },
  { slug: "design", name: "Design Doc", icon: "📐" },
  { slug: "sync", name: "进度同步", icon: "📣" },
] as const;

export default function WritingClient({ items }: { items: WritingItem[] }) {
  const [cat, setCat] = useState("");
  const [query, setQuery] = useState("");
  const [showCn, setShowCn] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setShowCn(stored !== "false");
    } catch {
      // 在受限浏览器环境中，localStorage 可能不可用。
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCat = !cat || item.cat === cat;
      const matchesQuery =
        !term || `${item.title} ${item.en} ${item.cn}`.toLowerCase().includes(term);
      return matchesCat && matchesQuery;
    });
  }, [cat, items, query]);

  function toggleChinese() {
    setShowCn((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // 无法持久化时仍保留本次会话内的偏好。
      }
      return next;
    });
  }

  async function copyTemplate(item: WritingItem) {
    await navigator.clipboard.writeText(item.en);
    setCopiedId(item.id);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedId(null), 1500);
  }

  function clearFilters() {
    setCat("");
    setQuery("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Tag as="button" active={!cat} onClick={() => setCat("")}>
          全部
        </Tag>
        {CATS.map((item) => (
          <Tag
            key={item.slug}
            as="button"
            active={cat === item.slug}
            onClick={() => setCat(item.slug)}
          >
            {item.icon} {item.name}
          </Tag>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题、英文模板或中文说明…"
          aria-label="搜索写作模板"
          className="input min-w-64 flex-1"
        />
        <span className="text-xs tabular-nums text-slate-500">{filtered.length} 条</span>
        <Btn type="button" variant="ghost" onClick={toggleChinese} className="text-xs">
          {showCn ? "隐藏中文" : "显示中文"}
        </Btn>
      </div>

      <div className="mt-6 space-y-4">
        {filtered.length === 0 ? (
          <EmptyState
            title="没有匹配的写作模板"
            desc="试试其他关键词或清除当前筛选。"
            action={
              <Btn type="button" variant="ghost" onClick={clearFilters}>
                清除筛选
              </Btn>
            }
          />
        ) : (
          filtered.map((item) => {
            const category = CATS.find((entry) => entry.slug === item.cat);
            return (
              <Card key={item.id} className="animate-fade-up p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {category && (
                      <Tag>
                        {category.icon} {category.name}
                      </Tag>
                    )}
                    <h2 className="mt-2 text-lg font-semibold text-slate-200">{item.title}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <SpeakButton text={item.en} />
                    <Btn
                      type="button"
                      variant="ghost"
                      onClick={() => void copyTemplate(item)}
                      className="px-3 py-1.5 text-xs"
                    >
                      {copiedId === item.id ? "已复制 ✓" : "复制"}
                    </Btn>
                  </div>
                </div>

                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950/70 p-4 font-mono text-sm leading-6 text-slate-200">
                  {item.en}
                </pre>

                {showCn && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <p className="text-sm leading-6 text-slate-400">{item.cn}</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
                      {item.tips.map((tip) => (
                        <li key={tip} className="flex gap-2">
                          <span className="text-emerald-400">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
