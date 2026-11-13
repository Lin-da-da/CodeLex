"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TechStack } from "@/types";
import { PageHeader, Btn } from "@/components/ui";

export default function QuizSetup({ stacks }: { stacks: TechStack[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(stacks.map((s) => s.slug));

  function toggle(slug: string) {
    setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug]));
  }

  function start() {
    if (picked.length === 0) return;
    router.push(`/quiz?stacks=${picked.join(",")}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <PageHeader
        back="/"
        icon="🧪"
        title="测验 · 选择题库"
        subtitle="可单选或多选技术栈；所选词库会合并后随机抽题（共 10 题）。"
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {stacks.map((s) => {
          const on = picked.includes(s.slug);
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => toggle(s.slug)}
              className={`card card-hover flex items-center gap-3 p-4 text-left ${
                on ? "!border-emerald-500 bg-emerald-900/30" : ""
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="flex-1">
                <span className="block font-semibold text-slate-100">{s.name}</span>
                <span className="block text-xs text-slate-500">{s.description}</span>
              </span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded border text-xs transition ${
                  on
                    ? "border-emerald-400 bg-emerald-500 text-slate-950"
                    : "border-slate-600"
                }`}
              >
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Btn onClick={start} disabled={picked.length === 0}>
          开始测验（已选 {picked.length} 个题库）
        </Btn>
        <Btn variant="ghost" onClick={() => setPicked([])}>
          清空
        </Btn>
        <Btn variant="ghost" onClick={() => setPicked(stacks.map((s) => s.slug))}>
          全选
        </Btn>
      </div>
    </main>
  );
}
