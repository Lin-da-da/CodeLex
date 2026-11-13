import { h } from "preact";
import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import { Card, Btn, Chip, toast, TabBar, Empty, Seg, Sheet, Loading, Link } from "../components/ui";
import * as d from "../core/data";
import * as track from "../core/track";
import * as srs from "../core/srs";
import { speak, canSpeak } from "../core/tts";
import * as router from "../router";

export function ArticlesPage() {
  const [ready, setReady] = useState<boolean>(() => d.articlesReady());
  const [cat, setCat] = useState<string>("");
  const [stack, setStack] = useState<string>("");
  const [limit, setLimit] = useState<number>(12);

  useEffect(() => {
    d.loadArticles().then(() => setReady(true));
  }, []);

  const read = useMemo(() => track.loadReadArticles(), [ready]);

  const list = useMemo(() => {
    if (!ready) return [];
    return d.articles().filter((a) => {
      if (cat && a.category !== cat) return false;
      if (stack && a.stackSlug !== stack) return false;
      return true;
    });
  }, [ready, cat, stack]);

  if (!ready) return h(Loading, { title: "技术文章", msg: "加载文章…", tab: "daily" });

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "技术文章")),
    h("div", { class: "content" },
      h("div", { class: "row wrap mb12" },
        h(Chip, { kind: cat === "" ? "on" : "", onClick: () => setCat("") }, "全部分类"),
        d.CATEGORIES.map((c) => h(Chip, { kind: cat === c.slug ? "on" : "", onClick: () => setCat(c.slug) }, c.icon + " " + c.name))
      ),
      h("div", { class: "row wrap mb12" },
        h(Chip, { kind: stack === "" ? "on" : "", onClick: () => setStack("") }, "全部栈"),
        d.stacks().map((s) => h(Chip, { kind: stack === s.slug ? "on" : "", onClick: () => setStack(s.slug) }, s.icon + " " + s.name))
      ),
      h("div", { class: "tiny mute mb8" }, list.length + " 篇 · 已读 " + read.length),
      list.slice(0, limit).map((a) =>
        h(Link, { to: "/article/" + a.slug, cls: "item" },
          h("div", { class: "row between" },
            h("div", { class: "grow" },
              h("div", { class: "t" }, a.title),
              h("div", { class: "d ellipsis" }, (d.stackBySlug(a.stackSlug) || { name: "" }).name + " · " + a.words + " 词 · 难度 " + a.difficulty)
            ),
            read.indexOf(a.slug) >= 0 ? h("span", { class: "chip high" }, "已读") : null
          )
        )
      ),
      limit < list.length ? h(Btn, { onClick: () => setLimit(limit + 12) }, "加载更多") : null
    ),
    h(TabBar, { active: "daily" })
  );
}

export function ArticlePage(props: { slug: string }) {
  const [ready, setReady] = useState<boolean>(() => d.articlesReady());
  const [mode, setMode] = useState<string>("bi");
  const [pick, setPick] = useState<string>("");

  useEffect(() => {
    d.loadArticles().then(() => setReady(true));
  }, []);

  useEffect(() => {
    // 短文本兜底：进入 15 秒后同样记为已读
    const t = setTimeout(() => track.markArticleRead(props.slug), 15000);
    return () => clearTimeout(t);
  }, [props.slug]);

  const art = useMemo(() => (ready ? d.articleBySlug(props.slug) : null), [ready, props.slug]);
  const picked = useMemo(() => (pick ? d.findTerm(pick) : null), [pick]);

  if (!ready) return h(Loading, { title: "文章", tab: "daily" });
  if (!art) return h(Empty, null, "文章不存在");

  const n = Math.max(art.en.length, art.cn.length);

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, art.title)),
    h("div", { class: "content" },
      h(Seg, {
        options: [{ key: "en", label: "仅英文" }, { key: "cn", label: "仅中文" }, { key: "bi", label: "中英对照" }],
        value: mode,
        onChange: setMode,
      }),
      h("div", { class: "row between mb12" },
        h("div", { class: "tiny mute" }, (d.stackBySlug(art.stackSlug) || { name: "" }).name + " · " + art.words + " 词"),
        h("button", { class: "btn sm", onClick: () => speak(art.en.join(" ").slice(0, 200)), disabled: !canSpeak() }, canSpeak() ? "🔊 朗读开头" : "🔇")
      ),
      Array.apply(null, Array(n)).map((_: any, i: number) => {
        const en = art.en[i] || "";
        const cn = art.cn[i] || "";
        return h("div", { class: "para" + (mode === "bi" ? " bi" : "") },
          mode !== "cn" ? h("div", { class: "en" }, tokens(en, setPick)) : null,
          mode !== "en" && cn ? h("div", { class: "cn" }, cn) : null
        );
      }),
      h("div", { class: "center mt16" },
        h(Btn, {
          primary: true,
          onClick: () => {
            track.markArticleRead(art.slug);
            toast("已标记为已读");
          },
        }, "标记本页已读")
      ),
      art.license ? h("div", { class: "tiny mute center mt12" }, "License: " + art.license) : null
    ),
    picked
      ? h(Sheet, { onClose: () => setPick("") },
          h("div", { class: "row between" },
            h("div", { class: "term mono", style: "font-size:22px" }, picked.term),
            h("button", { class: "btn sm", onClick: () => speak(picked.term), disabled: !canSpeak() }, "🔊")
          ),
          h("div", { class: "tiny mute mt8" }, picked.phonetic + " " + picked.pos),
          h("div", { class: "small mt12" }, picked.defCn),
          h("div", { class: "btn-row mt12" },
            h(Btn, {
              sm: true,
              onClick: () => {
                track.toggleFavorite(picked.slug, picked.term);
                toast("已收藏");
              },
            }, "☆ 收藏"),
            h(Btn, {
              sm: true,
              primary: true,
              onClick: () => {
                srs.saveReview(srs.ensureScheduled(srs.loadReview(), picked.slug, picked.term));
                toast("已加入复习");
              },
            }, "＋ 生词复习")
          ),
          h(Link, { to: "/word/" + picked.slug + "/" + encodeURIComponent(picked.term), cls: "btn sm mt8" }, "查看完整详情")
        )
      : null
  );
}

/** 把段落切成可点击的词元；命中词库的词高亮 */
function tokens(text: string, onPick: (t: string) => void) {
  const parts = String(text).split(/([A-Za-z][A-Za-z'-]*)/);
  const out: any[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    if (/^[A-Za-z]/.test(p) && p.length > 2) {
      const hit = d.findTerm(p);
      out.push(
        h(
          "span",
          {
            class: "tok" + (hit ? " hit" : ""),
            onClick: hit
              ? () => onPick(p)
              : undefined,
          },
          p
        )
      );
    } else {
      out.push(h("span", null, p));
    }
  }
  return out;
}
