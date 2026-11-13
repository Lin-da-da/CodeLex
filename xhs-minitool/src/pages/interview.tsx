import { h } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import { Card, Btn, Chip, toast, TabBar, Seg, Empty, Loading, Link } from "../components/ui";
import * as d from "../core/data";
import * as track from "../core/track";
import * as srs from "../core/srs";
import { aiAvailable, aiGenerate } from "../core/native";
import { speak, canSpeak } from "../core/tts";
import * as router from "../router";

const LEVELS = [
  { key: "junior", label: "初级" },
  { key: "mid", label: "中级" },
  { key: "senior", label: "高级" },
];
const DEPTHS = [
  { key: "standard", label: "标准" },
  { key: "deep", label: "深入" },
  { key: "stress", label: "压力" },
];
const COUNTS = [
  { key: "2", label: "2 题" },
  { key: "3", label: "3 题" },
  { key: "5", label: "5 题" },
];

const SYSTEM =
  "You are a strict but fair English-speaking technical interviewer. " +
  'Always answer with pure JSON only, no markdown fences. ' +
  'Question turn schema: {"question_en":string,"question_cn":string,"evaluation":null}. ' +
  'Later turns: {"question_en":string,"question_cn":string,"evaluation":{"score":0-10,"english_comment":string,"technical_comment":string,"sample_answer":string,"followup":string}}. ' +
  'Final report turn: {"report":{"overall_score":0-100,"level":string,"verdict":string,"english":{"score":0-100,"summary":string},"technical":{"score":0-100,"summary":string,"strengths":[],"weaknesses":[]},"suggestions":[],"vocab_to_review":[]}}.';

function jsonOf(text: string): any {
  const s = String(text || "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(s.slice(a, b + 1));
  } catch (e) {
    return null;
  }
}

export default function InterviewPage() {
  const stacks = useMemo(() => d.stacks(), []);
  const [ready, setReady] = useState<boolean>(() => d.kitReady());
  const [mode, setMode] = useState<string>(""); // ai | bank
  const [stack, setStack] = useState<string>(stacks[0] ? stacks[0].slug : "");
  const [level, setLevel] = useState<string>("mid");
  const [depth, setDepth] = useState<string>("standard");
  const [count, setCount] = useState<string>("3");
  const [qs, setQs] = useState<any[]>([]);
  const [step, setStep] = useState<number>(0);
  const [answer, setAnswer] = useState<string>("");
  const [evals, setEvals] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    d.loadKit().then(() => setReady(true));
  }, []);

  const ai = aiAvailable();

  /* ---------------- 离线题库 ---------------- */
  function bankQuestions(): any[] {
    const k = d.kit();
    const fus = (k.followups || []).filter((f: any) => !stack || f.stack === stack);
    const bqs = k.bq || [];
    const out: any[] = [];
    const n = Number(count);
    for (let i = 0; i < n; i++) {
      if (fus.length && i % 2 === 0) {
        const f = fus[i % fus.length];
        const chain = f.chain || [];
        const lv = Math.min(chain.length, 1 + (depth === "deep" ? 2 : depth === "stress" ? 2 : 1));
        const picked = chain.slice(0, lv);
        out.push({
          question_en: picked.map((c: any) => c.en).join(" "),
          question_cn: picked.map((c: any) => c.cn).join(" "),
          hint: "追问链：" + f.topic,
        });
      } else if (bqs.length) {
        const b = bqs[(i + Math.floor(Math.random() * bqs.length)) % bqs.length];
        out.push({ question_en: b.qEn, question_cn: b.qCn, hint: b.aEn ? "参考要点：" + b.aEn.slice(0, 220) : "" });
      }
    }
    return out.slice(0, n);
  }

  function start() {
    setEvals([]);
    setReport(null);
    setStep(0);
    setAnswer("");
    setHistory([]);
    if (!ai) {
      setMode("bank");
      setQs(bankQuestions());
      return;
    }
    setMode("ai");
    setBusy(true);
    const stackName = (d.stackBySlug(stack) || { name: "" }).name;
    const msgs = [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: "技术栈：" + stackName + "；级别：" + level + "；题量：" + count + "；追问深度：" + depth + "。请给出第 1 题（evaluation 为 null）。",
      },
    ];
    setHistory(msgs);
    aiGenerate(msgs, 1024).then((r) => {
      setBusy(false);
      if (!r.ok) {
        setMode("bank");
        setQs(bankQuestions());
        toast("AI 不可用，已切换离线题库");
        return;
      }
      const j = jsonOf(r.text);
      if (!j || !j.question_en) {
        setMode("bank");
        setQs(bankQuestions());
        toast("AI 返回异常，已切换离线题库");
        return;
      }
      setQs([j]);
    });
  }

  function submit() {
    if (!answer.trim()) {
      toast("请先作答");
      return;
    }
    const cur = qs[step];
    if (mode === "bank") {
      setEvals(evals.concat([{ score: 0, english_comment: "离线题库模式：请对照参考要点自评。", technical_comment: cur.hint || "", sample_answer: "", followup: "" }]));
      setStep(step + 1);
      setAnswer("");
      if (step + 1 >= Number(count)) finishBank();
      return;
    }
    setBusy(true);
    const msgs = history.concat([
      { role: "user", content: "题目：" + cur.question_en + "\n我的回答：" + answer },
    ]);
    setHistory(msgs);
    aiGenerate(msgs, 1200).then((r) => {
      setBusy(false);
      if (!r.ok) {
        toast("评估失败，已切到离线题库");
        setMode("bank");
        const rest = bankQuestions();
        setQs(qs.slice(0, step + 1).concat(rest));
        return;
      }
      const j = jsonOf(r.text);
      if (!j) {
        toast("结果解析失败，请重试");
        return;
      }
      setEvals(evals.concat([j.evaluation || {}]));
      setHistory(msgs.concat([{ role: "assistant", content: r.text }]));
      if (j.question_en && step + 1 < Number(count)) {
        setQs(qs.concat([j]));
        setStep(step + 1);
        setAnswer("");
      } else {
        askReport(msgs.concat([{ role: "assistant", content: r.text }]));
      }
    });
  }

  function askReport(msgs: any[]) {
    setBusy(true);
    aiGenerate(msgs.concat([{ role: "user", content: "面试结束，请输出最终报告 JSON。" }]), 1600).then((r) => {
      setBusy(false);
      const j = jsonOf(r.text);
      const rep = j && j.report ? j.report : null;
      setReport(rep || { overall_score: 0, level: "-", verdict: "AI 报告生成失败，可查看逐题反馈。", english: { score: 0, summary: "" }, technical: { score: 0, summary: "" }, suggestions: [], vocab_to_review: [] });
      setStep(Number(count));
    });
  }

  function finishBank() {
    const terms: string[] = [];
    qs.forEach((q) => {
      const m = String(q.question_en || "").split(/[^A-Za-z-]+/);
      m.forEach((t) => {
        if (t.length > 3 && d.findTerm(t)) terms.push(t);
      });
    });
    setReport({
      overall_score: 0,
      level: "自评",
      verdict: "离线题库模式：对照参考要点复盘，建议把生词加入复习。",
      english: { score: 0, summary: "" },
      technical: { score: 0, summary: "" },
      suggestions: ["对照参考要点重答一遍", "把不确定的术语加入复习队列"],
      vocab_to_review: terms.slice(0, 12),
    });
  }

  useEffect(() => {
    if (!report) return;
    const s: track.InterviewSession = {
      at: Date.now(),
      stack,
      level,
      mode,
      items: qs.map((q, i) => ({ q: q.question_en || "", a: "" })),
      score: report.overall_score,
      review: report.vocab_to_review || [],
    };
    track.addInterview(s);
    (report.vocab_to_review || []).forEach((t: string) => {
      const l = d.findTerm(t);
      if (l) track.addMistake(l.term, l.slug, "interview");
    });
  }, [report]);

  /* ---------------- 报告 ---------------- */
  if (report) {
    return h(
      "div",
      { class: "page" },
      h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "面试报告")),
      h("div", { class: "content" },
        h(Card, null,
          h("div", { class: "center" },
            h("div", { style: "font-size:40px;font-weight:800;color:#34d399" }, report.overall_score ? String(report.overall_score) : "—"),
            h("div", { class: "mt8 bold" }, String(report.level || "")),
            h("div", { class: "small dim mt8" }, String(report.verdict || ""))
          )
        ),
        report.english && report.english.summary
          ? h(Card, { title: "英文表达" }, h("div", { class: "small" }, report.english.summary))
          : null,
        report.technical && report.technical.summary
          ? h(Card, { title: "技术内容" },
              h("div", { class: "small" }, report.technical.summary),
              (report.technical.strengths || []).length ? h("div", { class: "small mt8" }, "优势：" + report.technical.strengths.join("、")) : null,
              (report.technical.weaknesses || []).length ? h("div", { class: "small mt8" }, "不足：" + report.technical.weaknesses.join("、")) : null
            )
          : null,
        (report.suggestions || []).length
          ? h(Card, { title: "改进建议" }, (report.suggestions || []).map((s: string) => h("div", { class: "small", style: "margin-bottom:6px" }, "· " + s)))
          : null,
        (report.vocab_to_review || []).length
          ? h(Card, { title: "待复习术语（已进错题集）" },
              h("div", { class: "row wrap" },
                (report.vocab_to_review || []).map((t: string) => {
                  const l = d.findTerm(t);
                  return h(Link, { to: l ? "/word/" + l.slug + "/" + encodeURIComponent(t) : "/search", cls: "chip mid" }, t);
                })
              )
            )
          : null,
        h(Btn, { primary: true, onClick: () => { setReport(null); setQs([]); setEvals([]); } }, "再来一场"),
        h(Link, { to: "/review", cls: "btn ghost" }, "去复习")
      ),
      h(TabBar, { active: "speak" })
    );
  }

  /* ---------------- 答题中 ---------------- */
  if (qs.length && step < qs.length) {
    const cur = qs[step];
    const ev = evals[step];
    return h(
      "div",
      { class: "page" },
      h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "第 " + (step + 1) + " / " + qs.length + " 题")),
      h("div", { class: "content" },
        h(Chip, { kind: mode === "ai" ? "high" : "mid" }, mode === "ai" ? "AI 面试" : "离线题库"),
        h(Card, null,
          h("div", { class: "small" }, cur.question_en),
          cur.question_cn ? h("div", { class: "small dim mt8" }, cur.question_cn) : null,
          h("button", { class: "btn sm mt12", onClick: () => speak(cur.question_en), disabled: !canSpeak() }, canSpeak() ? "🔊 听题" : "🔇")
        ),
        ev
          ? h(Card, { title: "反馈" },
              ev.score ? h("div", { class: "bold" }, "得分 " + ev.score + " / 10") : null,
              ev.english_comment ? h("div", { class: "small mt8" }, "🗣 " + ev.english_comment) : null,
              ev.technical_comment ? h("div", { class: "small mt8" }, "🔧 " + ev.technical_comment) : null,
              ev.sample_answer ? h("div", { class: "small dim mt8" }, "参考答案：" + ev.sample_answer) : null,
              ev.followup ? h("div", { class: "small mt8" }, "追问：" + ev.followup) : null
            )
          : null,
        h("textarea", {
          class: "input mt12",
          rows: 6,
          placeholder: "用英文作答…",
          value: answer,
          onInput: (e: any) => setAnswer(e.target.value),
        }),
        h(Btn, { primary: true, onClick: submit, disabled: busy || !!ev }, busy ? "评估中…" : ev ? "已评估" : "提交回答"),
        ev ? h(Btn, { onClick: () => {
          if (step + 1 >= qs.length) {
            if (mode === "bank") finishBank();
            else askReport(history);
          } else {
            setStep(step + 1);
            setAnswer("");
          }
        } }, step + 1 >= qs.length ? "生成报告" : "下一题") : null,
        mode === "ai" ? h("div", { class: "tiny mute center mt8" }, "内容由 AI 生成，仅供参考") : null
      ),
      h(TabBar, { active: "speak" })
    );
  }

  /* ---------------- 设置 ---------------- */
  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "模拟面试")),
    h("div", { class: "content" },
      h(Card, { title: "技术栈" },
        h("div", { class: "row wrap" }, stacks.map((s) => h(Chip, { kind: stack === s.slug ? "on" : "", onClick: () => setStack(s.slug) }, s.icon + " " + s.name)))
      ),
      h(Card, { title: "级别" }, h(Seg, { options: LEVELS, value: level, onChange: setLevel })),
      h(Card, { title: "题量" }, h(Seg, { options: COUNTS, value: count, onChange: setCount })),
      h(Card, { title: "追问深度" }, h(Seg, { options: DEPTHS, value: depth, onChange: setDepth })),
      h(Btn, { primary: true, onClick: start, disabled: !ready || busy }, busy ? "准备中…" : "开始面试"),
      h("div", { class: "tiny mute center mt8" }, ai ? "已检测到平台 AI 能力，将优先使用" : "未检测到 AI 能力，使用离线题库（BQ 30 + 追问 45 + 口述 78）"),
      mode === "ai" ? h("div", { class: "tiny mute center mt8" }, "内容由 AI 生成，仅供参考") : null
    ),
    h(TabBar, { active: "speak" })
  );
}
