import { getSupabase } from "./supabase";
import type { ReviewItem } from "./srs";

export interface UserWordSets {
  known: string[];
  unknown: string[];
  favorites: string[];
}

/** 从 Supabase 拉取复习状态，合并为本地所用的 key->item 映射 */
export async function loadReviewFromSupabase(
  userId: string
): Promise<Record<string, ReviewItem>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data } = await sb
    .from("review_records")
    .select("stack_slug,term,ease,interval,due,reps")
    .eq("user_id", userId);
  const out: Record<string, ReviewItem> = {};
  for (const r of (data ?? []) as any[]) {
    out[`${r.stack_slug}::${r.term}`] = {
      stackSlug: r.stack_slug,
      term: r.term,
      ease: r.ease,
      interval: r.interval,
      due: r.due,
      reps: r.reps,
    };
  }
  return out;
}

export async function upsertReview(userId: string, items: ReviewItem[]) {
  const sb = getSupabase();
  if (!sb || items.length === 0) return;
  await sb.from("review_records").upsert(
    items.map((i) => ({
      user_id: userId,
      stack_slug: i.stackSlug,
      term: i.term,
      ease: i.ease,
      interval: i.interval,
      due: i.due,
      reps: i.reps,
    })),
    { onConflict: "user_id,stack_slug,term" }
  );
}

export async function loadUserWords(userId: string): Promise<UserWordSets> {
  const sb = getSupabase();
  const empty: UserWordSets = { known: [], unknown: [], favorites: [] };
  if (!sb) return empty;
  const { data } = await sb
    .from("user_words")
    .select("term,status")
    .eq("user_id", userId);
  const res: UserWordSets = { known: [], unknown: [], favorites: [] };
  for (const r of (data ?? []) as any[]) {
    if (r.status === "mastered") res.known.push(r.term);
    else if (r.status === "unknown") res.unknown.push(r.term);
    else if (r.status === "favorite") res.favorites.push(r.term);
  }
  return res;
}

export async function upsertUserWord(
  userId: string,
  term: string,
  status: "mastered" | "unknown" | "favorite"
) {
  const sb = getSupabase();
  if (!sb) return;
  await sb
    .from("user_words")
    .upsert({ user_id: userId, term, status }, { onConflict: "user_id,term" });
}

export async function insertQuizResult(
  userId: string,
  quizType: string,
  score: number,
  total: number,
  wrong: string[]
) {
  const sb = getSupabase();
  if (!sb) return;
  await sb
    .from("quiz_results")
    .insert({ user_id: userId, quiz_type: quizType, score, total, wrong_terms: wrong });
}

export async function insertArticleMark(
  userId: string,
  articleSlug: string,
  term: string,
  stackSlug: string
) {
  const sb = getSupabase();
  if (!sb) return;
  await sb
    .from("article_marks")
    .insert({ user_id: userId, article_slug: articleSlug, term, stack_slug: stackSlug });
}
