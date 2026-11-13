"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { WordSeed } from "@/types";
import { usePrefs } from "@/components/PrefsProvider";
import SpeakButton from "@/components/SpeakButton";
import { Btn, Card, EmptyState, SectionTitle, Tag } from "@/components/ui";

/** 岗位词包（data/roles.json 的一条记录）。 */
export interface RolePack {
  slug: string;
  name: string;
  icon: string;
  level: string;
  jdEn: string;
  jdCn: string;
  stacks: string[];
  terms: string[];
}

/** 运行时按需取回的释义（页面只下发 term 列表，避免把词库塞进 HTML）。 */
interface WordDetail {
  term: string;
  phonetic?: string | null;
  defCn: string;
  defEn?: string | null;
}

/**
 * 进入某个岗位时一次性批量拉取该岗位全部词条释义，按岗位缓存；
 * 之后切换岗位不会再重复请求，也不会每个词单独打接口。
 */
async function fetchDetails(terms: string[]): Promise<Record<string, WordDetail>> {
  const map: Record<string, WordDetail> = {};
  if (terms.length === 0) return map;
  const res = await fetch(`/api/words?terms=${encodeURIComponent(terms.join(","))}`, {
    cache: "no-store",
  });
  if (!res.ok) return map;
  const data: { items?: { word: WordSeed }[] } = await res.json();
  for (const it of data.items ?? []) {
    const w = it.word;
    map[String(w.term).toLowerCase()] = {
      term: String(w.term),
      phonetic: w.phonetic ?? null,
      defCn: w.defCn ?? "",
      defEn: w.defEn ?? null,
    };
  }
  return map;
}

export default function RolesClient({ roles }: { roles: RolePack[] }) {
  const { showEn } = usePrefs();
  const [active, setActive] = useState<string>(roles[0]?.slug ?? "");
  const [q, setQ] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  /** slug -> 小写 term -> 释义 */
  const [cache, setCache] = useState<Record<string, Record<string, WordDetail>>>({});
  const [loading, setLoading] = useState(false);

  const role = useMemo(() => roles.find((r) => r.slug === active), [roles, active]);
  const detailMap = cache[active] ?? {};

  // 选中岗位（或首次进入）时批量拉取释义，结果按岗位缓存
  useEffect(() => {
    if (!role || cache[role.slug] || role.terms.length === 0) return;
    let alive = true;
    setLoading(true);
    fetchDetails(role.terms)
      .then((map) => {
        if (!alive) return;
        setCache((prev) => ({ ...prev, [role.slug]: map }));
      })
      .catch(() => {
        /* 拉取失败时保持术语可见，只是释义为空 */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [role, cache]);

  // 切换岗位时清空搜索与展开状态
  useEffect(() => {
    setQ("");
    setRevealed(new Set());
  }, [active]);

  const items = useMemo(() => {
    if (!role) return [];
    const t = q.trim().toLowerCase();
    return role.terms
      .map((term) => ({ term, detail: detailMap[term.toLowerCase()] }))
      .filter(({ term, detail }) => {
        if (!t) return true;
        return (
          term.toLowerCase().includes(t) ||
          (detail?.defCn ?? "").toLowerCase().includes(t) ||
          (detail?.defEn ?? "").toLowerCase().includes(t)
        );
      });
  }, [role, q, detailMap]);

  function toggle(term: string) {
    const key = term.toLowerCase();
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function revealAll() {
    setRevealed(new Set(items.map((i) => i.term.toLowerCase())));
  }

  function hideAll() {
    setRevealed(new Set());
  }

  function exportCheatSheet() {
    if (!role) return;
    const lines = [
      `# ${role.name} · 英文速查表`,
      "",
      `共 ${items.length} 词 · 由 CodeLex 生成`,
      "",
      `> ${role.jdEn}`,
      "",
      "| 单词 | 音标 | 中文 |",
      "| --- | --- | --- |",
    ];
    for (const it of items) {
      lines.push(
        `| ${it.term} | ${it.detail?.phonetic ? `/${it.detail.phonetic}/` : ""} | ${(
          it.detail?.defCn ?? ""
        ).replace(/\|/g, "\\|")} |`
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${role.slug}-cheatsheet.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allRevealed = items.length > 0 && revealed.size >= items.length;

  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((r) => {
          const on = r.slug === active;
          return (
            <li key={r.slug}>
              <button
                type="button"
                onClick={() => setActive(r.slug)}
                aria-pressed={on}
                className="w-full text-left"
              >
                <Card
                  hover
                  className={`p-4 ${on ? "border-emerald-600/60 bg-emerald-500/5" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{r.icon}</span>
                    <span
                      className={`text-sm font-semibold ${
                        on ? "text-emerald-300" : "text-slate-200"
                      }`}
                    >
                      {r.name}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{r.level}</span>
                    <span className="tabular-nums">{r.terms.length} 词</span>
                  </div>
                </Card>
              </button>
            </li>
          );
        })}
      </ul>

      {!role ? (
        <div className="mt-8">
          <EmptyState title="暂无岗位词包" desc="data/roles.json 里还没有配置任何岗位。" />
        </div>
      ) : (
        <div className="mt-8 animate-fade-up">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl">{role.icon}</span>
              <h2 className="text-lg font-semibold text-slate-100">{role.name}</h2>
              <span className="text-xs text-slate-500">{role.level}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">{role.jdEn}</p>
            <p className="mt-2 text-sm leading-7 text-slate-400">{role.jdCn}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">涉及技术栈</span>
              {role.stacks.map((s) => (
                <Tag key={s} active>
                  {s}
                </Tag>
              ))}
            </div>
          </Card>

          <div className="mt-7">
            <SectionTitle hint={`${items.length} / ${role.terms.length} 词`}>
              必背词条
            </SectionTitle>

            <div className="flex flex-wrap items-center gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="过滤岗位内单词 / 释义…"
                className="input max-w-sm"
              />
              <button
                type="button"
                onClick={allRevealed ? hideAll : revealAll}
                className="btn btn-ghost px-3 py-1.5 text-xs"
              >
                {allRevealed ? "全部收起" : "全部展开"}
              </button>
              <Btn
                onClick={exportCheatSheet}
                variant="ghost"
                className="px-3 py-1.5 text-xs"
              >
                ⬇ 导出速查表
              </Btn>
              {loading && <span className="text-xs text-slate-500">正在加载释义…</span>}
            </div>

            {items.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="没有匹配的单词" desc="换个关键词试试，或清空搜索框。" />
              </div>
            ) : (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(({ term, detail }) => {
                  const open = revealed.has(term.toLowerCase());
                  return (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => toggle(term)}
                        aria-expanded={open}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                          open
                            ? "border-emerald-600/60 bg-emerald-500/5"
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono font-semibold text-emerald-300">
                            {term}
                          </span>
                          {detail?.phonetic && (
                            <span className="shrink-0 text-xs text-slate-500">
                              /{detail.phonetic}/
                            </span>
                          )}
                        </div>
                      </button>

                      {open && (
                        <div className="-mt-1 rounded-b-xl border border-t-0 border-emerald-600/40 bg-emerald-500/5 px-3.5 pb-2.5 pt-2">
                          <p className="text-sm text-slate-100">{detail?.defCn || "—"}</p>
                          {showEn && detail?.defEn && (
                            <p className="mt-1 text-xs text-slate-400">{detail.defEn}</p>
                          )}
                          <div className="mt-1.5 flex items-center gap-3">
                            <SpeakButton text={term} />
                            <Link
                              href={`/word/${encodeURIComponent(term)}`}
                              className="text-xs text-emerald-400 hover:underline"
                            >
                              详情 →
                            </Link>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
