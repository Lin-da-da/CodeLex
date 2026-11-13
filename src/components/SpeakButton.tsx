"use client";

import { speak, stopSpeak } from "@/lib/tts";

export default function SpeakButton({
  text,
  lang = "en-US",
  title = "朗读",
  className = "",
}: {
  text: string;
  lang?: string;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => speak(text, lang)}
      onDoubleClick={stopSpeak}
      title={title}
      aria-label={title}
      className={`rounded px-2 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-emerald-300 ${className}`}
    >
      🔊
    </button>
  );
}
