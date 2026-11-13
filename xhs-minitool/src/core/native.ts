/**
 * 端能力封装：window.xhs.miniTool 与 window.xhs.AI。
 * 规则：调用前逐层判空；未注入（浏览器预览 / 低版本）时走降级，绝不裸调。
 * 只使用在线文档明确开放的 API，不传未声明字段。
 */
declare const window: any;

export function xhs(): any {
  return window.xhs || null;
}

export function miniTool(): any {
  const x = xhs();
  return (x && x.miniTool) || null;
}

export function hasMiniTool(): boolean {
  return !!miniTool();
}

/** 客户端版本数值：9462 → 9.46.2 */
export function clientVersion(): number {
  const x = xhs();
  const lo = x && x.launchOptions;
  const bv = lo && lo.miniToolEnv && Number(lo.miniToolEnv.buildVersion);
  return bv ? Math.floor(bv / 1000) : 0;
}

export function atLeast(v: number): boolean {
  const c = clientVersion();
  return c > 0 && c >= v;
}

/* ------------------------------------------------------------ AI ---- */
export interface AiResult {
  ok: boolean;
  text: string;
  reason: string;
}

function aiHandle(): any {
  const x = xhs();
  return (x && x.AI) || null;
}

export function aiAvailable(): boolean {
  const ai = aiHandle();
  return !!(ai && typeof ai.createModel === "function");
}

/**
 * 平台内置大模型（deepseek-v4-flash）。无需 API Key；内测需 appId 加白，
 * 未加白返回 AI_NOT_ALLOWED，调用方必须自动降级。
 */
export function aiGenerate(messages: { role: string; content: string }[], maxTokens?: number): Promise<AiResult> {
  const ai = aiHandle();
  if (!ai || typeof ai.createModel !== "function") {
    return Promise.resolve({ ok: false, text: "", reason: "no-ai" });
  }
  try {
    const model = ai.createModel("deepseek-v4-flash");
    const req: any = { messages };
    if (maxTokens) req.max_output_tokens = maxTokens;
    return Promise.resolve(model.generateText(req)).then((res: any) => {
      const choice = res && res.choices && res.choices[0];
      const content = choice && choice.message && choice.message.content;
      if (!content) return { ok: false, text: "", reason: "empty" };
      return { ok: true, text: String(content), reason: "" };
    });
  } catch (e) {
    const msg = e && (e.errMsg || e.message) ? String(e.errMsg || e.message) : "";
    return Promise.resolve({ ok: false, text: "", reason: msg || "fail" });
  }
}

/* ------------------------------------------------------------ 媒体 ---- */
export function writeTempFile(dataUrl: string): Promise<string> {
  const mt = miniTool();
  if (!mt || typeof mt.writeTempFile !== "function") return Promise.resolve("");
  return mt
    .writeTempFile({ data: dataUrl })
    .then((r: any) => (r && r.filePath) || "")
    .catch(() => "");
}

/** 保存图片到相册（用户点击触发；失败返回原因） */
export function saveImage(dataUrl: string): Promise<{ ok: boolean; reason: string }> {
  const mt = miniTool();
  if (!mt || typeof mt.saveImageToPhotosAlbum !== "function") {
    return Promise.resolve({ ok: false, reason: "no-sdk" });
  }
  const path = writeTempFile(dataUrl);
  return path
    .then((p: string) => mt.saveImageToPhotosAlbum({ filePath: p || dataUrl }))
    .then(() => ({ ok: true, reason: "" }))
    .catch((e: any) => ({ ok: false, reason: (e && e.errMsg) || "fail" }));
}

/** 唤起笔记发布页（成功只代表发布页被唤起，不代表审核通过） */
export function postNote(title: string, content: string, filePath: string): Promise<{ ok: boolean; reason: string }> {
  const mt = miniTool();
  if (!mt || typeof mt.postNote !== "function") return Promise.resolve({ ok: false, reason: "no-sdk" });
  return mt
    .postNote({
      title: String(title).slice(0, 20),
      content: String(content).slice(0, 1000),
      pageType: "photo_publish",
      mediaInfo: { image_resources: [{ url: filePath }] },
    })
    .then(() => ({ ok: true, reason: "" }))
    .catch((e: any) => ({ ok: false, reason: (e && e.errMsg) || "fail" }));
}

export function vibrate(): void {
  const mt = miniTool();
  if (!mt || typeof mt.vibrateShort !== "function") return;
  if (!atLeast(9500)) return;
  try {
    mt.vibrateShort({ type: "light" });
  } catch (e) {
    /* noop */
  }
}

/** 窗口与安全区信息（9.49+），取不到时用 0 */
export function safeAreaBottom(): Promise<number> {
  const mt = miniTool();
  if (!mt || typeof mt.getWindowInfo !== "function" || !atLeast(9490)) return Promise.resolve(0);
  return mt
    .getWindowInfo()
    .then((r: any) => {
      const safe = r && r.safeArea;
      const win = r && (r.windowHeight || r.screenHeight);
      if (!safe || !win) return 0;
      const b = win - safe.bottom;
      return b > 0 ? b : 0;
    })
    .catch(() => 0);
}
