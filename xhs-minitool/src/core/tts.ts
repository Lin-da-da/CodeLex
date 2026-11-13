/**
 * 朗读：容器无法打包音频文件（白名单不含 mp3/wav），只能使用 speechSynthesis。
 * 该能力未在禁用清单内，但 Android WebView 常无 TTS 引擎 → 必须检测 + 静默降级。
 */
declare const window: any;

let supported: boolean | null = null;

export function canSpeak(): boolean {
  if (supported !== null) return supported;
  try {
    supported = typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance === "function";
  } catch (e) {
    supported = false;
  }
  return supported;
}

/** 首次调用需由用户点击触发（部分内核要求手势） */
export function speak(text: string, lang?: string): boolean {
  if (!canSpeak()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.lang = lang || "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) {
    return false;
  }
}

export function stopSpeak(): void {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    /* noop */
  }
}
