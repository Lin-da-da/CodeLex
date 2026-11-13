import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import * as router from "./router";
import * as data from "./core/data";
import { Empty, Link, ErrorBoundary, Loading } from "./components/ui";

import DailyPage from "./pages/daily";
import QuizPage from "./pages/quiz";
import ReviewPage from "./pages/review";
import { SpeakPage, MinePage } from "./pages/hub";
import { LearnPage, WordPage, StackPage, StackWordsPage, SearchPage } from "./pages/learn";
import { KitPage, DrillsPage, PronPage, WritingPage, RolesPage } from "./pages/kit";
import { ArticlesPage, ArticlePage } from "./pages/read";
import { MistakesPage, FavoritesPage, StatsPage, PlanPage, PathPage, SettingsPage } from "./pages/manage";
import InterviewPage from "./pages/interview";

export default function App() {
  const [r, setR] = useState<router.Route>(router.current());

  useEffect(() => {
    return router.subscribe((next) => {
      setR(next);
      try {
        window.scrollTo(0, 0);
      } catch (e) {
        /* noop */
      }
    });
  }, []);

  /**
   * 数据未就绪（async 脚本尚在后台加载）时，只渲染可交互外壳：
   * 顶部栏 + 底部 tabBar 立即可点，不会渲染任何依赖 window.__CLX_* 的页面，
   * 从根本上杜绝「首屏在数据缺失时抛错 → 被错误边界替换 → 看似白屏/按钮失效」。
   * 数据脚本到位后，main.tsx 的轮询会触发此处重渲染，自动切换到真实页面。
   */
  if (!data.dataReady()) {
    return h(ErrorBoundary, null, h(Loading, { title: "CodeLex 程序员英语", tab: "daily" }));
  }

  const q = r.q;
  let view: any;
  switch (r.name) {
    case "daily":
      view = h(DailyPage, { q });
      break;
    case "quiz":
      view = h(QuizPage, null);
      break;
    case "review":
      view = h(ReviewPage, null);
      break;
    case "speak":
      view = h(SpeakPage, null);
      break;
    case "mine":
      view = h(MinePage, null);
      break;
    case "learn":
      view = h(LearnPage, { slug: r.p1 });
      break;
    case "word":
      view = h(WordPage, { slug: r.p1, term: r.p2 });
      break;
    case "stack":
      view = r.p2 === "words" ? h(StackWordsPage, { slug: r.p1 }) : h(StackPage, { slug: r.p1 });
      break;
    case "search":
      view = h(SearchPage, null);
      break;
    case "kit":
      view = h(KitPage, null);
      break;
    case "drills":
      view = h(DrillsPage, null);
      break;
    case "pron":
      view = h(PronPage, null);
      break;
    case "writing":
      view = h(WritingPage, null);
      break;
    case "roles":
      view = h(RolesPage, null);
      break;
    case "articles":
      view = h(ArticlesPage, null);
      break;
    case "article":
      view = h(ArticlePage, { slug: r.p1 });
      break;
    case "interview":
      view = h(InterviewPage, null);
      break;
    case "mistakes":
      view = h(MistakesPage, null);
      break;
    case "favorites":
      view = h(FavoritesPage, null);
      break;
    case "stats":
      view = h(StatsPage, null);
      break;
    case "plan":
      view = h(PlanPage, null);
      break;
    case "path":
      view = h(PathPage, null);
      break;
    case "settings":
      view = h(SettingsPage, null);
      break;
    default:
      view = h(
        "div",
        { class: "page" },
        h(Empty, { icon: "🧭" }, "页面不存在"),
        h(Link, { to: "/daily", cls: "btn" }, "回到首页")
      );
  }
  // 错误边界包住整个路由视图：任何页面抛错都降级为可操作的错误页，绝不白屏
  return h(ErrorBoundary, null, view);
}
