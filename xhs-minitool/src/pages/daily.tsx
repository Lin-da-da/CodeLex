import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Card, Btn, Chip, Stat, toast, TabBar, Link } from "../components/ui";
import * as d from "../core/data";
import * as srs from "../core/srs";
import * as daily from "../core/daily";
import * as track from "../core/track";
import { speak, canSpeak } from "../core/tts";
import { drawWordCard } from "../core/card";
import { writeTempFile, postNote, hasMiniTool, vibrate } from "../core/native";
import * as router from "../router";

const ENTRIES: [string, string, string][] = [
  ["📚", "技术文章", "#/articles"],
  ["🗣️", "口语中心", "#/kit"],
  ["🎧", "听说训练", "#/drills"],
  ["✍️", "英文写作", "#/writing"],
  ["💼", "岗位词包", "#/roles"],
  ["🔊", "易错发音", "#/pron"],
  ["🎤", "模拟面试", "#/interview"],
  ["🧯", "错题集", "#/mistakes"],
];

export default function DailyPage(props: { q: Record<string, string> }) {
  const [date, setDate] = useState<string>(props.q.d || "");
  const [word, setWord] = useState<d.Full | null>(null);
  const [lite, setLite] = useState<d.Lite | null>(null);
  const [favs, setFavs] = useState<track.Fav[]>(track.loadFavorites());
  const [loading, setLoading] = useState<boolean>(true);
  const [recent, setRecent] = useState<daily.DailyWord[]>([]);
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const dw = date ? daily.getDailyWord(new Date(date + "T00:00:00Z")) : daily.getDailyWord();
    if (!dw) {
      setLoading(false);
      return;
    }
    setLite(dw.lite);
    d.loadDict(dw.lite.slug).then(() => {
      if (!alive) return;
      setWord(d.full(dw.lite.slug, dw.lite.term));
      setLoading(false);
    });
    setRecent(daily.getRecentDailyWords(7));
    return () => {
      alive = false;
    };
  }, [date]);

  const w = word;
  const l = lite;
  const isFav = l ? track.isFavorite(favs, l.slug, l.term) : false;

  function toggleFav() {
    if (!l) return;
    setFavs(track.toggleFavorite(l.slug, l.term));
    vibrate();
    toast(isFav ? "已取消收藏" : "已加入收藏");
  }

  function addReview() {
    if (!l) return;
    const st = srs.ensureScheduled(srs.loadReview(), l.slug, l.term);
    srs.saveReview(st);
    vibrate();
    toast("已加入复习队列");
  }

  function share() {
    if (!l) return;
    if (!hasMiniTool()) {
      toast("请在小红书 App 内使用分享");
      return;
    }
    setBusy(true);
    const url = drawWordCard({
      term: l.term,
      phonetic: l.phonetic,
      pos: l.pos,
      defCn: l.defCn,
      defEn: w ? w.defEn : "",
      stackName: (d.stackBySlug(l.slug) || { name: "" }).name,
      date: date || new Date().toISOString().slice(0, 10),
    });
    if (!url) {
      setBusy(false);
      toast("生成图片失败");
      return;
    }
    writeTempFile(url).then((p) => {
      if (!p) {
        setBusy(false);
        toast("生成图片失败");
        return;
      }
      return postNote("今日一词 " + l.term, "我在 CodeLex 学了 " + l.term + "：" + l.defCn, p).then((r) => {
        setBusy(false);
        toast(r.ok ? "已唤起发布页" : "分享失败");
      });
    });
  }

  const total = d.total();
  const st = d.stacks();

  return h(
    "div",
    { class: "page" },
    h(
      "div",
      { class: "topbar" },
      h("button", { class: "tb-btn", style: "visibility:hidden" }, ""),
      h("h1", null, "CodeLex"),
      h(
        "button",
        { class: "tb-btn right", onClick: () => router.navigate("/mine") },
        "设置"
      )
    ),
    h(
      "div",
      { class: "content" },
      /* 概览 */
      h(
        "div",
        { class: "card" },
        h("div", { class: "row between" },
          h("div", null, h("div", { class: "bold", style: "font-size:18px" }, "程序员领域英文"),
            h("div", { class: "tiny mute mt8" }, "离线词库 · 数据 " + d.manifest().buildTime)),
          h("div", { class: "center" }, h("div", { class: "bold", style: "color:#34d399;font-size:20px" }, String(total)),
            h("div", { class: "tiny mute" }, "词条"))
        ),
        h("div", { class: "row mt12" },
          h("div", { class: "grow mr6" }, h(Stat, { v: String(st.length), k: "技术栈" })),
          h("div", { class: "grow ml6" }, h(Stat, { v: String(Object.keys(srs.loadReview()).length), k: "已排期" }))
        )
      ),

      /* 每日一词 */
      loading || !l
        ? h("div", { class: "skeleton" })
        : h(
            "div",
            { class: "card" },
            h("div", { class: "row between" },
              h("div", { class: "tiny mute" }, "每日一词 · " + (date || l && "")),
              h("div", null,
                h(Chip, { kind: d.freqName(l.freq) }, d.freqName(l.freq) === "high" ? "高频" : d.freqName(l.freq) === "mid" ? "中频" : "低频")
              )
            ),
            h("div", { class: "row mt8" },
              h("div", { class: "term mono" }, l.term),
              h("div", { class: "ml8 tiny mute" }, l.phonetic)
            ),
            h("div", { class: "dim tiny mt8" }, (d.stackBySlug(l.slug) || { name: "" }).name + " · " + l.pos),
            h("div", { class: "def mt12" }, l.defCn),
            w && w.defEn ? h("div", { class: "defen mt8" }, w.defEn) : null,
            w && w.codeExample ? h("div", { class: "code mt12" }, w.codeExample) : null,
            w && w.exampleSentences.length
              ? h("div", { class: "mt12" },
                  h("div", { class: "tiny mute mb8" }, "例句"),
                  w.exampleSentences.map((s, i) => h("div", { class: "small dim", style: "margin-bottom:4px" }, "· " + s))
                )
              : null,
            h("div", { class: "btn-row mt12" },
              h(Btn, { sm: true, onClick: () => speak(l.term), disabled: !canSpeak() }, canSpeak() ? "🔊 朗读" : "🔇 不支持发音"),
              h(Btn, { sm: true, onClick: toggleFav }, isFav ? "★ 已收藏" : "☆ 收藏"),
              h(Btn, { sm: true, onClick: addReview }, "＋ 复习")
            ),
            h(Btn, { onClick: share, disabled: busy }, busy ? "生成中…" : "🖼 生成词卡并发笔记"),
            canSpeak() ? null : h("div", { class: "tiny mute mt8 center" }, "当前环境不支持发音，其余功能不受影响")
          ),

      /* 回看 */
      h(Card, { title: "往期回顾" },
        h("div", { class: "row wrap" },
          recent.map((r) =>
            h(Link, {
              to: "/daily?d=" + r.date,
              cls: "chip" + ((!date && r.date === recent[0].date) || date === r.date ? " on" : ""),
            }, r.date.slice(5) + " " + r.lite.term)
          )
        )
      ),

      h(Card, { title: "全部入口" },
        h("div", { class: "grid3" },
          ENTRIES.map((e) =>
            h(Link, { to: e[2], cls: "tile" }, h("span", { class: "ic" }, e[0]), h("span", { class: "tx" }, e[1]))
          )
        )
      ),

      h(Card, { title: "技术栈" },
        h("div", { class: "grid2" },
          st.map((s) =>
            h(Link, { to: "/stack/" + s.slug, cls: "tile" },
              h("span", { class: "ic" }, s.icon || "◆"),
              h("span", { class: "tx" }, s.name),
              h("span", { class: "tiny mute" }, s.count + " 词 / 高频 " + s.high)
            )
          )
        )
      )
    ),
    h(TabBar, { active: "daily" })
  );
}
