# CodeLex 微信小程序版 · 需求文档（PRD）

> ⚠️ **路线变更（2026-10-24）**：本目录为**微信小程序**方案，与「1024 造物挑战」要求的小红书小工具（离线 H5 zip）是两条不同技术栈。**参赛请看 `docs/xhs-minitool/`**；本目录仅作后续双端扩展的备选存档。
>
> 版本：v1.1 ｜ 日期：2026-10-24 ｜ 状态：待评审（备选路线）
> 基线来源：CodeLex 网页版（Next.js 14，仓库 `C:/IdeaProjects/english`）源码逐项核实
> 目标：在不改动、不影响网页版的前提下，交付一个**功能等价**的微信小程序版本，两版同时在线可访问。
>
> **v1.1 变更**：全部数据口径已用脚本对源码复核（词数/文章数/专项条数/storage key/算法参数均逐项验证）；新增「候选池顺序一致性」约束（§4.2 F2）、F25 搜索入口、§10 网页版已知问题（4 项，较 v1.0 新增第 4 条）、可选 Supabase 通道说明。

---

## 1. 项目背景与目标

### 1.1 背景

CodeLex 是面向程序员、按技术栈组织的英文单词/文章学习站，已上线网页版：
`https://codelex-word-learn.app.workbuddy.host/?sharecode=CDUOZ7NRQL`

网页版现状（**已用脚本逐项核实，非估算**）：

| 项 | 现状 | 核实方式 |
|---|---|---|
| 技术栈 | Next.js 14 App Router + TypeScript + Tailwind（深色 emerald 主题） | `package.json` |
| 词库 | 16 个技术栈 / **7,859** 个词条，`data/seed/<slug>.json` | 遍历 `data/seed/` 求和 |
| 栈清单 | java, python, frontend, go, cpp, agent, devops, algo, db, ml, security, system-design, rust, backend, spring, **interview** | `data/stacks.json`（按 `order` 排序） |
| 文章 | **310** 篇（运行时加载口径 = `articles.json` + 15 个 `articles-<slug>.json`；`interview` 栈无对应文章文件；`*-extra*` 文件运行时**不加载**） | 复刻 `src/lib/articles.ts` 的加载逻辑 |
| 专项数据 | 句型 **60** / 口述 **78**（`oral.json` 46 + `oral-extra-b.json` 40，按 `concept` 去重）/ BQ **30** / 追问链 **45** / 发音 **42** / 写作 **38** / 岗位 **8** | 复刻 `src/lib/interviewKit.ts` |
| 学习数据 | 全部存浏览器 localStorage，16 个 key（详见 §6.2） | 扫描 `codelex:*` 常量 |
| 账号 | 纯本地账号（用户名 + SHA-256 密码），同一设备多账号数据隔离（`src/lib/scope.ts`） | 源码 |
| 可选同步 | `src/lib/supabase.ts` 存在但**未配置环境变量 → 自动降级 localStorage**，线上实为纯本地 | 源码 + `.env.example` |
| 唯一 AI 能力 | `/interview` AI 模拟面试，浏览器端调用 WorkBuddy Cloud SDK（服务端按 Origin 精确匹配） | `src/lib/cloud.ts` / `cloudConfig.ts` |
| 语音 | Web Speech API（TTS，`src/lib/tts.ts`）+ `SpeechRecognition`（ASR），浏览器原生 | 源码 |

### 1.2 目标

1. **功能等价**：小程序版覆盖网页版全部用户可见功能，同一名词条/文章/题目数据保持一致。
2. **零影响**：网页版代码（`app/`、`src/`、`data/`、`package.json`）**一行不改**；小程序为新增目录，两版独立构建、独立发布。
3. **同时在线**：网页版维持现有部署与访问地址；小程序走微信官方发布链路，二者互不影响。
4. **合规可过审**：按小程序审核红线设计，规避强制授权、类目不符、AI 生成内容无安全审核等风险。

### 1.3 非目标（Out of Scope，v1 不做）

- 不做网页版的 UI 重构或功能增强（本阶段只做"平移 + 适配"）。
- 不做网页版与小程序版的**实时**数据互通（v1 各端独立存储；跨端同步列为 v1.1 可选）。
- 不做视频课、社区、UGC、支付/会员。
- 不做 iOS/Android 原生 App、不做微信公众号/H5 版。

---

## 2. 用户与场景

| 角色 | 场景 | 关键诉求 |
|---|---|---|
| 准备面试的程序员 | 通勤/排队时刷题、背词 | 碎片时间、单手操作、离线可用 |
| 日常技术阅读者 | 读技术文章内联查词、标记生词 | 查词快、生词自动回流复习 |
| 英语听说薄弱者 | 跟读打分、60 秒口述、BQ | 录音 + 评分，反馈明确 |
| 已有网页版数据者 | 换到小程序继续学 | 至少不丢数据；可选迁移/同步 |

---

## 3. 总体原则

1. **数据源单一**：小程序不复制、不手写词库；由构建脚本从 `data/` 单向导出（见技术方案 §3）。
2. **离线优先**：核心学习链路（每日 / 背词 / 测验 / 复习 / 搜索 / 收藏）全部离线可用，不依赖网络。
3. **渐进加载**：非核心模块（文章、口语中心、AI 面试）走分包按需下载。
4. **不强制授权**：打开即用，登录/麦克风/相册均为按需触发，拒绝授权不影响浏览。
5. **视觉一致**：沿用网页版深色 emerald 设计语言（主色 `#10b981`，背景 `#020617/#0f172a`），交互降级遵循 `prefers-reduced-motion` 等价处理（小程序内提供"减少动效"开关）。

---

## 4. 功能需求

### 4.1 功能等价矩阵（P0 = 必须，P1 = 应当，P2 = 可选）

| # | 功能 | 网页版路由 | 小程序页面 | 优先级 | 等价度要求 |
|---|---|---|---|---|---|
| F1 | 首页概览（总词数/栈数/每日词速览/入口） | `/` | `pages/home/index` | P0 | 完全一致，含 16 栈卡片、词数与高频数 |
| F2 | 每日一词（按日期确定性选词、回看 7 天、朗读、收藏、加入复习） | `/daily` | `pages/daily/index`（tab） | P0 | 完全一致，含 `?d=` 回看 |
| F3 | 测验（多选技术栈 → 10 题四选一 → 判分 → 错题入库 → 历史） | `/quiz` | `pages/quiz/index`（tab） | P0 | 完全一致 |
| F4 | SRS 复习（到期队列、四档评级、简化 SM-2、批量排期） | `/review` | `pages/review/index`（tab） | P0 | 完全一致，算法参数必须一致 |
| F5 | 背词（栈内翻卡、搜索、顺序/随机、认识/不认识、快捷键→改为手势） | `/learn/[slug]` | `pkgLearn/pages/learn/index` | P0 | 功能一致，交互改为滑动+点击 |
| F6 | 单词详情（释义/例句/代码/标签/难度/频率/朗读/跟读打分/收藏/复习） | `/word/[term]` | `pkgLearn/pages/word/index` | P0 | 完全一致 |
| F7 | 技术栈词库（搜索、频率筛选、分页、收藏、朗读） | `/stacks/[slug]` | `pkgLearn/pages/stack/index` | P0 | 分页改为触底加载 |
| F8 | 全量词表（轻量列表、展开、搜索、导出 Markdown） | `/stacks/[slug]/words` | `pkgLearn/pages/stack-words/index` | P1 | 导出改为"复制/分享文件" |
| F9 | 全局搜索（跨栈、中文反查、栈 facet、分页） | `/search` | `pkgLearn/pages/search/index` | P0 | 一致，改为本地索引实时搜索 |
| F10 | 听说训练（听力辨词、中译英默写、错题入库） | `/drills` | `pkgDrill/pages/drills/index` | P0 | 一致，TTS 改为同声传译插件 |
| F11 | 面试口语中心（句型/口述/BQ/追问链四 Tab、倒计时、已掌握） | `/interview-kit` | `pkgKit/pages/kit/index` | P0 | 完全一致 |
| F12 | 易错发音（IPA、误读、跟读打分 0-100） | `/pronunciation` | `pkgKit/pages/pronunciation/index` | P1 | 一致，ASR 改为同声传译插件 |
| F13 | 英文技术写作（5 类模板、搜索、复制、朗读） | `/writing` | `pkgKit/pages/writing/index` | P1 | 一致，复制改为 `wx.setClipboardData` |
| F14 | 岗位定向词包（8 岗位、批量释义、导出） | `/roles` | `pkgKit/pages/roles/index` | P1 | 一致 |
| F15 | 技术文章列表（分类/栈筛选、已读徽标） | `/articles` | `pkgRead/pages/articles/index` | P0 | 一致 |
| F16 | 文章阅读（仅英/仅中/对照、全文朗读、内联查词、标记生词、已读判定） | `/articles/[slug]` | `pkgRead/pages/article/index` | P0 | 一致，已读判定改为滚动到底 + 15s 兜底 |
| F17 | AI 模拟面试（选题 → 作答 → 评分/点评/追问 → 报告） | `/interview` | `pkgAI/pages/interview/index` | P1 | 一致，实现改为云函数代理 LLM（见 §7.3） |
| F18 | 错题集（多来源汇总、去重计数、弱项分布、标记掌握、清空） | `/mistakes` | `pages/mine/mistakes` | P0 | 完全一致 |
| F19 | 学习统计（连续天数、SRS 数据、近 7 日柱状图、测验均分、最近 8 场） | `/stats` | `pages/mine/stats` | P0 | 一致，图表用 canvas 绘制 |
| F20 | 我的收藏（批量释义、朗读、取消、导出 Anki/CSV/MD） | `/favorites` | `pages/mine/favorites` | P0 | 一致，导出改为分享文件 |
| F21 | 面试冲刺计划（日期/栈/时长 → 生成 60 天任务、勾选） | `/plan` | `pages/mine/plan` | P1 | 完全一致，比例 35/25/25/15 |
| F22 | 学习路径（L1 300 词 / L2 20 篇 / L3 50 练 / L4 3 场面试） | `/path` | `pages/mine/path` | P1 | 一致 |
| F23 | 登录/注册与数据隔离 | `/login` | `pages/mine/login` | P1 | 见 §6（改为微信静默登录） |
| F24 | 设置（中/EN 释义开关、减少动效、清缓存、关于） | 网页版导航条开关 | `pages/mine/settings` | P1 | 新增页，收敛网页版散落的开关 |
| F25 | 全局搜索入口（网页版为导航条常驻搜索框） | 导航条 form → `/search` | 首页 + 每日页顶部搜索框 → `pkgLearn/pages/search/index` | P0 | 入口位置改，功能一致 |

> **说明**：网页版 `/stacks`（栈列表页）**不存在**（只有 `/stacks/[slug]` 与 `/stacks/[slug]/words`），小程序同样不设此页，栈列表由首页 16 栈卡片承担。相关 404 链接属网页版已知问题，见 §10。

### 4.2 各功能详细需求（要点）

#### F2 每日一词
- 选词算法必须与网页版一致：以 **UTC 日期**（`date.toISOString().slice(0,10)`）为种子的 FNV-1a 风格确定性哈希，对全库 `frequency === "high"` **候选池**取模；同一天两端必须得到同一个词。
- **候选池顺序必须一致**（v1.1 新增，易错点）：候选池 = 按 `stacks.json` 的 `order` 升序排列的栈 → 每个栈内按 `seed/<slug>.json` 文件原顺序 → 过滤 `frequency === "high"`。小程序导出的 `core-index` 必须保持这一顺序，否则同日会选出不同单词。
- 支持 `?d=YYYY-MM-DD`（小程序用页面 `options` 参数）回看最近 7 天。

#### F4 SRS 复习
- 简化 SM-2 参数必须与 `src/lib/srs.ts` 完全一致（初始 ease 2.5，interval 序列 1/6/×ease，ease 下界 1.3，评级 quality 映射 again=1/hard=3/good=4/easy=5）。
- "已掌握"判定：`interval >= 21` 天（与统计页一致）。
- 队列为空时提供"一键把所有栈的词加入复习"（对应 `/api/stacks/[slug]/terms` 批量能力，小程序改为本地索引直取）。

#### F9 搜索
- 索引字段与网页版一致：`term + defCn + tags`（**注意：网页版不索引 defEn**，小程序保持一致，避免结果不一致）。
- 中文输入时展示"中译英反查"提示。
- 7,859 条规模下要求本地搜索输入即出结果（无网络请求），首字响应 < 100 ms。

#### F10/F12 语音
- 听力辨词：自动朗读 → 4 选 1。
- 跟读打分：ASR 转写 → 归一化 → Levenshtein 相似度 → 0-100 分，阈值 85 / 60 与网页版一致。
- 麦克风授权需在使用时触发，拒绝后给出引导且不影响其他功能。

#### F17 AI 模拟面试（风险功能）
- 参数：技术栈、初/中/高级、2-5 题、标准/深入/压力。
- 输出：0-10 分、英文表达点评、技术内容点评、地道参考答案、1-2 层追问、最终报告（总分/等级/优劣势/建议/复习术语）。
- 报告中的复习术语自动进错题集。
- **强制要求**：所有用户输入与模型输出均须经内容安全检测；云函数侧做频率限制与超时熔断。
- **降级方案**（审核风险兜底）：提供"题库版模拟面试"开关，直接使用 `bq.json` / `followups.json` / `oral.json` 离线出题，无 AI 依赖。默认策略见 §7.3。

#### F19 学习统计
- 近 7 天柱状图用 canvas 2D 绘制（不引入图表库，控制包体）。
- 统计口径保持与网页版一致（含已知口径差异：streak 仅统计 SRS 复习；L1 统计"已排入 SRS 的词数"）。

---

## 5. 信息架构与页面清单

### 5.1 tabBar（5 项，均在主包）

| tab | 页面 | 图标文案 |
|---|---|---|
| 每日 | `pages/daily/index` | 📅 每日 |
| 测验 | `pages/quiz/index` | 🧪 测验 |
| 复习 | `pages/review/index` | 🔁 复习 |
| 口语 | `pages/speak/index` | 🗣️ 口语 |
| 我的 | `pages/mine/index` | 👤 我的 |

> "口语"tab 为**聚合页**：听说训练、口语中心、发音、写作、岗位词包、AI 模面的入口（对应网页版一级 + 二级"内容与专项"）。
> "我的"tab 为**聚合页**：收藏、错题集、统计、计划、路径、设置、登录（对应网页版二级"进度与管理"）。

### 5.2 分包与页面

| 分包 | 页面 | 体积预估 |
|---|---|---|
| 主包 | home/daily/quiz/review/speak/mine + 公共组件 + **全库精简索引** | < 1.8 MB |
| `pkgLearn` | learn / word / stack / stack-words / search | ~2.5 MB（词条详情） |
| `pkgRead` | articles / article | ~1.2 MB（文章） |
| `pkgKit` | kit / pronunciation / writing / roles / drills | ~0.6 MB |
| `pkgAI` | interview / interview-report | ~0.15 MB（纯代码，数据走云） |

> 体积为导出压缩后的估算，最终以构建产物为准；任一分包不得 ≥ 2 MB，总包不得 ≥ 20 MB（红线）。

### 5.3 导航等价性检查

网页版一级 6 项 + 二级 9 项 = 15 个入口，小程序全部覆盖：
每日 ✅ / 测验 ✅ / 复习 ✅ / 训练 ✅(speak) / 口语 ✅(speak) / 模面 ✅(speak) / 文章 ✅ / 发音 ✅ / 写作 ✅ / 岗位 ✅ / 错题 ✅ / 计划 ✅ / 路径 ✅ / 统计 ✅ / 收藏 ✅，另补"设置"。

---

## 6. 账号与数据

### 6.1 v1 账号方案（推荐）

- **静默登录**：`wx.login` → 云函数换取 openid → 返回自定义登录态；用户无感，**不弹授权、不强制**。
- 未登录（云不可用）时匿名使用，数据存本地 Storage，与网页版"匿名可用"体验一致。
- **不做**手机号授权（`getPhoneNumber` 属高敏能力且需企业主体，v1 不申请）。
- 网页版的"用户名 + 密码本地账号"**不移植**（小程序无跨设备场景意义，且哈希无 salt 安全性不足）。

### 6.2 存储 key 映射

小程序 `wx.getStorageSync` 沿用网页版 key 命名，去掉 `codelex:` 前缀以节省头部并统一命名空间：

| 网页版 key | 小程序 key | 说明 |
|---|---|---|
| `codelex:review` | `clx:review` | SRS 状态 |
| `codelex:quizHistory` | `clx:quizHistory` | 测验历史（≤200） |
| `codelex:reviewLog` | `clx:reviewLog` | 每日复习次数 |
| `codelex:practice-log` | `clx:practiceLog` | 跟读/听力记录（≤1000） |
| `codelex:read-articles` | `clx:readArticles` | 已读文章（≤500） |
| `codelex:interview-sessions` | `clx:interviewSessions` | 面试报告（≤200） |
| `codelex:kit-mastered` | `clx:kitMastered` | 已掌握口述/追问 |
| `codelex:favorites` | `clx:favorites` | 收藏（≤2000） |
| `codelex:mistakes` | `clx:mistakes` | 错题 |
| `codelex:mistakes:mastered` | `clx:mistakesMastered` | 已攻克（≤3000） |
| `codelex:plan` / `codelex:plan:done` | `clx:plan` / `clx:planDone` | 冲刺计划 |
| `codelex:showEn` | `clx:showEn` | 中/EN 开关（全局，不隔离） |
| `codelex:writing:showCn` | `clx:writingShowCn` | 写作中文开关 |
| `codelex:session` | ❌ 不移植 | 网页版登录态（小程序改用 `wx.login` + openid） |
| `codelex:accounts` | ❌ 不移植 | 网页版本地账号库（用户名 + 密码哈希） |

> 另有 2 个非数据 key（`codelex:auth-changed` 事件名、`codelex:scope-migrated:*` 迁移标记）属网页版多账号隔离机制，**小程序单用户场景不需要**，不移植。

- 单账号场景无需 `sk()` 作用域隔离；若 v1.1 引入多账号/跨端，再引入 `u:<uid>` 后缀（与网页版规则同构）。
- **存储上限**：小程序单 key ≤ 1 MB，总 Storage ≤ 10 MB。需为 `clx:review`（7,859 词条上限，单条 ~120 B → 约 0.95 MB）预留风险，**超过 5,000 条时改为分片存储**（`clx:review:0/1/2`），详见技术方案 §5.3。

### 6.3 数据迁移（可选，P2）

- 提供"从网页版导入"入口：网页版"导出学习数据 JSON" → 微信内粘贴/文件上传 → 小程序解析合并。
- v1 先不做自动同步，避免两个端互相覆盖。

---

## 7. 非功能需求

### 7.1 性能

| 指标 | 目标 | 红线 |
|---|---|---|
| 主包大小 | ≤ 1.8 MB | < 2 MB |
| 单分包 | ≤ 1.9 MB | < 2 MB |
| 总包 | ≤ 8 MB | < 20 MB |
| 冷启动（首屏可交互） | ≤ 1.2 s | < 1.5 s |
| 搜索首字响应 | < 100 ms | < 300 ms |
| 翻卡/答题交互帧率 | ≥ 50 fps | 无明显卡顿 |
| 长列表（词表 600+） | 使用 `recycle-view`/分页渲染 | 不可一次性 setData 全量 |

### 7.2 兼容与适配

- 基础库 ≥ 2.25.0；微信 iOS/Android 最新版 + 近两个大版本；适配深色模式与 iOS 安全区、胶囊按钮避让。
- 屏幕：375–430 pt 主流机型 + iPad 兼容布局（非必须美观）。

### 7.3 合规（审核红线）

1. **不强制授权**：打开即用；麦克风仅在跟读时申请；不索取通讯录/位置/相册。
2. **隐私合规**：在小程序后台配置《用户隐私保护指引》并启用 `wx.onNeedPrivacyAuthorization`；`app.json` 声明 `__usePrivacyCheck__: true`；首次调用麦克风/剪贴板前弹隐私协议。
3. **AI 生成内容**：
   - 用户输入与模型输出必须过微信内容安全（`msgSecCheck` / 云调用 `openapi.security.msgSecCheck`）；
   - 界面显著标注"内容由 AI 生成，仅供参考"；
   - 涉及生成式 AI 的服务需具备相应资质/备案 —— **若主体不具备，v1 默认关闭 AI 面试，改上"题库版模拟面试"**（降级开关，见 §7.3 技术方案）。
4. **类目**：选择"工具 → 效率"或"教育 → 教育工具"（最终以小程序后台可选类目为准，见待确认清单 Q2）。
5. **内容版权**：文章数据沿用现有 license 字段展示；不引入未授权第三方内容。
6. **不得出现**：诱导分享、强制关注、测试数据、占位符、外部跳转 H5 链接。

### 7.4 稳定性

- 全局错误兜底：`App.onError` / `onUnhandledRejection` 上报；页面级 try/catch，Storage 读写全部容错。
- 云函数调用失败必须可降级（AI 面试失败 → 提示重试 + 保留离线题库路径）。
- 首屏数据缺失时展示骨架屏/空状态，不允许白屏。

---

## 8. 验收标准

1. 功能等价矩阵 §4.1 中全部 **P0 项**通过逐条比对测试（同一词条、同一栈、同一算法结果一致）。
2. 每日一词在两端同日期返回同一单词（抽检 7 天）。
3. SRS 评级序列在两端一致（同一组词连续 5 次评级后 due/ease 完全一致，误差 0）。
4. 包体与性能指标满足 §7.1 全部红线。
5. 完全离线（飞行模式）下 F1–F9、F11、F15、F16、F18–F22 全部可用。
6. 网页版构建 `npm run build` 与部署结果**无任何变化**（构建 diff 为空、线上地址可访问）。
7. 通过微信开发者工具"体验评分" ≥ 85，无 Blocker 问题。

---

## 9. 待确认问题

见同目录 `04-待确认问题清单.md`（v1.1 共 16 组，含推荐答案）。其中 **Q0/Q1/Q2/Q3/Q4** 为阻塞项，需先决策再进入开发。

---

## 10. 网页版已知问题（本次**不修**，仅决定小程序是否沿用）

> 盘点源码时发现。按"零影响"原则，网页版一律不动；小程序默认**沿用网页版现状**以保证等价，问题统一记入待办。

| # | 问题 | 位置 | 小程序处理（默认 A 方案） |
|---|---|---|---|
| 1 | `/stacks` 页面不存在，但两处链接指向它 → 点击 404 | `PathClient.tsx:76`（L1 推荐入口）、`PlanClient.tsx:129`（词汇阶段） | 小程序不提供此路由，两处入口直接指向栈词库 `/stacks/<slug>` 或首页栈卡片 |
| 2 | L1 文案写"被你评级过的词条"，实际统计"已排入 SRS 的词数"（含未评级） | `PathClient.tsx:73-74` vs 实际统计口径 | 沿用网页版口径（否则两端进度不一致） |
| 3 | "连续学习天数"只统计 SRS 复习，不含文章/训练/面试 | 统计页 | 沿用 |
| 4 | 检索口径不一致：**全局搜索不索引 `defEn`**（`wordData.ts` 的 haystack = term + defCn + tags），但栈词库搜索接口会匹配 `defEn`（`api/stacks/[slug]/words`） | `wordData.ts:48` vs `api/stacks/[slug]/words/route.ts` | 小程序两端各自沿用：全局搜索不含 defEn，栈内搜索含 defEn |

**建议**：这 4 项未来在网页版统一修复，再同步到小程序（属 v1.1+ 范围，非本次交付）。是否接受首发沿用现状，见 Q15。
