import { h } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import { Card, Btn, Chip, toast, TabBar, Empty, Seg, Sheet, Loading, Link } from "../components/ui";
import * as d from "../core/data";
import * as srs from "../core/srs";
import * as track from "../core/track";
import { speak, canSpeak } from "../core/tts";
import { drawTextTable } from "../core/card";
import { writeTempFile, saveImage, hasMiniTool, vibrate } from "../core/native";
import * as router from "../router";
import * as search from "../core/search";

/* ------------------------------------------------------------ 背词 -- */
export function LearnPage(props: { slug: string }) {
  const slug = props.slug;
  const stack = d.stackBySlug(slug);
  const [order, setOrder] = useState<string>("seq");
  const [idx, setIdx] = useState<number>(0);
  const [flip, setFlip] = useState<boolean>(false);
  const [known, setKnown] = useState<number>(0);
  const [list, setList] = useState<number[]>([]);
  const [detail, setDetail] = useState<d.Full | null>(null);

  useEffect(() => {
    const [a, b] = d.stackRange(slug);
    const arr: number[] = [];
    for (let i = a; i < b; i++) arr.push(i);
    setList(order === "rand" ? shuffleArr(arr) : arr);
    setIdx(0);
    setFlip(false);
    setKnown(0);
  }, [slug, order]);

  const cur = list[idx];
  const lite = cur !== undefined ? d.liteAt(cur) : null;

  useEffect(() => {
    setDetail(null);
    d.loadDict(slug).then(() => setDetail(lite ? d.full(slug, lite.term) : null));
  }, [cur]);

  if (!stack) return h(Empty, null, "技术栈不存在");

  function mark(ok: boolean) {
    if (ok && lite) {
      const st = srs.ensureScheduled(srs.loadReview(), lite.slug, lite.term);
      srs.saveReview(st);
      setKnown(known + 1);
    }
    vibrate();
    setFlip(false);
    setIdx(idx + 1);
  }

  if (lite && idx >= list.length) {
    return h(
      "div",
      { class: "page" },
      h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "本轮完成")),
      h("div", { class: "content" },
        h(Card, null,
          h("div", { class: "center" },
            h("div", { style: "font-size:40px" }, "🎉"),
            h("div", { class: "mt8 bold" }, "本轮 " + list.length + " 词，认识 " + known + " 个")
          )
        ),
        h(Btn, { primary: true, onClick: () => { setIdx(0); setKnown(0); setList(order === "rand" ? shuffleArr(list) : list.slice()); } }, "再来一轮"),
        h(Link, { to: "/review", cls: "btn ghost" }, "去复习")
      ),
      h(TabBar, { active: "review" })
    );
  }

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" },
      h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"),
      h("h1", null, stack.name + " " + (idx + 1) + "/" + list.length),
      h("button", { class: "tb-btn right", onClick: () => setOrder(order === "seq" ? "rand" : "seq") }, order === "seq" ? "顺序" : "随机")
    ),
    h("div", { class: "content" },
      h("div", { class: "bar mb12" }, h("i", { style: "width:" + Math.round(((idx + 1) / Math.max(1, list.length)) * 100) + "%" })),
      lite
        ? h("div", { class: "card tap", onClick: () => setFlip(!flip) },
            h("div", { class: "tiny mute" }, (d.stackBySlug(lite.slug) || { name: "" }).name + " · " + (flip ? "释义" : "点击翻面")),
            h("div", { class: "term mono mt8", style: "font-size:30px" }, lite.term),
            lite.phonetic ? h("div", { class: "tiny mute mt8" }, lite.phonetic) : null,
            flip
              ? h("div", null,
                  h("div", { class: "def mt12" }, lite.defCn),
                  detail && detail.codeExample ? h("div", { class: "code mt12" }, detail.codeExample) : null,
                  detail && detail.exampleSentences.length ? h("div", { class: "small dim mt12" }, "· " + detail.exampleSentences[0]) : null
                )
              : null,
            h("div", { class: "btn-row mt12" },
              h(Btn, { sm: true, onClick: (e: Event) => { e.stopPropagation(); speak(lite.term); }, disabled: !canSpeak() }, "🔊"),
              h(Btn, { sm: true, onClick: (e: Event) => { e.stopPropagation(); router.navigate("/word/" + lite.slug + "/" + encodeURIComponent(lite.term)); } }, "详情")
            )
          )
        : h("div", { class: "skeleton" }),
      h("div", { class: "btn-row mt12" },
        h(Btn, { onClick: () => mark(false) }, "🙁 不认识"),
        h(Btn, { primary: true, onClick: () => mark(true) }, "😃 认识")
      )
    ),
    h(TabBar, { active: "review" })
  );
}

function shuffleArr(a: number[]): number[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = b[i];
    b[i] = b[j];
    b[j] = t;
  }
  return b;
}

/* ------------------------------------------------------------ 详情 -- */
export function WordPage(props: { slug: string; term: string }) {
  const [full, setFull] = useState<d.Full | null>(null);
  const [missing, setMissing] = useState<boolean>(false);
  const [favs, setFavs] = useState<track.Fav[]>(track.loadFavorites());

  useEffect(() => {
    let alive = true;
    setFull(null);
    setMissing(false);
    d.loadDict(props.slug).then((ok) => {
      if (!alive) return;
      const f = d.full(props.slug, props.term);
      if (f) setFull(f);
      else setMissing(true); // 词条确不存在：给出可返回的提示页，而非永久空白
    });
    return () => {
      alive = false;
    };
  }, [props.slug, props.term]);

  if (!full) {
    return missing
      ? h(Empty, { icon: "🔍" }, "词条不存在或已被移除")
      : h(Loading, { title: props.term || "词条", msg: "加载中…" });
  }
  const isFav = track.isFavorite(favs, full.slug, full.term);

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, full.term)),
    h("div", { class: "content" },
      h(Card, null,
        h("div", { class: "row between" },
          h("div", { class: "term mono", style: "font-size:28px" }, full.term),
          h("button", { class: "btn sm", onClick: () => speak(full.term), disabled: false }, canSpeak() ? "🔊" : "🔇")
        ),
        h("div", { class: "tiny mute mt8" }, full.phonetic + " " + full.pos),
        h("div", { class: "mt8" },
          h(Chip, { kind: d.freqName(full.freq) }, d.freqName(full.freq) === "high" ? "高频" : d.freqName(full.freq) === "mid" ? "中频" : "低频"),
          h(Chip, null, "难度 " + full.difficulty),
          h(Chip, null, (d.stackBySlug(full.slug) || { name: "" }).name)
        ),
        h("div", { class: "def mt12" }, full.defCn),
        full.defEn ? h("div", { class: "defen mt8" }, full.defEn) : null
      ),
      full.tags.length ? h(Card, { title: "标签" }, h("div", { class: "row wrap" }, full.tags.map((t) => h(Chip, null, t)))) : null,
      full.codeExample ? h(Card, { title: "代码示例" }, h("div", { class: "code" }, full.codeExample)) : null,
      full.exampleSentences.length
        ? h(Card, { title: "例句" }, full.exampleSentences.map((s) => h("div", { class: "small", style: "margin-bottom:8px" }, "· " + s)))
        : null,
      h("div", { class: "btn-row" },
        h(Btn, {
          onClick: () => {
            setFavs(track.toggleFavorite(full.slug, full.term));
            toast(isFav ? "已取消收藏" : "已收藏");
          },
        }, isFav ? "★ 取消收藏" : "☆ 收藏"),
        h(Btn, {
          primary: true,
          onClick: () => {
            srs.saveReview(srs.ensureScheduled(srs.loadReview(), full.slug, full.term));
            toast("已加入复习");
          },
        }, "＋ 加入复习")
      )
    )
  );
}

/* ------------------------------------------------------------ 词库 -- */
export function StackPage(props: { slug: string }) {
  const stack = d.stackBySlug(props.slug);
  const [q, setQ] = useState<string>("");
  const [freq, setFreq] = useState<string>("all");
  const [limit, setLimit] = useState<number>(30);

  const list = useMemo(() => {
    const [a, b] = d.stackRange(props.slug);
    const out: d.Lite[] = [];
    const t = q.trim().toLowerCase();
    for (let i = a; i < b; i++) {
      const l = d.liteAt(i);
      if (freq !== "all" && d.freqName(l.freq) !== freq) continue;
      if (t && l.term.toLowerCase().indexOf(t) < 0 && l.defCn.toLowerCase().indexOf(t) < 0) continue;
      out.push(l);
    }
    return out;
  }, [props.slug, q, freq]);

  if (!stack) return h(Empty, null, "技术栈不存在");

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, stack.name)),
    h("div", { class: "content" },
      h("input", {
        class: "input mb12",
        placeholder: "在本栈内搜索…",
        value: q,
        onInput: (e: any) => setQ(e.target.value),
      }),
      h(Seg, {
        options: [{ key: "all", label: "全部" }, { key: "high", label: "高频" }, { key: "mid", label: "中频" }, { key: "low", label: "低频" }],
        value: freq,
        onChange: setFreq,
      }),
      h("div", { class: "tiny mute mb8" }, list.length + " 词 · " + stack.high + " 高频"),
      list.slice(0, limit).map((l) =>
        h(Link, { to: "/word/" + l.slug + "/" + encodeURIComponent(l.term), cls: "item" },
          h("div", { class: "row between" },
            h("div", { class: "grow" },
              h("div", { class: "t mono" }, l.term),
              h("div", { class: "d ellipsis" }, l.defCn)
            ),
            h(Chip, { kind: d.freqName(l.freq) }, d.freqName(l.freq) === "high" ? "高" : d.freqName(l.freq) === "mid" ? "中" : "低")
          )
        )
      ),
      limit < list.length ? h(Btn, { onClick: () => setLimit(limit + 30) }, "加载更多（还有 " + (list.length - limit) + " 个）") : null,
      h("div", { class: "btn-row mt12" },
        h(Link, { to: "/learn/" + props.slug, cls: "btn" }, "开始背词"),
        h(Link, { to: "/stack/" + props.slug + "/words", cls: "btn" }, "全量词表")
      )
    )
  );
}

/* ------------------------------------------------------------ 全量表 -- */
export function StackWordsPage(props: { slug: string }) {
  const stack = d.stackBySlug(props.slug);
  const [limit, setLimit] = useState<number>(60);
  const [exporting, setExporting] = useState<boolean>(false);

  const list = useMemo(() => {
    const [a, b] = d.stackRange(props.slug);
    const out: d.Lite[] = [];
    for (let i = a; i < b; i++) out.push(d.liteAt(i));
    return out;
  }, [props.slug]);

  function exportImg() {
    if (!hasMiniTool()) {
      toast("请在小红书 App 内使用导出");
      return;
    }
    setExporting(true);
    const rows = list.map((l) => l.term + "　" + l.defCn);
    const pages = drawTextTable(stack ? stack.name + " 词表" : "词表", rows, 24);
    if (!pages.length) {
      setExporting(false);
      toast("生成失败");
      return;
    }
    writeTempFile(pages[0]).then((p) => {
      if (!p) {
        setExporting(false);
        toast("生成失败");
        return;
      }
      return saveImage(p).then((r) => {
        setExporting(false);
        toast(r.ok ? "已保存到相册（第 1 页/共 " + pages.length + " 页）" : "保存失败");
      });
    });
  }

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, (stack ? stack.name : "") + " 全量词表")),
    h("div", { class: "content" },
      h("div", { class: "tiny mute mb8" }, "共 " + list.length + " 词，轻量化列表"),
      list.slice(0, limit).map((l) =>
        h("div", { class: "item" },
          h("div", { class: "row between" },
            h("div", { class: "grow" }, h("div", { class: "t mono small" }, l.term), h("div", { class: "d small" }, l.defCn)),
            h(Link, { to: "/word/" + l.slug + "/" + encodeURIComponent(l.term), cls: "chip" }, "详情")
          )
        )
      ),
      limit < list.length ? h(Btn, { onClick: () => setLimit(limit + 60) }, "加载更多") : null,
      h(Btn, { onClick: exportImg, disabled: exporting }, exporting ? "生成中…" : "🖼 导出为图片（保存到相册）")
    )
  );
}

/* ------------------------------------------------------------ 搜索 -- */
export function SearchPage() {
  const [q, setQ] = useState<string>("");
  const [stack, setStack] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [res, setRes] = useState<{ items: d.Lite[]; total: number; facets: any[] }>({ items: [], total: 0, facets: [] });

  useEffect(() => {
    const t = setTimeout(() => {
      const r = search.search(q, stack, page, 20);
      setRes(r);
    }, 120);
    return () => clearTimeout(t);
  }, [q, stack, page]);

  const isCn = /[\u4e00-\u9fff]/.test(q);

  return h(
    "div",
    { class: "page" },
    h("div", { class: "topbar" }, h("button", { class: "tb-btn", onClick: () => router.back() }, "‹ 返回"), h("h1", null, "搜索")),
    h("div", { class: "content" },
      h("input", { class: "input", placeholder: "搜索术语 / 中文释义 / 标签…", value: q, onInput: (e: any) => { setQ(e.target.value); setPage(1); } }),
      res.facets.length
        ? h("div", { class: "row wrap mt12" },
            h(Chip, { kind: stack === "" ? "on" : "", onClick: () => setStack("") }, "全部 " + res.total),
            res.facets.map((f: any) => h(Chip, { kind: stack === f.slug ? "on" : "", onClick: () => setStack(f.slug) }, f.icon + " " + f.name + " " + f.count))
          )
        : null,
      isCn ? h("div", { class: "tiny mute mt8" }, "中文搜索：匹配中文释义，可用来做「中译英」反查") : null,
      h("div", { class: "mt12" },
        res.items.map((l) =>
          h(Link, { to: "/word/" + l.slug + "/" + encodeURIComponent(l.term), cls: "item" },
            h("div", { class: "t mono" }, l.term),
            h("div", { class: "d ellipsis" }, l.defCn),
            h("div", { class: "tiny mute mt8" }, (d.stackBySlug(l.slug) || { name: "" }).name)
          )
        )
      ),
      res.items.length === 0 && q ? h(Empty, { icon: "🔍" }, "没有匹配的词条") : null,
      h("div", { class: "btn-row mt12" },
        h(Btn, { sm: true, onClick: () => setPage(Math.max(1, page - 1)), disabled: page <= 1 }, "上一页"),
        h(Btn, { sm: true, onClick: () => setPage(page + 1), disabled: res.items.length < 20 }, "下一页")
      )
    ),
    h(TabBar, { active: "daily" })
  );
}
