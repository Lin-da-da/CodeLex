import { h } from "preact";
import { useState, useMemo } from "preact/hooks";
import { Card, Btn, Chip, toast, TabBar, Empty, Seg } from "../components/ui";
import * as d from "../core/data";
import * as q from "../core/quiz";
import * as track from "../core/track";
import { vibrate } from "../core/native";

const COUNTS = [
  { key: "10", label: "10 题" },
  { key: "20", label: "20 题" },
  { key: "30", label: "30 题" },
];

export default function QuizPage() {
  const stacks = useMemo(() => d.stacks(), []);
  const [sel, setSel] = useState<string[]>([stacks[0] ? stacks[0].slug : ""]);
  const [count, setCount] = useState<string>("10");
  const [qas, setQas] = useState<q.QA[] | null>(null);
  const [step, setStep] = useState<number>(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [wrong, setWrong] = useState<string[]>([]);

  function toggle(slug: string) {
    const next = sel.slice();
    const i = next.indexOf(slug);
    if (i >= 0) next.splice(i, 1);
    else next.push(slug);
    setSel(next);
  }

  function start() {
    if (sel.length === 0) {
      toast("至少选择一个技术栈");
      return;
    }
    const pool = q.buildPool(sel, 80);
    const list = q.makeQuestions(pool, Number(count));
    if (list.length === 0) {
      toast("题库为空");
      return;
    }
    setQas(list);
    setStep(0);
    setPicked(null);
    setScore(0);
    setWrong([]);
  }

  function choose(opt: string) {
    if (picked || !qas) return;
    setPicked(opt);
    const cur = qas[step];
    const ok = opt === cur.answer;
    if (ok) setScore(score + 1);
    else {
      setWrong(wrong.concat([cur.word.term]));
      track.addMistake(cur.word.term, cur.word.slug, "quiz");
    }
    vibrate();
  }

  function next() {
    if (!qas) return;
    if (step + 1 >= qas.length) {
      const total = qas.length;
      track.addQuizRecord({
        at: Date.now(),
        stacks: sel.slice(),
        score,
        total,
        wrong: wrong.slice(),
      });
      setStep(total);
      return;
    }
    setStep(step + 1);
    setPicked(null);
  }

  /* ---------- 结果页 ---------- */
  if (qas && step >= qas.length) {
    const total = qas.length;
    const pct = Math.round((score / total) * 100);
    const level = pct >= 90 ? "优秀" : pct >= 70 ? "良好" : pct >= 50 ? "及格" : "需加强";
    return h(
      "div",
      { class: "page" },
      h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => routerBack() }, "‹ 返回"), h("h1", null, "测验结果")),
      h(
        "div",
        { class: "content" },
        h(Card, null,
          h("div", { class: "center" },
            h("div", { style: "font-size:44px;font-weight:800;color:#34d399" }, score + " / " + total),
            h("div", { class: "mt8 bold" }, level + " · 正确率 " + pct + "%")
          )
        ),
        wrong.length
          ? h(Card, { title: "错词（已进错题集）" },
              h("div", { class: "row wrap" }, wrong.map((t) => h(Chip, { kind: "mid" }, t)))
            )
          : h(Card, null, h("div", { class: "center small dim" }, "全部答对 🎉")),
        h(Btn, { primary: true, onClick: start }, "再来一组"),
        h(Btn, { onClick: () => { setQas(null); setStep(0); } }, "返回设置")
      ),
      h(TabBar, { active: "quiz" })
    );
  }

  /* ---------- 答题 ---------- */
  if (qas) {
    const cur = qas[step];
    return h(
      "div",
      { class: "page" },
      h("div", { class: "topbar" },
        h("button", { class: "tb-btn", onClick: () => { setQas(null); } }, "‹ 退出"),
        h("h1", null, "第 " + (step + 1) + " / " + qas.length + " 题")
      ),
      h(
        "div",
        { class: "content" },
        h(Card, null,
          h("div", { class: "tiny mute" }, (d.stackBySlug(cur.word.slug) || { name: "" }).name),
          h("div", { class: "term mono mt8" }, cur.word.term),
          cur.word.phonetic ? h("div", { class: "tiny mute mt8" }, cur.word.phonetic) : null
        ),
        cur.options.map((opt) => {
          let cls = "btn";
          if (picked) {
            if (opt === cur.answer) cls += " primary";
            else if (opt === picked) cls += " danger";
          }
          return h("button", { class: cls, onClick: () => choose(opt) }, opt);
        }),
        picked
          ? h("div", { class: "center mt12" },
              h("div", { class: "small " + (picked === cur.answer ? "" : "") },
                picked === cur.answer ? "✅ 答对了" : "❌ 正确答案已标绿"),
              h(Btn, { primary: true, onClick: next }, step + 1 >= qas.length ? "查看结果" : "下一题")
            )
          : null
      ),
      h(TabBar, { active: "quiz" })
    );
  }

  /* ---------- 设置 ---------- */
  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn" }, ""), h("h1", null, "测验")),
    h(
      "div",
      { class: "content" },
      h(Card, { title: "选择技术栈（可多选）" },
        h("div", { class: "row wrap" },
          stacks.map((s) => h(Chip, { kind: sel.indexOf(s.slug) >= 0 ? "on" : "", onClick: () => toggle(s.slug) }, s.icon + " " + s.name))
        ),
        h("div", { class: "btn-row mt12" },
          h(Btn, { sm: true, onClick: () => setSel(stacks.map((s) => s.slug)) }, "全选"),
          h(Btn, { sm: true, onClick: () => setSel([]) }, "清空")
        )
      ),
      h(Card, { title: "题量" }, h(Seg, { options: COUNTS, value: count, onChange: setCount })),
      h(Btn, { primary: true, onClick: start }, "开始测验"),
      h("div", { class: "tiny mute center mt8" }, "题库共 " + d.total() + " 词，全部本地离线")
    ),
    h(TabBar, { active: "quiz" })
  );
}

function routerBack() {
  if (window.history && window.history.length > 1) window.history.back();
  else window.location.hash = "#/quiz";
}
