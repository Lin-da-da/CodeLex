import type { WordSeed } from "@/types";

/**
 * 测验用的轻量词条。
 * 测验只需要术语、音标与中文释义；把完整词条（含代码示例、标签、全部例句）
 * 序列化给客户端在万级词库下会产生数 MB 的 payload，这里只下发必要字段。
 */
export interface QuizWord {
  term: string;
  phonetic?: string | null;
  defCn: string;
  frequency?: WordSeed["frequency"];
  /** 该词所属技术栈 slug；用于错题集弱项分布（即使跨多栈测验也能定位栈）。 */
  stack?: string;
}

export function toQuizWord(w: WordSeed, stackSlug?: string): QuizWord {
  return {
    term: w.term,
    phonetic: w.phonetic ?? null,
    defCn: w.defCn,
    frequency: w.frequency,
    stack: stackSlug,
  };
}

/** Fisher–Yates 洗牌（原地，返回新数组）。 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
