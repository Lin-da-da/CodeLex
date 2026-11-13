import { h } from "preact";
import { useMemo } from "preact/hooks";
import { Card, TabBar, Chip, Link } from "../components/ui";
import * as d from "../core/data";
import * as srs from "../core/srs";
import * as track from "../core/track";

const SPEAK: [string, string, string, string][] = [
  ["🎧", "听说训练", "听力辨词 + 中译英默写", "#/drills"],
  ["🗣️", "口语中心", "句型 / 口述 / BQ / 追问链", "#/kit"],
  ["🔊", "易错发音", "程序员常读错的技术词", "#/pron"],
  ["✍️", "英文写作", "PR / commit / design doc", "#/writing"],
  ["💼", "岗位词包", "按 JD 打包必背词", "#/roles"],
  ["🎤", "模拟面试", "英文问答 + 追问", "#/interview"],
];

const MINE: [string, string, string][] = [
  ["⭐", "我的收藏", "#/favorites"],
  ["🧯", "错题集", "#/mistakes"],
  ["📊", "学习统计", "#/stats"],
  ["🎯", "冲刺计划", "#/plan"],
  ["🗺️", "学习路径", "#/path"],
  ["⚙️", "设置", "#/settings"],
];

export function SpeakPage() {
  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn" }, ""), h("h1", null, "口语与实战")),
    h(
      "div",
      { class: "content" },
      SPEAK.map((s) =>
        h(Link, { to: s[3], cls: "item" },
          h("div", { class: "row" },
            h("div", { style: "font-size:20px;margin-right:10px" }, s[0]),
            h("div", { class: "grow" },
              h("div", { class: "t" }, s[1]),
              h("div", { class: "d" }, s[2])
            ),
            h("div", { class: "mute" }, "›")
          )
        )
      ),
      h(Card, { title: "离线说明" },
        h("div", { class: "tiny dim" }, "小工具完全离线运行：词库、文章、题库都在包内；跟读打分在无语音识别环境下改为自评。")
      )
    ),
    h(TabBar, { active: "speak" })
  );
}

export function MinePage() {
  const review = useMemo(() => srs.loadReview(), []);
  const log = useMemo(() => srs.loadReviewLog(), []);
  const due = useMemo(() => srs.dueKeys(review, Date.now()).length, [review]);
  let mastered = 0;
  for (const k in review) if (srs.isMastered(review[k])) mastered++;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = log[today] || 0;

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn" }, ""), h("h1", null, "我的")),
    h(
      "div",
      { class: "content" },
      h(Card, null,
        h("div", { class: "row between" },
          h("div", { class: "grow" },
            h("div", { class: "bold" }, "连续学习 " + srs.streak(log) + " 天"),
            h("div", { class: "tiny mute mt8" }, "今日复习 " + todayCount + " 词 · 待复习 " + due + " 词")
          ),
          h("div", { class: "center" },
            h("div", { class: "bold", style: "color:#34d399;font-size:20px" }, String(mastered)),
            h("div", { class: "tiny mute" }, "已掌握")
          )
        )
      ),
      MINE.map((m) =>
        h(Link, { to: m[2], cls: "item" },
          h("div", { class: "row" },
            h("div", { style: "font-size:20px;margin-right:10px" }, m[0]),
            h("div", { class: "grow t" }, m[1]),
            h("div", { class: "mute" }, "›")
          )
        )
      ),
      h(Card, { title: "数据版本" },
        h("div", { class: "tiny dim" }, d.manifest().buildTime + " · " + d.total() + " 词 / " + d.manifest().articles + " 篇 / " + d.stacks().length + " 栈")
      )
    ),
    h(TabBar, { active: "mine" })
  );
}
