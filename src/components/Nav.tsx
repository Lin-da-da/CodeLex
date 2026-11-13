"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { usePrefs } from "@/components/PrefsProvider";

type NavLink = { href: string; label: string; icon: string };
type NavGroup = { title: string; items: NavLink[] };

/**
 * 一级导航（最核心）：每日学习闭环 + 面试实战。
 * 顺序即用户日常动线：今日任务 → 测验 → 复习 → 听说训练 → 口语 → 模拟面试。
 */
const PRIMARY: NavLink[] = [
  { href: "/daily", label: "每日", icon: "📅" },
  { href: "/quiz", label: "测验", icon: "🧪" },
  { href: "/review", label: "复习", icon: "🔁" },
  { href: "/drills", label: "训练", icon: "🎧" },
  { href: "/interview-kit", label: "口语", icon: "🗣️" },
  { href: "/interview", label: "模面", icon: "🎤" },
];

/**
 * 二级导航：按用途分组收进「更多」下拉，避免导航条过长挤压搜索框与账号区。
 *  - 内容与专项：读 / 发音 / 写作 / 岗位词，偏「资料 + 专项技能」。
 *  - 进度与管理：错题 / 计划 / 路径 / 统计 / 收藏，偏「个人数据与学习管理」。
 */
const MORE_GROUPS: NavGroup[] = [
  {
    title: "内容与专项",
    items: [
      { href: "/articles", label: "技术文章", icon: "📚" },
      { href: "/pronunciation", label: "易错发音", icon: "🔊" },
      { href: "/writing", label: "英文写作", icon: "✍️" },
      { href: "/roles", label: "岗位词包", icon: "💼" },
    ],
  },
  {
    title: "进度与管理",
    items: [
      { href: "/mistakes", label: "错题集", icon: "🧯" },
      { href: "/plan", label: "冲刺计划", icon: "🎯" },
      { href: "/path", label: "学习路径", icon: "🗺️" },
      { href: "/stats", label: "学习统计", icon: "📊" },
      { href: "/favorites", label: "我的收藏", icon: "⭐" },
    ],
  },
];

const ALL: NavLink[] = [...PRIMARY, ...MORE_GROUPS.flatMap((g) => g.items)];

export default function Nav() {
  const { user, signOut } = useAuth();
  const { showEn, toggleEn } = usePrefs();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const moreActive = MORE_GROUPS.some((g) => g.items.some((n) => isActive(n.href)));

  /* 点击外部或按 Esc 收起「更多」下拉 */
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-2.5">
        <Link href="/" className="flex items-center gap-1.5 font-bold tracking-tight">
          <span className="text-emerald-400">◆</span> CodeLex
        </Link>

        <form action="/search" method="get" className="hidden md:block">
          <input
            name="q"
            placeholder="搜索单词…"
            className="input w-44 py-1.5"
          />
        </form>

        <div className="ml-1 hidden flex-1 items-center justify-between gap-1 lg:flex">
          {PRIMARY.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm transition ${
                isActive(n.href)
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              }`}
            >
              <span className="text-base leading-none">{n.icon}</span>
              {n.label}
            </Link>
          ))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={open}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm transition hover:bg-slate-800/60 ${
                open
                  ? "bg-slate-800/60 text-slate-100"
                  : moreActive
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              更多 ▾
            </button>
            {open && (
              <div className="animate-fade-up absolute right-0 top-full z-40 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl shadow-black/40">
                {MORE_GROUPS.map((g, gi) => (
                  <div
                    key={g.title}
                    className={gi > 0 ? "mt-1 border-t border-slate-800 pt-1" : ""}
                  >
                    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {g.title}
                    </p>
                    {g.items.map((n) => (
                      <Link
                        key={n.href}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                          isActive(n.href)
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                        }`}
                      >
                        <span className="text-base leading-none">{n.icon}</span>
                        {n.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggleEn}
            title="切换英文释义显示"
            className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
              showEn
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            中 / EN
          </button>
          {user ? (
            <>
              <span className="hidden max-w-[10rem] truncate text-xs text-slate-500 sm:inline">
                {user.username}
              </span>
              <button
                onClick={signOut}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-500"
              >
                退出
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
            >
              登录
            </Link>
          )}
        </div>
      </nav>
      {/* 移动端 / 平板：横向滚动的功能条，收纳全部入口 */}
      <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
        {ALL.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`whitespace-nowrap rounded-lg px-2 py-1 text-sm transition ${
              isActive(n.href)
                ? "bg-emerald-500/10 text-emerald-300"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
            }`}
          >
            {n.icon} {n.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
