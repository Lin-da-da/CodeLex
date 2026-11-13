/**
 * Canvas 出图：小工具无法下载文件、无法用剪贴板，
 * 「导出 / 分享」统一走：Canvas → toDataURL → writeTempFile → 存相册 / 发笔记。
 * 画布按真机 2x 出图，尺寸固定，不做动态测量循环。
 */
const W = 750;
const H = 1000;

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrap(ctx: any, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number): number {
  const chars = String(text || "").split("");
  let line = "";
  let lines = 0;
  let cy = y;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxW && line !== "") {
      ctx.fillText(line, x, cy);
      cy += lineH;
      lines += 1;
      line = chars[i];
      if (lines >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (lines < maxLines) ctx.fillText(line, x, cy);
  return cy + lineH;
}

function base(ctx: any, title: string, sub: string): void {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, 420);
  g.addColorStop(0, "rgba(16,185,129,0.22)");
  g.addColorStop(1, "rgba(2,6,23,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 420);

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 34px -apple-system, sans-serif";
  ctx.fillText("CodeLex", 56, 96);
  ctx.fillStyle = "#64748b";
  ctx.font = "26px -apple-system, sans-serif";
  ctx.fillText(title, 56, 140);
  if (sub) {
    ctx.fillStyle = "#475569";
    ctx.font = "22px -apple-system, sans-serif";
    ctx.fillText(sub, 56, 178);
  }
}

export interface WordCardData {
  term: string;
  phonetic: string;
  pos: string;
  defCn: string;
  defEn: string;
  stackName: string;
  date: string;
}

export function drawWordCard(d: WordCardData): string {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  base(ctx, "今日一词 · " + d.date, d.stackName);

  ctx.fillStyle = "#0f172a";
  roundRect(ctx, 48, 220, W - 96, 620, 28);
  ctx.fill();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#34d399";
  ctx.font = "bold 64px -apple-system, sans-serif";
  ctx.fillText(d.term, 84, 320);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "28px -apple-system, sans-serif";
  ctx.fillText((d.phonetic || "") + "  " + (d.pos || ""), 84, 366);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "32px -apple-system, sans-serif";
  let y = wrap(ctx, d.defCn, 84, 440, W - 200, 46, 4);

  if (d.defEn) {
    ctx.fillStyle = "#64748b";
    ctx.font = "26px -apple-system, sans-serif";
    y = wrap(ctx, d.defEn, 84, y + 40, W - 200, 38, 4);
  }

  ctx.fillStyle = "#10b981";
  roundRect(ctx, 84, y + 30, 200, 64, 32);
  ctx.fill();
  ctx.fillStyle = "#022c22";
  ctx.font = "bold 26px -apple-system, sans-serif";
  ctx.fillText(d.stackName, 112, y + 72);

  ctx.fillStyle = "#475569";
  ctx.font = "22px -apple-system, sans-serif";
  ctx.fillText("离线词库 · 7859 词 / 16 技术栈", 84, H - 70);

  try {
    return canvas.toDataURL("image/png");
  } catch (e) {
    return "";
  }
}

export interface ReportData {
  streak: number;
  todayReview: number;
  due: number;
  mastered: number;
  scheduled: number;
  quizAvg: number;
  quizzes: number;
}

export function drawReport(d: ReportData): string {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  base(ctx, "学习战报", new Date().toISOString().slice(0, 10));

  const items: [string, string][] = [
    ["连续学习", d.streak + " 天"],
    ["今日复习", d.todayReview + " 词"],
    ["待复习", d.due + " 词"],
    ["已掌握", d.mastered + " 词"],
    ["已排期", d.scheduled + " 词"],
    ["测验均分", d.quizAvg + " 分"],
  ];

  ctx.fillStyle = "#0f172a";
  roundRect(ctx, 48, 220, W - 96, 480, 28);
  ctx.fill();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < items.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 92 + col * 300;
    const y = 310 + row * 140;
    ctx.fillStyle = "#64748b";
    ctx.font = "24px -apple-system, sans-serif";
    ctx.fillText(items[i][0], x, y);
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 44px -apple-system, sans-serif";
    ctx.fillText(items[i][1], x, y + 54);
  }

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "30px -apple-system, sans-serif";
  ctx.fillText("把背词变成习惯，面试前不慌。", 84, H - 120);
  ctx.fillStyle = "#475569";
  ctx.font = "22px -apple-system, sans-serif";
  ctx.fillText("CodeLex · 程序员领域英文", 84, H - 70);

  try {
    return canvas.toDataURL("image/png");
  } catch (e) {
    return "";
  }
}

/** 文本类导出（词表 / 收藏 / 岗位术语）→ 分页表格图 */
export function drawTextTable(title: string, rows: string[], perPage?: number): string[] {
  const size = perPage || 24;
  const out: string[] = [];
  const pages = Math.ceil(rows.length / size) || 1;
  for (let p = 0; p < pages; p++) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return out;
    base(ctx, title, "第 " + (p + 1) + " / " + pages + " 页");
    ctx.font = "26px -apple-system, sans-serif";
    let y = 250;
    const end = Math.min(rows.length, (p + 1) * size);
    for (let i = p * size; i < end; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#e2e8f0" : "#cbd5e1";
      y = wrap(ctx, String(rows[i]), 60, y, W - 120, 40, 2);
      y += 6;
    }
    try {
      out.push(canvas.toDataURL("image/png"));
    } catch (e) {
      /* noop */
    }
  }
  return out;
}
