export interface TechStack {
  slug: string;
  name: string;
  description: string;
  icon: string;
  order: number;
}

/**
 * 词库条目（种子数据格式）。
 * 与 docs/word-data-spec.md 保持一致；生产入库时映射为 Prisma Word 模型。
 */
export type Frequency = "high" | "mid" | "low";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  high: "面试高频",
  mid: "中频",
  low: "低频",
};

export interface WordSeed {
  /** 英文单词 / 短语，必填，唯一（同栈内不重复） */
  term: string;
  /** 音标（IPA），可空 */
  phonetic?: string | null;
  /** 词性：n. / v. / adj. / adv. / phr. 等，可空 */
  pos?: string | null;
  /** 中文释义，必填 */
  defCn: string;
  /** 英文释义，可空 */
  defEn?: string | null;
  /** 代码示例（代码片段），可空；入库为 codeExample */
  codeExample?: string | null;
  /** 合适、地道的语境短句（必填，产品硬性要求） */
  exampleSentence?: string | null;
  /** 多条语境短句（推荐 2-4 句），可空；渲染时优先于 exampleSentence */
  exampleSentences?: string[];
  /** 标签数组（小写），可空 */
  tags?: string[];
  /** 难度 1-5，可空（默认 3） */
  difficulty?: number;
  /** 面试频率分层：high=面试高频，mid=中频，low=低频（必填） */
  frequency?: Frequency;
}
