"use client";

import { useEffect, useRef, useState } from "react";
import type { ReviewItem, ReviewState } from "./srs";
import { loadReview, saveReview } from "./srs";
import { loadReviewFromSupabase, upsertReview } from "./userData";
import { useAuth } from "@/components/AuthProvider";

/**
 * 统一的复习状态 Hook：
 * - 未配置/未登录 Supabase 时，仅使用本地 localStorage。
 * - 已登录时，挂载时把「远端 + 本地」合并（远端优先），每次变更同时写本地并 upsert 远端。
 */
export function useReviewState() {
  const { user } = useAuth();
  const [state, setState] = useState<ReviewState>({});
  const [ready, setReady] = useState(false);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadReview();
      let merged: ReviewState = local;
      if (user) {
        const remote = await loadReviewFromSupabase(user.id);
        merged = { ...local, ...remote };
        saveReview(merged);
      }
      if (!cancelled) {
        setState(merged);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /** 提交新的复习状态，changedKeys 为本次发生变化的 key（用于增量 upsert 远端） */
  function commit(next: ReviewState, changedKeys: string[]) {
    saveReview(next);
    setState(next);
    const u = userRef.current;
    if (u && changedKeys.length) {
      const items = changedKeys
        .map((k) => next[k])
        .filter(Boolean) as ReviewItem[];
      upsertReview(u.id, items);
    }
  }

  return { state, ready, commit };
}
