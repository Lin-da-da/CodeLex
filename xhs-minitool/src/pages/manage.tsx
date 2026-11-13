import { h } from "preact";
import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import { Card, Btn, Chip, toast, TabBar, Empty, Seg, Stat, Bar, Confirm, Link } from "../components/ui";
import * as d from "../core/data";
import * as srs from "../core/srs";
import * as track from "../core/track";
import * as store from "../core/storage";
import * as roadmap from "../core/roadmap";
import { speak, canSpeak } from "../core/tts";
import { drawTextTable, drawReport } from "../core/card";
import { writeTempFile, saveImage, postNote, hasMiniTool, aiAvailable, clientVersion } from "../core/native";
import * as router from "../router";

/* ------------------------------------------------------------ 错题 -- */
export function MistakesPage() {
  const [list, setList] = useState<track.Mistake[]>(track.loadMistakes());
  const [done, setDone] = useState<string[]>(track.loadMistakesMastered());
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const byStack: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  list.forEach((m) => {
    byStack[m.stack || "-"] = (byStack[m.stack || "-"] || 0) + 1;
    bySource[m.source] = (bySource[m.source] || 0) + 1;
  });
  const stackRows = Object.keys(byStack).sort((a, b) => byStack[b] - byStack[a]).slice(0, 6);

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "错题集")),
    h("div", { class: "content" },
      list.length === 0
        ? h(Empty, { icon: "🧯" }, "还没有错题，去做测验或训练吧")
        : h("div", null,
            h(Card, { title: "弱项分布（按技术栈）" },
              stackRows.map((k) =>
                h("div", { style: "margin-bottom:10px" },
                  h("div", { class: "row between tiny" },
                    h("span", null, (d.stackBySlug(k) || { name: k }).name),
                    h("span", { class: "mute" }, String(byStack[k]))
                  ),
                  h("div", { class: "mt8" }, h(Bar, { pct: Math.round((byStack[k] / list.length) * 100) }))
                )
              )
            ),
            h("div", { class: "row wrap mb12" },
              Object.keys(bySource).map((s) => h(Chip, { kind: "mid" }, track.SOURCE_LABEL[s] + " " + bySource[s]))
            ),
            list.slice().sort((a, b) => b.count - a.count).map((m) =>
              h("div", { class: "card" },
                h("div", { class: "row between" },
                  h("div", { class: "grow" },
                    h("div", { class: "t mono" }, m.term),
                    h("div", { class: "d ellipsis" }, (d.stackBySlug(m.stack || "") || { name: "-" }).name + " · " + track.SOURCE_LABEL[m.source])
                  ),
                  h("div", { class: "chip mid" }, "错 " + m.count + " 次")
                ),
                h("div", { class: "btn-row mt12" },
                  h(Btn, {
                    sm: true,
                    onClick: () => {
                      track.markMistakeMastered(m.term);
                      setList(track.loadMistakes());
                      setDone(track.loadMistakesMastered());
                      toast("已攻克");
                    },
                  }, "✓ 已攻克"),
                  h(Btn, { sm: true, onClick: () => { if (m.stack) router.navigate("/word/" + m.stack + "/" + encodeURIComponent(m.term)); } }, "详情")
                )
              )
            ),
            h(Btn, { danger: true, onClick: () => setConfirmClear(true) }, "清空错题集")
          ),
      done.length ? h("div", { class: "tiny mute center mt12" }, "已攻克 " + done.length + " 个") : null,
      confirmClear
        ? h(Confirm, {
            title: "清空错题集",
            msg: "确定清空全部错题？此操作不可恢复，已攻克标记也会一并清除。",
            okLabel: "确定清空",
            danger: true,
            onOk: () => {
              track.clearMistakes();
              setList([]);
              setDone([]);
              setConfirmClear(false);
              toast("已清空");
            },
            onCancel: () => setConfirmClear(false),
          })
        : null
    ),
    h(TabBar, { active: "mine" })
  );
}

/* ------------------------------------------------------------ 收藏 -- */
export function FavoritesPage() {
  const [favs, setFavs] = useState<track.Fav[]>(track.loadFavorites());

  function exportImg() {
    if (!hasMiniTool()) {
      toast("请在小红书 App 内使用");
      return;
    }
    const rows = favs.map((f) => {
      const l = d.liteAt(d.indexOf(f.stackSlug, f.term));
      return f.term + "　" + (l ? l.defCn : "");
    });
    const pages = drawTextTable("我的收藏", rows, 24);
    if (!pages.length) return;
    writeTempFile(pages[0]).then((p) => (p ? saveImage(p).then((r) => toast(r.ok ? "已保存到相册" : "保存失败")) : null));
  }

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "我的收藏")),
    h("div", { class: "content" },
      favs.length === 0
        ? h(Empty, { icon: "⭐" }, "还没有收藏的词")
        : h("div", null,
            h("div", { class: "tiny mute mb8" }, "共 " + favs.length + " 词"),
            favs.slice().reverse().map((f) => {
              const l = d.liteAt(d.indexOf(f.stackSlug, f.term));
              return h("div", { class: "card" },
                h("div", { class: "row between" },
                  h("div", { class: "grow" },
                    h(Link, { to: "/word/" + f.stackSlug + "/" + encodeURIComponent(f.term), cls: "t mono" }, f.term),
                    h("div", { class: "d ellipsis" }, l ? l.defCn : "（本地无此词）")
                  ),
                  h("button", { class: "btn sm", onClick: () => speak(f.term), disabled: !canSpeak() }, "🔊")
                ),
                h("div", { class: "btn-row mt12" },
                  h(Btn, {
                    sm: true,
                    onClick: () => {
                      srs.saveReview(srs.ensureScheduled(srs.loadReview(), f.stackSlug, f.term));
                      toast("已加入复习");
                    },
                  }, "＋ 复习"),
                  h(Btn, { sm: true, onClick: () => setFavs(track.toggleFavorite(f.stackSlug, f.term)) }, "取消收藏")
                )
              );
            }),
            h(Btn, { onClick: exportImg }, "🖼 导出为图片（保存到相册）")
          )
    ),
    h(TabBar, { active: "mine" })
  );
}

/* ------------------------------------------------------------ 统计 -- */
function WeekChart(props: { log: srs.ReviewLog }) {
  const ref = useRef<any>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const w = cv.width;
    const h = cv.height;
    ctx.clearRect(0, 0, w, h);
    const days: string[] = [];
    const vals: number[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const key = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
      days.push(key.slice(5));
      vals.push(props.log[key] || 0);
    }
    let max = 1;
    for (let i = 0; i < vals.length; i++) if (vals[i] > max) max = vals[i];
    const bw = Math.floor((w - 20) / 7) - 6;
    for (let i = 0; i < 7; i++) {
      const bh = Math.round((vals[i] / max) * (h - 44));
      const x = 10 + i * (bw + 6);
      ctx.fillStyle = "#16233a";
      ctx.fillRect(x, 8, bw, h - 44);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(x, 8 + (h - 44 - bh), bw, bh);
      ctx.fillStyle = "#64748b";
      ctx.font = "10px -apple-system, sans-serif";
      ctx.fillText(days[i], x, h - 26);
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(String(vals[i]), x + bw / 2 - 4, h - 10);
    }
  }, [props.log]);
  return h("canvas", { ref, width: 320, height: 160, style: "width:100%;height:160px" });
}

export function StatsPage() {
  const review = useMemo(() => srs.loadReview(), []);
  const log = useMemo(() => srs.loadReviewLog(), []);
  const history = useMemo(() => track.loadQuizHistory(), []);
  const practice = useMemo(() => track.loadPracticeLog(), []);
  const read = useMemo(() => track.loadReadArticles(), []);

  let scheduled = 0;
  let mastered = 0;
  let easeSum = 0;
  for (const k in review) {
    scheduled += 1;
    if (srs.isMastered(review[k])) mastered += 1;
    easeSum += review[k].ease;
  }
  const due = srs.dueKeys(review, Date.now()).length;
  const avgEase = scheduled ? (easeSum / scheduled).toFixed(2) : "0";
  const today = new Date().toISOString().slice(0, 10);

  let qTotal = 0;
  let qCorrect = 0;
  history.forEach((r) => {
    qTotal += r.total;
    qCorrect += r.score;
  });
  const avg = qTotal ? Math.round((qCorrect / qTotal) * 100) : 0;
  const steps = roadmap.pathProgress();

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "学习统计")),
    h("div", { class: "content" },
      h("div", { class: "grid3 mb12" },
        h("div", null, h(Stat, { v: String(srs.streak(log)), k: "连续天数" })),
        h("div", null, h(Stat, { v: String(log[today] || 0), k: "今日复习" })),
        h("div", null, h(Stat, { v: String(due), k: "待复习" }))
      ),
      h("div", { class: "grid3 mb12" },
        h("div", null, h(Stat, { v: String(scheduled), k: "已排期" })),
        h("div", null, h(Stat, { v: String(mastered), k: "已掌握" })),
        h("div", null, h(Stat, { v: avgEase, k: "平均 ease" }))
      ),
      h(Card, { title: "近 7 天复习量" }, h(WeekChart, { log })),
      h("div", { class: "grid3 mb12" },
        h("div", null, h(Stat, { v: String(avg), k: "测验均分" })),
        h("div", null, h(Stat, { v: String(history.length), k: "测验场次" })),
        h("div", null, h(Stat, { v: String(read.length), k: "已读文章" }))
      ),
      history.length
        ? h(Card, { title: "最近 8 场测验" },
            history.slice(0, 8).map((r) =>
              h("div", { class: "row between small", style: "margin-bottom:8px" },
                h("span", { class: "dim" }, new Date(r.at).toISOString().slice(5, 16).replace("T", " ")),
                h("span", null, r.score + " / " + r.total)
              )
            )
          )
        : null,
      h(Card, { title: "学习路径进度" },
        steps.map((s) =>
          h("div", { style: "margin-bottom:12px" },
            h("div", { class: "row between small" },
              h("span", null, s.level + " " + s.goal.slice(0, 16) + "…"),
              h("span", { class: "mute" }, s.current + "/" + s.target)
            ),
            h("div", { class: "mt8" }, h(Bar, { pct: Math.round((s.current / s.target) * 100) }))
          )
        )
      ),
      h("div", { class: "tiny mute center" }, "统计口径与网页版一致：连续天数仅统计 SRS 复习"),
      h(Btn, { onClick: shareReport }, "🖼 生成战报并发笔记")
    ),
    h(TabBar, { active: "mine" })
  );

  function shareReport() {
    if (!hasMiniTool()) {
      toast("请在小红书 App 内使用");
      return;
    }
    const url = drawReport({
      streak: srs.streak(log),
      todayReview: log[today] || 0,
      due,
      mastered,
      scheduled,
      quizAvg: avg,
      quizzes: history.length,
    });
    if (!url) return;
    writeTempFile(url).then((p) =>
      p ? postNote("CodeLex 学习战报", "连续学习 " + srs.streak(log) + " 天，已掌握 " + mastered + " 词。", p).then((r) => toast(r.ok ? "已唤起发布页" : "分享失败")) : null
    );
  }
}

/* ------------------------------------------------------------ 计划 -- */
export function PlanPage() {
  const stacks = d.stacks();
  const [cfg, setCfg] = useState<any>(() => roadmap.loadPlan() || { date: "", stackSlug: stacks[0] ? stacks[0].slug : "", minutes: 60 });
  const [done, setDone] = useState<string[]>(roadmap.loadPlanDone());
  const days = useMemo(() => (cfg.date ? roadmap.buildPlan(cfg.date, cfg.stackSlug, Number(cfg.minutes)) : []), [cfg]);

  function gen() {
    roadmap.savePlan(cfg);
    toast("计划已生成");
  }
  function toggle(id: string) {
    const next = done.indexOf(id) >= 0 ? done.filter((x) => x !== id) : done.concat([id]);
    setDone(next);
    roadmap.savePlanDone(next);
  }
  const totalTasks = days.reduce((s, x) => s + x.tasks.length, 0);
  const pct = totalTasks ? Math.round((done.length / totalTasks) * 100) : 0;

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "面试冲刺计划")),
    h("div", { class: "content" },
      h(Card, { title: "设置" },
        h("div", { class: "tiny mute mb8" }, "面试日期"),
        h("input", { class: "input", type: "date", value: cfg.date, onInput: (e: any) => setCfg({ ...cfg, date: e.target.value }) }),
        h("div", { class: "tiny mute mt12 mb8" }, "目标技术栈"),
        h("div", { class: "row wrap" },
          stacks.map((s) => h(Chip, { kind: cfg.stackSlug === s.slug ? "on" : "", onClick: () => setCfg({ ...cfg, stackSlug: s.slug }) }, s.icon + " " + s.name))
        ),
        h("div", { class: "tiny mute mt12 mb8" }, "每天投入"),
        h(Seg, {
          options: [{ key: "30", label: "30 分钟" }, { key: "60", label: "60 分钟" }, { key: "90", label: "90 分钟" }],
          value: String(cfg.minutes),
          onChange: (k) => setCfg({ ...cfg, minutes: Number(k) }),
        }),
        h(Btn, { primary: true, onClick: gen }, "生成计划")
      ),
      days.length
        ? h("div", null,
            h(Card, null,
              h("div", { class: "row between" },
                h("div", { class: "bold" }, days.length + " 天 · " + totalTasks + " 个任务"),
                h("div", { class: "tiny mute" }, "完成 " + pct + "%")
              ),
              h("div", { class: "mt8" }, h(Bar, { pct }))
            ),
            days.map((day) =>
              h(Card, { title: day.date + " · " + day.phaseName },
                day.tasks.map((t) =>
                  h("div", { class: "row", style: "margin-bottom:8px" },
                    h("input", {
                      type: "checkbox",
                      checked: done.indexOf(t.id) >= 0,
                      onChange: () => toggle(t.id),
                      style: "width:20px;height:20px;margin-right:10px",
                    }),
                    h(Link, {
                      to: t.href,
                      cls: "small grow" + (done.indexOf(t.id) >= 0 ? " done-task" : ""),
                      title: t.label,
                    }, t.icon + " " + t.label)
                  )
                )
              )
            ),
            h(Btn, { danger: true, onClick: () => { setDone([]); roadmap.savePlanDone([]); } }, "清空完成记录")
          )
        : h("div", { class: "tiny mute center" }, "选择面试日期后生成每日任务（最多 60 天）")
    ),
    h(TabBar, { active: "mine" })
  );
}

/* ------------------------------------------------------------ 路径 -- */
export function PathPage() {
  const steps = roadmap.pathProgress();
  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "学习路径")),
    h("div", { class: "content" },
      steps.map((s) =>
        h(Card, null,
          h("div", { class: "row between" },
            h("div", { class: "bold" }, s.level),
            h("div", { class: "tiny mute" }, s.current + " / " + s.target)
          ),
          h("div", { class: "small mt8" }, s.goal),
          h("div", { class: "mt8" }, h(Bar, { pct: Math.round((s.current / s.target) * 100) })),
          h("div", { class: "tiny mute mt8" }, s.rule),
          h(Link, { to: s.href, cls: "btn sm mt12" }, "去完成 →")
        )
      )
    ),
    h(TabBar, { active: "mine" })
  );
}

/* ------------------------------------------------------------ 诊断 -- */
/**
 * 运行诊断面板。审核若再以「功能缺陷/按钮不可点」驳回，直接把这块截图给对方，
 * 能一次性说清：版本、数据是否就绪、当前路由、容器是否注入、各端能力是否可用。
 * 避免继续盲改。
 */
function DiagCard() {
  const rows: [string, string][] = [
    ["版本", "v" + (d.manifest().version || "?") + " · 数据 " + d.manifest().buildTime],
    ["数据就绪", d.dataReady() ? "是（22 个脚本全部静态就绪）" : "否——请检查打包"],
    ["词库 / 文章 / 题库", d.total() + " 词 / " + d.manifest().articles + " 篇 / " + (d.kit().oral || []).length + " 条口述"],
    ["当前路由", router.current().name + (router.current().p1 ? "/" + router.current().p1 : "")],
    ["容器注入 window.xhs", hasMiniTool() ? "是（客户端 " + (clientVersion() || "?") + "）" : "否——当前为浏览器预览"],
    ["端能力", ["postNote", "saveImageToPhotosAlbum", "writeTempFile"].map((k) => {
      const mt = (window as any).xhs && (window as any).xhs.miniTool;
      return k + (mt && typeof mt[k] === "function" ? "✓" : "✗");
    }).join("  ")],
    ["平台 AI", aiAvailable() ? "可用" : "不可用（走离线题库）"],
    ["本地存储", (function () {
      try {
        window.localStorage.setItem("__clx_probe", "1");
        window.localStorage.removeItem("__clx_probe");
        return "可用";
      } catch (e) {
        return "不可用";
      }
    })()],
    ["视口", window.innerWidth + "×" + window.innerHeight + " @dpr" + (window.devicePixelRatio || 1)],
    ["UA", String(navigator.userAgent).slice(0, 120)],
  ];
  return h(
    Card,
    { title: "运行诊断（截图可用于反馈）" },
    rows.map((r) =>
      h("div", { class: "row between small", style: "margin-bottom:8px;align-items:flex-start" },
        h("span", { class: "mute", style: "flex:0 0 96px" }, r[0]),
        h("span", { class: "grow pre-wrap", style: "text-align:right;word-break:break-all" }, r[1])
      )
    ),
    h("div", { class: "tiny mute mt8" }, "若按钮点击无反应，请附上本卡片截图 + 具体页面名称，便于定位。")
  );
}

/* ------------------------------------------------------------ 设置 -- */
export function SettingsPage() {
  const [prefs, setPrefs] = useState<track.Prefs>(track.loadPrefs());
  const [info, setInfo] = useState<any>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  useEffect(() => {
    store.storageInfo().then(setInfo);
    if (prefs.reduceMotion) document.documentElement.style.setProperty("--x", "1");
  }, []);

  function update(p: track.Prefs) {
    setPrefs(p);
    track.savePrefs(p);
  }

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "设置")),
    h("div", { class: "content" },
      h(Card, { title: "显示" },
        h("div", { class: "row between" },
          h("div", { class: "small grow" }, "显示英文释义"),
          h(Btn, { sm: true, onClick: () => update({ ...prefs, showEn: !prefs.showEn }) }, prefs.showEn ? "开" : "关")
        ),
        h("div", { class: "row between mt12" },
          h("div", { class: "small grow" }, "写作模板显示中文"),
          h(Btn, { sm: true, onClick: () => update({ ...prefs, writingShowCn: !prefs.writingShowCn }) }, prefs.writingShowCn ? "开" : "关")
        ),
        h("div", { class: "row between mt12" },
          h("div", { class: "small grow" }, "减少动效"),
          h(Btn, { sm: true, onClick: () => update({ ...prefs, reduceMotion: !prefs.reduceMotion }) }, prefs.reduceMotion ? "开" : "关")
        )
      ),
      h(Card, { title: "数据与存储" },
        h("div", { class: "tiny dim" }, "数据版本 " + d.manifest().buildTime + " · " + d.total() + " 词 / " + d.manifest().articles + " 篇 / " + d.stacks().length + " 栈"),
        info
          ? h("div", { class: "tiny dim mt8" }, "缓存 " + Math.round(info.usedBytes / 1024) + " KB / " + Math.round(info.limitBytes / 1024) + " KB")
          : h("div", { class: "tiny dim mt8" }, "当前使用浏览器本地存储"),
        h("div", { class: "tiny dim mt8" }, "⚠️ 学习数据仅存本机，清理缓存或重装可能丢失，重要进度建议用「导出为图片」备份。")
      ),
      h(Card, { title: "说明" },
        h("div", { class: "tiny dim" }, "小工具完全离线运行：词库、文章与题库都在包内，无需联网。模拟面试在无 AI 能力时自动使用离线题库。")
      ),
      h(DiagCard, null),
      h(Btn, { danger: true, onClick: () => setConfirmClear(true) }, "清空全部学习数据"),
      confirmClear
        ? h(Confirm, {
            title: "清空全部学习数据",
            msg: "确定清空全部学习数据？收藏、复习进度、错题、统计都会删除，且不可恢复。",
            okLabel: "全部清空",
            danger: true,
            onOk: () => {
              store.clearAll();
              setConfirmClear(false);
              toast("已清空");
            },
            onCancel: () => setConfirmClear(false),
          })
        : null
    ),
    h(TabBar, { active: "mine" })
  );
}
