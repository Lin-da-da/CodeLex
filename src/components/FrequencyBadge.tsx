import type { Frequency } from "@/types";
import { FREQUENCY_LABEL } from "@/types";

/**
 * 频率分层徽章：高频 / 中频 / 低频使用不同颜色区分。
 * 配色遵循「越重要越醒目」的层级：高频=玫红(必背)，中频=琥珀(巩固)，低频=青灰(拓展)。
 */
const STYLES: Record<Frequency, { chip: string; dot: string }> = {
  high: {
    chip: "border-rose-500/40 bg-rose-500/15 text-rose-300 hover:border-rose-400/60",
    dot: "bg-rose-400",
  },
  mid: {
    chip: "border-amber-500/40 bg-amber-500/15 text-amber-300 hover:border-amber-400/60",
    dot: "bg-amber-400",
  },
  low: {
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-300 hover:border-sky-400/50",
    dot: "bg-sky-400",
  },
};

export const FREQUENCY_STYLE = STYLES;

export default function FrequencyBadge({
  frequency,
  size = "sm",
  showDot = false,
}: {
  frequency?: Frequency | string | null;
  /** sm：紧凑标签；md：带圆点的完整标签 */
  size?: "sm" | "md";
  showDot?: boolean;
}) {
  if (!frequency) return null;
  const f = frequency as Frequency;
  const style = STYLES[f];
  if (!style) return null;

  const label = FREQUENCY_LABEL[f] ?? frequency;

  if (size === "sm") {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${style.chip}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none ${style.chip}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />}
      {label}
    </span>
  );
}
