"use client";

import { useEffect, useState } from "react";
import { migrateKey, sk } from "./scope";

export interface Fav {
  stackSlug: string;
  term: string;
}

const KEY = "codelex:favorites";

/** 收藏上限：防止极端情况下（逐词收藏）撑爆 localStorage 配额。 */
const MAX = 2000;

export function favKey(stackSlug: string, term: string): string {
  return `${stackSlug}::${term}`;
}

export function loadFavorites(): Fav[] {
  if (typeof window === "undefined") return [];
  try {
    migrateKey(KEY);
    const raw = localStorage.getItem(sk(KEY));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as Fav[]) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favs: Fav[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(sk(KEY), JSON.stringify(favs.slice(-MAX)));
  } catch {
    /* 配额不足时静默失败，不影响主流程 */
  }
}

export function removeFavorite(stackSlug: string, term: string) {
  const cur = loadFavorites();
  const k = favKey(stackSlug, term);
  const next = cur.filter((f) => favKey(f.stackSlug, f.term) !== k);
  saveFavorites(next);
  return next;
}

export function useFavorites() {
  const [favs, setFavs] = useState<Fav[]>([]);

  useEffect(() => {
    setFavs(loadFavorites());
  }, []);

  function toggle(stackSlug: string, term: string) {
    const cur = loadFavorites();
    const k = favKey(stackSlug, term);
    const exists = cur.some((f) => favKey(f.stackSlug, f.term) === k);
    const next = exists
      ? cur.filter((f) => favKey(f.stackSlug, f.term) !== k)
      : [...cur, { stackSlug, term }];
    saveFavorites(next);
    setFavs(next);
  }

  function has(stackSlug: string, term: string): boolean {
    const k = favKey(stackSlug, term);
    return favs.some((f) => favKey(f.stackSlug, f.term) === k);
  }

  return { favs, toggle, has };
}
