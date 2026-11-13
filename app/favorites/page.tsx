"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WordSeed } from "@/types";
import { loadFavorites, removeFavorite, favKey, type Fav } from "@/lib/favorites";
import SpeakButton from "@/components/SpeakButton";
import FrequencyBadge from "@/components/FrequencyBadge";
import { Card, PageHeader, EmptyState, Btn } from "@/components/ui";

type Row = Fav & { word?: WordSeed };

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function FavoritesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [stackNames, setStackNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/stacks`, { cache: "no-store" })
      .then((r) => r.json())
      .then((arr: { slug: string; name: string }[]) => {
        const m: Record<string, string> = {};
        (arr ?? []).forEach((s) => (m[s.slug] = s.name));
        setStackNames(m);
      })
      .catch(() => {});

    const favs = loadFavorites();
    if (favs.length === 0) {
      setRows([]);
      setLoaded(true);
      return;
    }
    const terms = [...new Set(favs.map((f) => f.term))];
    fetch(`/api/words?terms=${encodeURIComponent(terms.join(","))}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: { word: WordSeed }[] }) => {
        const map = new Map<string, WordSeed>();
        (d.items ?? []).forEach((it) => map.set(String(it.word.term), it.word));
        setRows(favs.map((f) => ({ ...f, word: map.get(f.term) })));
        setLoaded(true);
      })
      .catch(() => {
        setRows(favs.map((f) => ({ ...f })));
        setLoaded(true);
      });
  }, []);

  function remove(stackSlug: string, term: string) {
    removeFavorite(stackSlug, term);
    setRows(rows.filter((r) => !(r.stackSlug === stackSlug && r.term === term)));
  }

  function exportAs(kind: "md" | "csv" | "anki") {
    const stem = `codelex-vocab-${new Date().toISOString().slice(0, 10)}`;
    if (kind === "md") {
      const lines = [
        `# 我的 CodeLex 生词本（${rows.length} 词）`,
        "",
        "| 单词 | 音标 | 词性 | 释义 | 例句 | 技术栈 |",
        "| --- | --- | --- | --- | --- | --- |",
        ...rows.map((r) => {
          const w = r.word;
          const ex = w?.exampleSentences?.[0] || w?.exampleSentence || "";
          return `| ${r.term} | ${w?.phonetic || ""} | ${w?.pos || ""} | ${w?.defCn || ""} | ${ex} | ${stackNames[r.stackSlug] || r.stackSlug} |`;
        }),
      ];
      download(`${stem}.md`, lines.join("\n"), "text/markdown");
    } else if (kind === "csv") {
      const head = ["term", "phonetic", "pos", "defCn", "defEn", "example", "stack"];
      const lines = [
        head.join(","),
        ...rows.map((r) => {
          const w = r.word;
          const ex = (w?.exampleSentences?.join(" | ") || w?.exampleSentence || "").replace(/\n/g, " ");
          return [
            r.term,
            w?.phonetic || "",
            w?.pos || "",
            w?.defCn || "",
            w?.defEn || "",
            ex,
            stackNames[r.stackSlug] || r.stackSlug,
          ].map(csvCell).join(",");
        }),
      ];
      download(`${stem}.csv`, "﻿" + lines.join("\n"), "text/csv");
    } else {
      const lines = rows.map((r) => {
        const w = r.word;
        const ex = w?.exampleSentences?.[0] || w?.exampleSentence || "";
        return [r.term, w?.defCn || "", ex].join("\t");
      });
      download(`${stem}.txt`, lines.join("\n"), "text/plain");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <PageHeader
        back="/"
        icon="⭐"
        title="我的收藏"
        subtitle="收藏的单词保存在本机浏览器，可随时复习、朗读或导出。"
        actions={
          rows.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={() => exportAs("anki")}>导出 Anki</Btn>
              <Btn variant="ghost" onClick={() => exportAs("csv")}>CSV</Btn>
              <Btn variant="ghost" onClick={() => exportAs("md")}>Markdown</Btn>
            </div>
          ) : undefined
        }
      />

      {loaded && rows.length === 0 ? (
        <EmptyState
          title="还没有收藏"
          desc="在背词或读文章时点 ☆ 即可加入收藏，之后可一键导出复习。"
          action={<Btn href="/">去背词</Btn>}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const sentences = r.word
              ? r.word.exampleSentences?.length
                ? r.word.exampleSentences
                : r.word.exampleSentence
                ? [r.word.exampleSentence]
                : []
              : [];
            return (
              <li key={`${r.stackSlug}-${r.term}-${i}`}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-lg font-semibold text-emerald-300">
                        {r.term}
                      </span>
                      {r.word?.pos && <span className="text-xs text-slate-500">{r.word.pos}</span>}
                      <SpeakButton text={r.term} />
                    </div>
                    <div className="flex items-center gap-3">
                      {r.word?.frequency && (
                        <FrequencyBadge frequency={r.word.frequency} size="md" showDot />
                      )}
                      <button
                        type="button"
                        onClick={() => remove(r.stackSlug, r.term)}
                        className="text-sm text-slate-500 transition hover:text-rose-400"
                      >
                        取消收藏
                      </button>
                    </div>
                  </div>
                  {r.word?.defCn && <p className="mt-1 text-slate-200">{r.word.defCn}</p>}
                  {r.word?.defEn && <p className="mt-0.5 text-sm text-slate-500">{r.word.defEn}</p>}
                  {sentences.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {sentences.map((s, si) => (
                        <li key={si} className="flex items-start gap-2 text-sm italic text-slate-300">
                          <span>“{s}”</span>
                          <SpeakButton text={s} className="mt-0.5 shrink-0" />
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 text-xs text-slate-500">
                    {stackNames[r.stackSlug] || r.stackSlug}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
