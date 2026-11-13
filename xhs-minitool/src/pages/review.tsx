import { h } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import { Card, Btn, Chip, toast, TabBar, Empty, Sheet, Link } from "../components/ui";
import * as d from "../core/data";
import * as srs from "../core/srs";
import * as track from "../core/track";
import { speak, canSpeak } from "../core/tts";
import { vibrate } from "../core/native";

const GRADES: [string, string, string][] = [
  ["again", "😵 遗忘", "1 天"],
  ["hard", "🙂 困难", "按 ease"],
  ["good", "😃 良好", "×ease"],
  ["easy", "🤩 简单", "×ease+"],
];

export default function ReviewPage() {
  const [state, setState] = useState<srs.ReviewState>(srs.loadReview());
  const [keys, setKeys] = useState<string[]>([]);
  const [idx, setIdx] = useState<number>(0);
  const [detail, setDetail] = useState<d.Full | null>(null);
  const [favs, setFavs] = useState<track.Fav[]>(track.loadFavorites());
  const [pickStack, setPickStack] = useState<boolean>(false);

  const all = useMemo(() => Object.keys(state), [state]);

  useEffect(() => {
    const due = srs.dueKeys(state, Date.now());
    due.sort((a, b) => new Date(state[a].due).getTime() - new Date(state[b].due).getTime());
    setKeys(due);
    setIdx(0);
  }, [state]);

  const key = keys[idx];
  const item = key ? state[key] : null;

  useEffect(() => {
    setDetail(null);
    if (!item) return;
    let alive = true;
    d.loadDict(item.stackSlug).then(() => {
      if (!alive) return;
      setDetail(d.full(item.stackSlug, item.term));
    });
    return () => {
      alive = false;
    };
  }, [key]);

  function grade(g: string) {
    if (!item) return;
    const next = srs.applyGrade(state, key, g, item.stackSlug, item.term);
    srs.saveReview(next);
    srs.bumpReviewLog();
    if (g === "again") track.addMistake(item.term, item.stackSlug, "srs");
    vibrate();
    setState(next);
    if (idx + 1 >= keys.length) {
      setIdx(0);
      setKeys([]);
    } else {
      setIdx(idx + 1);
    }
  }

  function addStack(slug: string) {
    let st = srs.loadReview();
    const [a, b] = d.stackRange(slug);
    for (let i = a; i < b; i++) {
      const l = d.liteAt(i);
      st = srs.ensureScheduled(st, l.slug, l.term);
    }
    srs.saveReview(st);
    setState(st);
    setPickStack(false);
    toast("已加入复习队列");
  }

  const dueCount = srs.dueKeys(state, Date.now()).length;

  if (!item) {
    return h(
      "div",
      { class: "page" },
      h("div", { class: "topbar" }, h("button", { class: "tb-btn" }, ""), h("h1", null, "复习")),
      h(
        "div",
        { class: "content" },
        h(Empty, { icon: "🔁" },
          keys.length === 0 && all.length > 0
            ? "今天的复习都完成啦，明天再来 ✨"
            : "还没有排期的词，先去背词或做测验"
        ),
        h(Card, { title: "队列状态" },
          h("div", { class: "row between small" }, h("span", { class: "dim" }, "已排期"), h("span", null, String(all.length))),
          h("div", { class: "row between small mt8" }, h("span", { class: "dim" }, "今日到期"), h("span", null, String(dueCount)))
        ),
        h(Btn, { onClick: () => setPickStack(true) }, "＋ 把某个技术栈的词全部加入复习"),
        h(Link, { to: "/learn/" + (d.stacks()[0] || { slug: "" }).slug, cls: "btn ghost" }, "去背词")
      ),
      pickStack
        ? h(Sheet, { onClose: () => setPickStack(false) },
            h("div", { class: "bold mb12" }, "选择技术栈"),
            d.stacks().map((s) => h("button", { class: "btn", onClick: () => addStack(s.slug) }, s.icon + " " + s.name + "（" + s.count + " 词）"))
          )
        : null,
      h(TabBar, { active: "review" })
    );
  }

  const lite = d.liteAt(d.indexOf(item.stackSlug, item.term));
  const isFav = track.isFavorite(favs, item.stackSlug, item.term);

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn" }, ""), h("h1", null, "复习 " + (idx + 1) + " / " + keys.length)),
    h(
      "div",
      { class: "content" },
      h(Card, null,
        h("div", { class: "row between" },
          h("div", { class: "tiny mute" }, (d.stackBySlug(item.stackSlug) || { name: "" }).name),
          h("div", { class: "tiny mute" }, "第 " + item.reps + " 次 · ease " + item.ease)
        ),
        h("div", { class: "term mono mt8" }, item.term),
        lite && lite.phonetic ? h("div", { class: "tiny mute mt8" }, lite.phonetic) : null,
        h("div", { class: "def mt12" }, lite ? lite.defCn : ""),
        detail && detail.codeExample ? h("div", { class: "code mt12" }, detail.codeExample) : null,
        detail && detail.exampleSentences.length
          ? h("div", { class: "mt12" },
              h("div", { class: "tiny mute mb8" }, "例句"),
              detail.exampleSentences.map((s) => h("div", { class: "small dim", style: "margin-bottom:4px" }, "· " + s))
            )
          : null,
        h("div", { class: "btn-row mt12" },
          h(Btn, { sm: true, onClick: () => speak(item.term), disabled: !canSpeak() }, canSpeak() ? "🔊 朗读" : "🔇 无发音"),
          h(Btn, {
            sm: true,
            onClick: () => {
              setFavs(track.toggleFavorite(item.stackSlug, item.term));
              toast(isFav ? "已取消收藏" : "已收藏");
            },
          }, isFav ? "★ 已收藏" : "☆ 收藏")
        )
      ),
      h("div", { class: "tiny mute center mb8" }, "选择你的记忆程度，系统自动排下次复习"),
      GRADES.map((g) => h(Btn, { onClick: () => grade(g[0]) }, g[1] + "　" + g[2]))
    ),
    h(TabBar, { active: "review" })
  );
}
