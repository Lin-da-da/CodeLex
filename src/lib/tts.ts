// 文本朗读（Web Speech API）。仅在浏览器环境生效，SSR 安全。
export function speak(text: string, lang = "en-US") {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    /* 忽略不支持的环境 */
  }
}

export function stopSpeak() {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}
