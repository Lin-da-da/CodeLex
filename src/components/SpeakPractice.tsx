"use client";

import { useEffect, useRef, useState } from "react";
import { addPractice } from "@/lib/practiceLog";

/** 归一化：去标点、转小写、压缩空白，便于比对。 */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 编辑距离（Levenshtein）。 */
function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/** 相似度 0-100：基于归一化后的编辑距离。 */
function similarity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (!x && !y) return 100;
  const max = Math.max(x.length, y.length);
  if (!max) return 100;
  return Math.max(0, Math.round((1 - lev(x, y) / max) * 100));
}

/**
 * 跟读练习：用 Web Speech API 的语音识别把用户朗读的内容转成文字，
 * 与目标文本比对给出相似度评分。浏览器不支持时给出降级提示。
 */
export default function SpeakPractice({
  target,
  lang = "en-US",
  compact = false,
}: {
  target: string;
  lang?: string;
  compact?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const recRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      setTranscript(text);
      setScore(similarity(text, target));
      setListening(false);
      // 学情埋点：一次有效跟读打分记一次（纯记录，不影响页面任何可见行为）
      if (text.trim()) addPractice("speak", target);
    };
    rec.onerror = (e: any) => {
      setError(e?.error === "not-allowed" ? "麦克风权限被拒绝" : "识别失败，请重试");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    };
  }, [target, lang]);

  function start() {
    setError("");
    setTranscript("");
    setScore(null);
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(true);
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        当前浏览器不支持语音识别（建议 Chrome / Edge），可点击 🔊 听标准发音后跟读。
      </p>
    );
  }

  return (
    <div className={compact ? "" : "mt-2"}>
      <button
        type="button"
        onClick={start}
        disabled={listening}
        className={`btn px-3 py-1.5 text-xs ${listening ? "btn-ghost" : "btn-primary"}`}
      >
        {listening ? "🎙 聆听中…" : "🎙 跟读打分"}
      </button>

      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}

      {transcript && (
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
          <p className="text-xs text-slate-500">识别到：</p>
          <p className="text-sm text-slate-200">{transcript}</p>
          {score !== null && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`text-lg font-bold tabular-nums ${
                  score >= 85
                    ? "text-emerald-400"
                    : score >= 60
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {score}
              </span>
              <span className="text-xs text-slate-500">
                {score >= 85 ? "发音很接近" : score >= 60 ? "大致正确，可再练" : "差异较大，再听一遍"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
