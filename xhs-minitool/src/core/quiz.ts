/** 测验：本地组卷（替代网页版 /api/quiz），算法与参数保持一致。 */
import { liteAt, stackRange, type Lite } from "./data";

export interface QA {
  word: Lite;
  options: string[];
  answer: string;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/** 抽取题池：所选栈的全部词条，按 term 去重（与网页版一致） */
export function buildPool(slugs: string[], limit: number): Lite[] {
  const seen: Record<string, boolean> = {};
  const out: Lite[] = [];
  for (let s = 0; s < slugs.length; s++) {
    const [start, end] = stackRange(slugs[s]);
    for (let i = start; i < end; i++) {
      const l = liteAt(i);
      const k = l.term.toLowerCase();
      if (seen[k]) continue;
      seen[k] = true;
      out.push(l);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function makeQuestions(pool: Lite[], count: number): QA[] {
  const src = pool.length ? pool : [];
  const picked = shuffle(src).slice(0, Math.min(count, src.length));
  return picked.map((word) => {
    const correct = word.defCn;
    const distractors: string[] = [];
    const cand = shuffle(src);
    for (let i = 0; i < cand.length && distractors.length < 3; i++) {
      const w = cand[i];
      if (w === word || w.defCn === correct) continue;
      distractors.push(w.defCn);
    }
    const opts = distractors.slice();
    while (opts.length < 3) opts.push("—");
    return { word, options: shuffle([correct].concat(opts)), answer: correct };
  });
}
