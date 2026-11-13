import type { WordSeed } from "@/types";

/**
 * 背词卡片用的轻量词条。
 * 背词流程只需要术语、音标、词性、释义、例句与频率；
 * 代码示例与标签在背词场景用不到，去掉可显著减小首屏 payload。
 */
export interface LearnWord {
  term: string;
  phonetic?: string | null;
  pos?: string | null;
  defCn: string;
  defEn?: string | null;
  codeExample?: string | null;
  exampleSentence?: string | null;
  exampleSentences?: string[];
  frequency?: WordSeed["frequency"];
  difficulty?: number;
}

export function toLearnWord(w: WordSeed): LearnWord {
  return {
    term: w.term,
    phonetic: w.phonetic ?? null,
    pos: w.pos ?? null,
    defCn: w.defCn,
    defEn: w.defEn ?? null,
    codeExample: w.codeExample ?? null,
    exampleSentence: w.exampleSentence ?? null,
    exampleSentences: w.exampleSentences,
    frequency: w.frequency,
    difficulty: w.difficulty,
  };
}
