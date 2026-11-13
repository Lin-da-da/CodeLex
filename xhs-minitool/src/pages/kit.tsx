import { h } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import { Card, Btn, Chip, toast, TabBar, Empty, Seg, Sheet, Loading, Link } from "../components/ui";
import * as d from "../core/data";
import * as track from "../core/track";
import * as srs from "../core/srs";
import { speak, canSpeak } from "../core/tts";
import { drawTextTable } from "../core/card";
import { writeTempFile, saveImage, hasMiniTool, vibrate } from "../core/native";
import * as router from "../router";

const TABS = [
  { key: "phrases", label: "句型" },
  { key: "oral", label: "60 秒口述" },
  { key: "bq", label: "BQ" },
  { key: "followups", label: "追问链" },
];

/* ------------------------------------------------------------ 口语中心 -- */
export function KitPage() {
  const [tab, setTab] = useState<string>("phrases");
  const [q, setQ] = useState<string>("");
  const [showCn, setShowCn] = useState<boolean>(true);
  const [hideDone, setHideDone] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(() => d.kitReady());
  const [mastered, setMastered] = useState<string[]>(track.loadKitMastered());
  const [left, setLeft] = useState<number>(0);
  const [openId, setOpenId] = useState<string>("");

  useEffect(() => {
    d.loadKit().then(() => setReady(true));
  }, []);

  const list = useMemo(() => {
    if (!ready) return [];
    const k = d.kit();
    const arr = k[tab] || [];
    const t = q.trim().toLowerCase();
    return arr.filter((it: any) => {
      if (hideDone && mastered.indexOf(it.id || it.concept || it.topic) >= 0) return false;
      if (!t) return true;
      return JSON.stringify(it).toLowerCase().indexOf(t) >= 0;
    });
  }, [ready, tab, q, hideDone, mastered]);

  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft(left - 1), 1000);
    return () => clearInterval(t);
  }, [left]);

  if (!ready) return h(Loading, { title: "口语中心", msg: "加载素材…", tab: "speak" });

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "口语中心")),
    h("div", { class: "content" },
      h(Seg, { options: TABS, value: tab, onChange: setTab }),
      h("input", { class: "input mb12", placeholder: "搜索素材…", value: q, onInput: (e: any) => setQ(e.target.value) }),
      h("div", { class: "row wrap mb12" },
        h(Chip, { kind: showCn ? "on" : "", onClick: () => setShowCn(!showCn) }, showCn ? "显示中文" : "隐藏中文"),
        h(Chip, { kind: hideDone ? "on" : "", onClick: () => setHideDone(!hideDone) }, "隐藏已掌握")
      ),
      h("div", { class: "tiny mute mb8" }, "共 " + list.length + " 条"),
      list.slice(0, 40).map((it: any) => {
        const id = it.id || it.concept || it.topic || "";
        const open = openId === id;
        const done = mastered.indexOf(id) >= 0;
        return h("div", { class: "card tap", onClick: () => setOpenId(open ? "" : id) },
          tab === "oral"
            ? h("div", null,
                h("div", { class: "row between" },
                  h("div", { class: "bold grow" }, it.concept),
                  h("div", { class: "tiny mute" }, it.seconds + "s")
                ),
                h("div", { class: "tiny mute mt8" }, (d.stackBySlug(it.stack) || { name: "" }).name),
                open
                  ? h("div", null,
                      h("div", { class: "mt12 small" }, it.en),
                      showCn && it.cn ? h("div", { class: "small dim mt8" }, it.cn) : null,
                      h("div", { class: "btn-row mt12" },
                        h(Btn, { sm: true, onClick: (e: Event) => { e.stopPropagation(); setLeft(it.seconds || 60); } }, "⏱ 计时"),
                        h(Btn, { sm: true, onClick: (e: Event) => { e.stopPropagation(); speak(it.en); } }, "🔊 朗读")
                      ),
                      left > 0 ? h("div", { class: "center mt12 bold", style: "color:#34d399;font-size:22px" }, left + "s") : null
                    )
                  : null
              )
            : tab === "followups"
            ? h("div", null,
                h("div", { class: "bold" }, it.topic),
                h("div", { class: "tiny mute mt8" }, (d.stackBySlug(it.stack) || { name: "" }).name + " · " + (it.chain || []).length + " 层追问"),
                open
                  ? (it.chain || []).map((c: any) =>
                      h("div", { class: "mt12" },
                        h("div", { class: "tiny mute" }, "L" + c.level),
                        h("div", { class: "small" }, c.en),
                        showCn && c.cn ? h("div", { class: "small dim mt8" }, c.cn) : null
                      )
                    )
                  : null
              )
            : tab === "bq"
            ? h("div", null,
                h("div", { class: "bold" }, it.qEn),
                showCn && it.qCn ? h("div", { class: "small dim mt8" }, it.qCn) : null,
                open && it.aEn
                  ? h("div", null,
                      h("div", { class: "mt12 tiny mute" }, "参考回答"),
                      h("div", { class: "small" }, it.aEn),
                      showCn && it.aCn ? h("div", { class: "small dim mt8" }, it.aCn) : null,
                      h(Btn, { sm: true, onClick: (e: Event) => { e.stopPropagation(); speak(it.aEn); } }, "🔊 朗读")
                    )
                  : null
              )
            : h("div", null,
                h("div", { class: "small" }, it.en),
                showCn && it.cn ? h("div", { class: "small dim mt8" }, it.cn) : null,
                open && it.note ? h("div", { class: "tiny mute mt8" }, "💡 " + it.note) : null
              ),
          h("div", { class: "btn-row mt12" },
            h(Btn, { sm: true, onClick: (e: Event) => { e.stopPropagation(); speak(it.en || it.qEn || ""); }, disabled: !canSpeak() }, "🔊"),
            h(Btn, {
              sm: true,
              onClick: (e: Event) => {
                e.stopPropagation();
                setMastered(track.toggleKitMastered(id));
                vibrate();
              },
            }, done ? "✓ 已掌握" : "标记掌握")
          )
        );
      })
    ),
    h(TabBar, { active: "speak" })
  );
}

/* ------------------------------------------------------------ 训练 -- */
export function DrillsPage() {
  const [mode, setMode] = useState<string>("listen");
  const [qa, setQa] = useState<any>(null);
  const [picked, setPicked] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [score, setScore] = useState<number>(0);
  const [round, setRound] = useState<number>(0);
  const [msg, setMsg] = useState<string>("");

  function next() {
    const total = d.total();
    const i = Math.floor(Math.random() * total);
    const correct = d.liteAt(i);
    const opts: string[] = [correct.defCn];
    let guard = 0;
    while (opts.length < 4 && guard < 50) {
      guard++;
      const j = Math.floor(Math.random() * total);
      const o = d.liteAt(j).defCn;
      if (opts.indexOf(o) < 0) opts.push(o);
    }
    // 洗牌
    const shuffled = opts.slice();
    for (let k = shuffled.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      const t = shuffled[k];
      shuffled[k] = shuffled[r];
      shuffled[r] = t;
    }
    setQa({ correct, options: shuffled });
    setPicked("");
    setInput("");
    setMsg("");
    if (mode === "listen") setTimeout(() => speak(correct.term), 260);
  }

  function answer(v: string) {
    if (!qa) return;
    setPicked(v);
    const ok = v === qa.correct.defCn;
    if (ok) setScore(score + 1);
    else track.addMistake(qa.correct.term, qa.correct.slug, "drill");
    setRound(round + 1);
    track.addPractice(mode === "listen" ? "listen" : "dictation", qa.correct.term, ok ? 100 : 0);
  }

  function checkWrite() {
    if (!qa) return;
    const ok = input.trim().toLowerCase() === qa.correct.term.toLowerCase();
    if (ok) setScore(score + 1);
    else track.addMistake(qa.correct.term, qa.correct.slug, "drill");
    setRound(round + 1);
    setMsg(ok ? "✅ 正确" : "❌ 正确拼写：" + qa.correct.term);
    track.addPractice("dictation", qa.correct.term, ok ? 100 : 0);
  }

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "听说训练")),
    h("div", { class: "content" },
      h(Seg, { options: [{ key: "listen", label: "听力辨词" }, { key: "write", label: "中译英默写" }], value: mode, onChange: setMode }),
      h("div", { class: "tiny mute mb8" }, "本轮 " + score + " / " + round + " · 错题自动进入错题集"),
      !qa
        ? h(Btn, { primary: true, onClick: next }, "开始")
        : h(Card, null,
            mode === "listen"
              ? h("div", null,
                  h("div", { class: "row between" },
                    h("div", { class: "term mono" }, qa.correct.term),
                    h("button", { class: "btn sm", onClick: () => speak(qa.correct.term), disabled: !canSpeak() }, canSpeak() ? "🔊 再听" : "🔇")
                  ),
                  h("div", { class: "tiny mute mt8" }, "选出正确的中文释义"),
                  qa.options.map((o: string) =>
                    h("button", {
                      class: "btn" + (picked ? (o === qa.correct.defCn ? " primary" : o === picked ? " danger" : "") : ""),
                      onClick: () => answer(o),
                    }, o)
                  )
                )
              : h("div", null,
                  h("div", { class: "tiny mute" }, "写出对应的英文术语"),
                  h("div", { class: "def mt8 bold" }, qa.correct.defCn),
                  h("input", { class: "input mt12", value: input, placeholder: "输入英文术语", onInput: (e: any) => setInput(e.target.value) }),
                  h(Btn, { primary: true, onClick: checkWrite }, "提交"),
                  msg ? h("div", { class: "center mt8 small" }, msg) : null,
                  h("div", { class: "tiny mute mt8" }, "提示：首字母 " + qa.correct.term.charAt(0))
                ),
            h(Btn, { onClick: next }, "下一题")
          ),
      canSpeak() ? null : h("div", { class: "tiny mute center mt8" }, "当前环境不支持发音，听力题改为看词选义"),
      h("div", { class: "btn-row mt12" },
        h(Link, { to: "/mistakes", cls: "btn sm" }, "看错题"),
        h(Link, { to: "/review", cls: "btn sm" }, "去复习")
      )
    ),
    h(TabBar, { active: "speak" })
  );
}

/* ------------------------------------------------------------ 发音 -- */
export function PronPage() {
  const [ready, setReady] = useState<boolean>(() => d.kitReady());
  const [self, setSelf] = useState<Record<string, number>>({});
  useEffect(() => {
    d.loadKit().then(() => setReady(true));
  }, []);
  if (!ready) return h(Loading, { title: "易错发音", tab: "speak" });
  const items = d.kit().pron || [];
  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "易错发音")),
    h("div", { class: "content" },
      h("div", { class: "tiny mute mb8" }, "无语音识别环境下改为自评三档，评分口径与网页版不同"),
      items.map((it: any) =>
        h("div", { class: "card" },
          h("div", { class: "row between" },
            h("div", { class: "term mono", style: "font-size:20px" }, it.term),
            h("button", { class: "btn sm", onClick: () => speak(it.term), disabled: !canSpeak() }, canSpeak() ? "🔊" : "🔇")
          ),
          h("div", { class: "small dim mt8" }, "IPA " + it.ipa),
          h("div", { class: "small mt8" }, "❌ 常见误读：" + it.common),
          h("div", { class: "small mt8" }, "✅ 正确读法：" + it.correct),
          it.tipCn ? h("div", { class: "tiny mute mt8" }, it.tipCn) : null,
          it.ex ? h("div", { class: "small dim mt8" }, "“" + it.ex + "”") : null,
          h("div", { class: "btn-row mt12" },
            ["准确", "一般", "再练"].map((label, i) => {
              const v = 3 - i;
              return h(Btn, {
                sm: true,
                onClick: () => {
                  const next: Record<string, number> = {};
                  for (const k in self) next[k] = self[k];
                  next[it.term] = v;
                  setSelf(next);
                  track.addPractice("pron", it.term, v * 33);
                  toast("已记录自评");
                },
              }, (self[it.term] === v ? "✓ " : "") + label);
            })
          )
        )
      )
    )
  );
}

/* ------------------------------------------------------------ 写作 -- */
const WCATS = [
  { key: "pr", name: "PR 描述" },
  { key: "commit", name: "Commit" },
  { key: "review", name: "Code Review" },
  { key: "design", name: "Design Doc" },
  { key: "incident", name: "故障复盘" },
];

export function WritingPage() {
  const [ready, setReady] = useState<boolean>(() => d.kitReady());
  const [cat, setCat] = useState<string>("pr");
  const [showCn, setShowCn] = useState<boolean>(true);
  const [open, setOpen] = useState<string>("");
  useEffect(() => {
    d.loadKit().then(() => setReady(true));
  }, []);
  if (!ready) return h(Loading, { title: "英文写作", tab: "speak" });
  const items = (d.kit().writing || []).filter((w: any) => w.cat === cat);

  function saveAsImg(text: string, title: string) {
    if (!hasMiniTool()) {
      toast("请在小红书 App 内使用");
      return;
    }
    const pages = drawTextTable(title, String(text).split("\n"), 24);
    if (!pages.length) return;
    writeTempFile(pages[0]).then((p) => {
      if (!p) return;
      return saveImage(p).then((r) => toast(r.ok ? "已保存到相册" : "保存失败"));
    });
  }

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "英文写作")),
    h("div", { class: "content" },
      h(Seg, { options: WCATS.map((c) => ({ key: c.key, label: c.name })), value: cat, onChange: setCat }),
      h(Chip, { kind: showCn ? "on" : "", onClick: () => setShowCn(!showCn) }, showCn ? "显示中文" : "隐藏中文"),
      h("div", { class: "mt12" },
        items.map((w: any) =>
          h("div", { class: "card tap", onClick: () => setOpen(open === w.id ? "" : w.id) },
            h("div", { class: "row between" },
              h("div", { class: "bold grow" }, w.title),
              h("div", { class: "tiny mute" }, open === w.id ? "收起" : "展开")
            ),
            open === w.id
              ? h("div", null,
                  h("div", { class: "code mt12" }, w.en),
                  showCn && w.cn ? h("div", { class: "small dim mt8" }, w.cn) : null,
                  h("div", { class: "btn-row mt12" },
                    h(Btn, { sm: true, onClick: (e: Event) => { e.stopPropagation(); saveAsImg(w.en, w.title); } }, "🖼 存为图片"),
                    h(Btn, { sm: true, onClick: (e: Event) => { e.stopPropagation(); speak(w.title); } }, "🔊 朗读标题")
                  ),
                  h("div", { class: "tiny mute mt8" }, "剪贴板在小工具内不可用，请用「存为图片」保存模板")
                )
              : null
          )
        )
      )
    ),
    h(TabBar, { active: "speak" })
  );
}

/* ------------------------------------------------------------ 岗位 -- */
export function RolesPage() {
  const [ready, setReady] = useState<boolean>(() => d.kitReady());
  const [open, setOpen] = useState<string>("");
  useEffect(() => {
    d.loadKit().then(() => setReady(true));
  }, []);
  if (!ready) return h(Loading, { title: "岗位词包", tab: "speak" });
  const roles = d.kit().roles || [];

  function exportRole(r: any) {
    if (!hasMiniTool()) {
      toast("请在小红书 App 内使用");
      return;
    }
    const rows: string[] = [];
    (r.terms || []).forEach((t: string) => {
      const l = d.findTerm(t);
      rows.push(t + "　" + (l ? l.defCn : ""));
    });
    const pages = drawTextTable(r.name + " 必背词", rows, 24);
    if (!pages.length) return;
    writeTempFile(pages[0]).then((p) => {
      if (!p) return;
      return saveImage(p).then((res) => toast(res.ok ? "已保存到相册" : "保存失败"));
    });
  }

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "岗位词包")),
    h("div", { class: "content" },
      roles.map((r: any) =>
        h("div", { class: "card tap", onClick: () => setOpen(open === r.slug ? "" : r.slug) },
          h("div", { class: "row between" },
            h("div", { class: "bold grow" }, (r.icon || "💼") + " " + r.name),
            h("div", { class: "tiny mute" }, r.level)
          ),
          h("div", { class: "tiny mute mt8" }, (r.stacks || []).join(" / ")),
          open === r.slug
            ? h("div", null,
                h("div", { class: "small mt12" }, r.jdEn),
                h("div", { class: "small dim mt8" }, r.jdCn),
                h("div", { class: "tiny mute mt12" }, "必背术语 " + (r.terms || []).length + " 个"),
                h("div", { class: "row wrap mt8" },
                  (r.terms || []).map((t: string) => {
                    const l = d.findTerm(t);
                    return h(Link, { to: "/word/" + (l ? l.slug : "") + "/" + encodeURIComponent(t), cls: "chip" }, t);
                  })
                ),
                h(Btn, { sm: true, onClick: (e: Event) => { e.stopPropagation(); exportRole(r); } }, "🖼 导出为图片")
              )
            : null
        )
      )
    ),
    h(TabBar, { active: "speak" })
  );
}
