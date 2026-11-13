# 站点规格卡：CodeLex（编程领域英文学习站）

> 文档性质：全队唯一事实来源（Single Source of Truth）
> 主理人：岳上线　|　撰写角色：文构间（requirement-architect）
> 版本：v1.0　|　日期：2026-10-22　|　锁定状态：G0 已定（技术栈/后端/数据源/MVP 范围已确认）
> 说明：本文档是前端与后端并行开发的唯一契约。任何实现的歧义以本文档为准；变更须经主理人评审后回写此处。

---

## 1. 项目概述与目标用户

**一句话价值主张**：「按技术栈学的编程英文——背词、测验、读源码级文章，生词自动回流复习，让程序员 10 分钟读懂英文技术文档。」

**产品定位**：面向程序员群体的垂直英文学习工具。以"技术栈"为一级分类组织单词库与技术文章，构建「背词 → 测验巩固（SRS 间隔重复）→ 文章内联查词/标记生词回流复习」的学习闭环。

**目标用户**：
- 核心：1–5 年经验、需阅读英文文档/Stack Overflow/源码注释但词汇量不足的后端/前端/算法工程师。
- 外延：准备技术面试（英文术语）、参与开源（PR/Issue 英文沟通）的开发者。
- 非目标：.zero 基础英语学习者、考研/四六级通用英语用户（避免泛化稀释差异化）。

**参赛定位（为什么适合 1024 造物挑战）**：
- 自命題契合：大赛为程序员节应用创作，本作「服务程序员学英文」是程序员写给程序员的工具，主题高度自洽、有记忆点。
- 差异化卖点：
  1. **技术栈维度切分**——不是通用词典，而是 Java/Go/前端等栈专属词库，词例句来自真实工程语境。
  2. **闭环而非碎片**——背词、测验、阅读三件事数据打通，文章里查的生词自动进入复习队列（竞品多为单点工具）。
  3. **代码示例即释义**——每个词配可运行/可读代码片段，符合程序员认知习惯，区别于通用背单词 App。
- 参赛抓手：Demo 即可演示「查一个生词 → 标记 → 出现在今日复习」的完整链路，叙事清晰、可视化强，利于评审快速理解价值。

---

## 2. 站点类型与成功指标

**站点类型**：内容型 + 工具型 SaaS（免费 MVP，含用户账户与学习数据）。

**北极星指标（North Star）**：**周活跃学习时长（周活用户 × 人均有效学习分钟数）**。理由：学习类产品留存取决于"是否真的在用"，时长比注册数更能反映价值交付。

**关键转化动作（核心漏斗）**：
1. 落地页 → 注册/游客试用（首屏 10 秒可开始背词）。
2. 选技术栈 → 进入单词卡学习。
3. 完成一次测验 → 触发 SRS 复习队列。
4. 读文章 → 内联查词并标记生词 → 生词回流复习。
5. 次日回访 → 完成复习队列（衡量留存）。

**可量化 KPI（MVP 上线 2 周内目标）**：

| 指标 | 目标值 | 口径 |
|---|---|---|
| 注册用户 | ≥ 100 | 邮箱/GitHub 成功建号 |
| 周活（WAU） | ≥ 50 | 7 日内有≥1次学习动作 |
| 人均周学习时长 | ≥ 20 分钟 | 背词+测验+阅读累计 |
| 单词卡完成率 | ≥ 60% | 进入学习流后完成当次 session |
| 文章内联查词→标记生词转化率 | ≥ 30% | 查词用户中点击"标记生词"占比 |
| 次日留存 | ≥ 25% | 注册次日回访 |

---

## 3. 站点地图与页面清单

| # | URL 路径 | 用途 | 核心模块 |
|---|---|---|---|
| 1 | `/` | 落地页/首页 | 价值主张、技术栈入口、学习数据概览（登录后）、CTA 注册/开始 |
| 2 | `/stacks` | 技术栈分类导航 | 栈卡片列表（词量/文章数/进度）、筛选 |
| 3 | `/stacks/[slug]` | 技术栈详情 | 该栈单词库入口、文章列表入口、学习进度条 |
| 4 | `/stacks/[slug]/words` | 单词库浏览 | 单词列表（难度/标签筛选）、卡片视图切换 |
| 5 | `/learn/[slug]` | 背词学习流 | 单词卡翻面、标记熟记/生词、进度 |
| 6 | `/review` | SRS 复习队列 | 今日待复习卡片、SM-2 评级（Again/Hard/Good/Easy） |
| 7 | `/quiz` 与 `/quiz/[slug]` | 测验 | 选择题/拼写/听写三种模式、即时反馈、结果页 |
| 8 | `/articles` | 文章列表 | 按栈/难度/标签筛选、阅读进度 |
| 9 | `/articles/[slug]` | 文章详情 | 正文渲染、内联查词弹层、生词标记、高亮 |
| 10 | `/dashboard` | 学习进度看板 | 连续学习天数、各栈掌握度、SRS 分布、错题本入口 |
| 11 | `/favorites` | 收藏/错题本 | 收藏单词、错题记录、复习跳转 |
| 12 | `/search?q=` | 全局搜索 | 跨词库/文章/栈的检索 |
| 13 | `/login` `/register` | 注册登录 | 邮箱密码 + GitHub OAuth |
| 14 | `/settings` | 账户设置 | 资料、学习偏好、数据导出（二期） |

> 二期页面（不在 MVP）：`/admin`（词库后台录入）、`/community`（榜单/分享）、`/article/[slug]/submit`（用户投稿）。

---

## 4. 功能清单

### 4.1 MVP（10-24 前必须可用）

| 功能 | 说明 | 优先级 |
|---|---|---|
| 技术栈分类导航 | 栈列表、进入栈详情、栈内词/文聚合 | P0 |
| 单词卡详情 | 音标 / 词性 / 中英文释义 / 代码示例 / 真题例句 / 标签 / 难度 | P0 |
| 背词学习流 | 翻面学习、标记熟记/生词、跳过 | P0 |
| SRS 复习队列 | 基于 SM-2 的待复习卡片、四级评级、间隔重排 | P0 |
| 测验 | 选择题、拼写、听写三种；即时判分；错题入错题本 | P0 |
| 文章列表与详情 | 列表筛选、Markdown/富文本渲染、阅读进度 | P0 |
| 文章内联查词 | 选中/点击单词弹出释义（调用词库或词典 API） | P0 |
| 生词标记与回流 | 文章内标记生词 → 写入 UserWord(生词) → 进入复习队列 | P0 |
| 用户注册登录 | 邮箱密码 + GitHub OAuth | P0 |
| 学习进度看板 | 连续天数、栈掌握度、SRS 状态分布 | P1 |
| 收藏 / 错题本 | 收藏单词、测验错题回溯与重练 | P1 |
| 全局搜索 | 词库/文章/栈检索 | P1 |

### 4.2 二期（赛后迭代）

| 功能 | 说明 |
|---|---|
| 管理员后台录入词库 | 可视化 CRUD、批量导入校验 |
| 用户投稿/标注文章 | UGC 文章与审核流 |
| 社区榜单与分享 | 学习排行、成就分享卡 |
| 数据导出 / 多端同步 | 学习记录导出、跨设备 |
| 听写 TTS 增强 | 真人/神经语音、跟读评分 |
| 文章生词自动预标注 | NLP 提取低频词预标 |

---

## 5. 数据模型

采用 Prisma + Postgres。以下为实体、字段、类型、主键、关系与约束（最终以 `prisma/schema.prisma` 落地）。

### 5.1 TechStack（技术栈）
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String (cuid) | PK | |
| slug | String | UNIQUE, NOT NULL | URL 标识，如 `java` |
| name | String | NOT NULL | 显示名 |
| description | String? | | 简介 |
| iconUrl | String? | | 图标 |
| order | Int | DEFAULT 0 | 排序 |
| words | Word[] | 1:N | 关联单词 |
| articles | Article[] | 1:N | 关联文章 |

### 5.2 Word（单词）
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String (cuid) | PK | |
| stackId | String | FK→TechStack.id, NOT NULL | 所属栈 |
| term | String | NOT NULL | 单词/短语 |
| phonetic | String? | | 音标 |
| pos | String? | | 词性，如 n./v. |
| defCn | String | NOT NULL | 中文释义 |
| defEn | String? | | 英文释义 |
| codeExample | String? | | 代码示例（代码块） |
| exampleSentence | String? | | 真题/工程例句 |
| tags | String[] | | 标签数组 |
| difficulty | Int | 1–5, DEFAULT 3 | 难度 |
| createdAt | DateTime | DEFAULT now | |

### 5.3 Article（技术文章）
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String (cuid) | PK | |
| stackId | String | FK→TechStack.id, NOT NULL | 所属栈 |
| slug | String | UNIQUE, NOT NULL | |
| title | String | NOT NULL | |
| source | String? | | 来源/作者 |
| license | String? | | 版权说明 |
| contentMd | String | NOT NULL | Markdown 正文 |
| difficulty | Int | 1–5 | |
| estMinutes | Int | | 预估阅读分钟 |
| createdAt | DateTime | | |

### 5.4 User（用户）
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String (cuid) | PK | |
| email | String | UNIQUE | |
| name | String? | | |
| image | String? | | OAuth 头像 |
| provider | String | 'email'\|'github' | |
| createdAt | DateTime | | |
| reviewRecords | ReviewRecord[] | | |
| userWords | UserWord[] | | |
| articleMarks | ArticleMark[] | | |
| quizResults | QuizResult[] | | |

### 5.5 ReviewRecord（SM-2 进度）
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String (cuid) | PK | |
| userId | String | FK→User.id, NOT NULL | |
| wordId | String | FK→Word.id, NOT NULL | |
| ease | Float | DEFAULT 2.5 | SM-2 容易度因子 |
| interval | Int | DEFAULT 0 | 间隔（天） |
| repetitions | Int | DEFAULT 0 | 连续答对次数 |
| dueDate | DateTime | NOT NULL | 下次复习时间 |
| lastReviewed | DateTime? | | |
| UNIQUE | (userId, wordId) | | 每词每用户一条 |

### 5.6 UserWord（收藏/熟记/生词）
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String (cuid) | PK | |
| userId | String | FK | |
| wordId | String | FK | |
| status | String | 'favorite'\|'mastered'\|'unknown' | 收藏/熟记/生词 |
| createdAt | DateTime | | |
| UNIQUE | (userId, wordId, status) | | |

### 5.7 ArticleMark（阅读标记）
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String (cuid) | PK | |
| userId | String | FK | |
| articleId | String | FK | |
| wordId | String? | FK→Word.id | 标记的具体词（可关联或自由文本） |
| rawTerm | String? | | 原文词面 |
| offsetStart | Int? | | 文章内位置 |
| offsetEnd | Int? | | |
| createdAt | DateTime | | |

### 5.8 QuizResult（测验结果）
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String (cuid) | PK | |
| userId | String | FK | |
| quizType | String | 'choice'\|'spelling'\|'dictation' | |
| stackId | String? | FK | |
| score | Int | | 正确数 |
| total | Int | | 总题数 |
| wrongWordIds | String[] | | 错题关联 |
| createdAt | DateTime | | |

> 关系总览：TechStack 1—N Word/Article；User 1—N ReviewRecord/UserWord/ArticleMark/QuizResult；Word 1—N ReviewRecord/UserWord/ArticleMark。级联删除：User 删除时级联其学习数据。

---

## 6. 接口契约表（前后端唯一事实来源）

> 约定：Base URL `/api`。鉴权：带 `Authorization: Bearer <token>` 或 NextAuth session cookie；标注"需登录"的接口未鉴权返回 `401`。所有响应为 JSON，错误体 `{ "error": string, "code": number }`。

### 6.1 词库（Words）
| 路径 | 方法 | 入参 | 出参 | 鉴权 |
|---|---|---|---|---|
| `/api/stacks` | GET | — | `TechStack[]` | 否 |
| `/api/stacks/[slug]/words` | GET | `?difficulty=&tag=&page=` | `{ items: Word[], total }` | 否 |
| `/api/words/[id]` | GET | — | `Word` | 否 |
| `/api/words/search?q=` | GET | `q` | `Word[]` | 否 |

### 6.2 复习（Review / SRS）
| 路径 | 方法 | 入参 | 出参 | 鉴权 |
|---|---|---|---|---|
| `/api/review/due` | GET | `?limit=` | `Word[]`（今日待复习） | 需登录 |
| `/api/review/[wordId]/grade` | POST | `{ grade: 'again'\|'hard'\|'good'\|'easy' }` | `ReviewRecord`（更新后） | 需登录 |
| `/api/review/reset` | POST | `{ wordId }` | `{ ok }` | 需登录 |

### 6.3 测验（Quiz）
| 路径 | 方法 | 入参 | 出参 | 鉴权 |
|---|---|---|---|---|
| `/api/quiz/generate` | POST | `{ stackId?, type, count }` | `{ quizId, questions[] }` | 需登录 |
| `/api/quiz/submit` | POST | `{ quizId, answers[] }` | `{ score, total, wrongWordIds[] }` | 需登录 |
| `/api/quiz/history` | GET | `?page=` | `QuizResult[]` | 需登录 |

### 6.4 文章（Articles）
| 路径 | 方法 | 入参 | 出参 | 鉴权 |
|---|---|---|---|---|
| `/api/articles` | GET | `?stackId=&difficulty=&page=` | `{ items: Article[], total }` | 否 |
| `/api/articles/[slug]` | GET | — | `Article`（含 contentMd） | 否 |
| `/api/articles/[slug]/lookup` | POST | `{ term }` | `Word?`（命中词库）/ `{ found:false }` | 否 |

### 6.5 标记（Marks）
| 路径 | 方法 | 入参 | 出参 | 鉴权 |
|---|---|---|---|---|
| `/api/articles/[slug]/marks` | GET | — | `ArticleMark[]` | 需登录 |
| `/api/articles/[slug]/marks` | POST | `{ wordId?, rawTerm, offsetStart, offsetEnd }` | `ArticleMark` | 需登录 |
| `/api/marks/[id]` | DELETE | — | `{ ok }` | 需登录 |

### 6.6 用户（User / Auth）
| 路径 | 方法 | 入参 | 出参 | 鉴权 |
|---|---|---|---|---|
| `/api/auth/register` | POST | `{ email, password, name? }` | `{ user, token }` | 否 |
| `/api/auth/login` | POST | `{ email, password }` | `{ user, token }` | 否 |
| `/api/auth/github` | GET | OAuth 回调 | session | 否 |
| `/api/user/me` | GET | — | `User` + 学习概要 | 需登录 |
| `/api/user/words` | GET | `?status=` | `UserWord[]` | 需登录 |
| `/api/user/words` | POST | `{ wordId, status }` | `UserWord` | 需登录 |
| `/api/user/dashboard` | GET | — | 进度看板聚合数据 | 需登录 |

> 注意：SM-2 算法（ease/interval/repetitions/dueDate 计算）**只在后端实现**，前端仅传 `grade`，保证复习逻辑单一可信。

---

## 7. 技术栈与托管选型结论

**结论先行**：Next.js 14 App Router + TypeScript + Tailwind CSS + Prisma + Postgres；鉴权用 NextAuth（Auth.js）；部署 Vercel。

**针对 2 天 deadline 的最快落地建议（重点）**：
- **强烈推荐采用 BaaS 而非自建后端**：在 2 天窗口内，自建 Node 后端 + 独立数据库运维会吞噬全部工期。
- **首选方案：Supabase（Postgres + Auth + Storage 一体）**。理由：
  1. Postgres 直接兼容 Prisma schema，无缝迁移。
  2. 自带 Auth（邮箱密码 + GitHub OAuth 开箱即用），省去 NextAuth 与数据库用户表的对接成本。
  3. 自带 REST/Realtime，可作"零后端"数据层，甚至部分接口直接走 Supabase 客户端。
- **备选方案：Vercel Postgres + Vercel KV + NextAuth**。适合已深度绑定 Vercel 的场景；KV 可缓存复习队列/热词。
- **若坚持"Next.js 全栈自含"叙事（评审更顺）**：仍用 Next.js Route Handlers 写 API（满足"全栈"表述），但**数据库与 Auth 托管给 Supabase**，即"代码全栈、基础设施 BaaS"。这是工期与可信度的最优折中。

**自建后端 vs BaaS 取舍与风险**：

| 维度 | 自建后端（Next Route + 自备 DB） | BaaS（Supabase/Vercel） |
|---|---|---|
| 工期 | 高（需建用户/会话/迁移/运维） | 低（小时级接入） |
| 评审叙事 | "纯自研全栈"更完整 | 需说明"全栈代码 + 托管服务" |
| 运维风险 | 高（上线即运维） | 低（托管 SLA） |
| 数据控制 | 完全自有 | 依赖供应商（可导出） |
| 成本 | 自有服务器 | 免费层够 MVP，超量计费 |

> 风险缓解：MVP 阶段接受 BaaS 供应商锁定；Prisma schema 保证未来可平滑迁出自有 Postgres。

---

## 8. 目录结构约定

```
english/
├─ app/                      # App Router 页面与路由处理器
│  ├─ page.tsx               # 首页
│  ├─ stacks/                # 技术栈相关页
│  ├─ learn/                 # 背词学习流
│  ├─ review/                # SRS 复习
│  ├─ quiz/                  # 测验
│  ├─ articles/              # 文章列表/详情
│  ├─ dashboard/             # 看板
│  ├─ favorites/             # 收藏/错题
│  ├─ search/                # 搜索
│  ├─ login/ register/ settings/
│  └─ api/                   # Route Handlers（接口契约落地）
├─ components/               # 复用 UI（WordCard, QuizCard, ArticleReader, Nav…）
├─ lib/                      # 业务逻辑
│  ├─ srs.ts                 # SM-2 算法（唯一实现）
│  ├─ auth.ts                # NextAuth/Supabase 适配
│  ├─ db.ts                  # Prisma client 单例
│  └─ api-client.ts          # 前端请求封装
├─ prisma/
│  ├─ schema.prisma          # 数据模型（第 5 章）
│  └─ seed/                  # 种子词库脚本 + CSV 导入
├─ content/                  # 文章 Markdown 源（技术栈分目录）
│  └─ java/ python/ frontend/ go/ cpp/
├─ types/                    # 共享 TS 类型（前后端共用契约）
└─ docs/                     # 本文档所在
```

---

## 9. 内容 / 数据获取方案

**种子词库字段录入模板（CSV/JSON，供 `prisma/seed` 导入）**：
`stackSlug, term, phonetic, pos, defCn, defEn, codeExample, exampleSentence, tags(;分隔), difficulty(1-5)`
> 短句要求：`exampleSentence` 必须是一句**合适、地道、有语境的短句**（取自真实工程/文档/Stack Overflow 语境），避免孤立单词；`codeExample` 为可运行的简短代码片段，以代码块呈现。

**首批技术栈清单与目标词量（建议默认）**：

| 技术栈 | slug | 目标词量（起步） | 侧重 |
|---|---|---|---|
| Java 后端 | `java` | **≥1000** | 集合/JVM/并发/Spring 术语 |
| Python | `python` | **≥1000** | 数据结构/装饰器/异步/生态库 |
| 前端 | `frontend` | **≥1000** | DOM/React/构建/HTTP |
| Go | `go` | **≥1000** | 并发/Channel/接口/模块 |
| C++ | `cpp` | **≥1000** | 指针/模板/内存/STL |

合计 **≥5000 词** 种子数据（每栈≥1000），每条必须含**代码示例 + 一句合适的短句（exampleSentence）**，优先"高频 + 易混淆 + 真题例句"。2 天内人工录入 5000 条不可行，采用**批量生成管线**：① 用脚本/LLM 按栈生成结构化 JSON（字段见上文模板）；② 脚本校验去重、难度归一、必填项检查；③ 人工抽检（每栈随机 50 条，准确率≥90% 方可入库上线）；④ `prisma/seed` 批量写库。生成结果须可溯源、可重跑。

**文章来源与版权提醒**：
- 仅采用 **开源/授权内容**（如 CC BY 技术博客、官方文档摘录、团队原创），并在 `Article.source`/`license` 字段标注来源与许可。
- **严禁爬取付费/未授权内容**。MVP 文章 5–10 篇/栈，可由团队按"术语密度高"原则原创改写。
- 版权风险：上线前由主理人复核每篇 `license` 字段，缺失则不下发。

**是否需管理员后台录入（建议默认）**：MVP **不需要**后台；词库通过种子脚本/CSV 导入（见第 11 章开放问题⑤）。后台录入列为二期。

---

## 10. 已知风险与缓解

| 风险 | 等级 | 缓解 |
|---|---|---|
| **工期风险（2 天）** | 极高 | 采用 BaaS 省后端；功能砍到 P0；并行开发（前端依本文档接口契约 mock，后端同步实现）；每日 22:00 集成检查点 |
| **词库冷启动** | 低 | 每栈≥1000词覆盖度高；质量靠"代码示例+短句"保证 |
| **词库批量生成可行性** | 极高 | 2天人工录入5000词不可行；必须"LLM/脚本批量生成 + 人工抽检"：先生成结构化JSON，脚本校验去重入库，每栈抽检50条准确率≥90%方可上线；生成须可溯源可重跑 |
| **记忆算法复杂度** | 中 | SM-2 算法仅后端 `lib/srs.ts` 单一实现，前端不重算；先用经典 SM-2 不做变体 |
| **SEO** | 中 | Next.js SSR/SSG 文章页；sitemap + meta；但 MVP 以功能完成为先，SEO 二期 |
| **移动端适配** | 中 | 响应式优先（Tailwind）；不单独做 App（见开放问题④） |
| **评审维度未知** | 高 | 以"完整可演示闭环 + 代码质量 + 主题契合"为基准打磨；保留 Demo 脚本与截图（见开放问题①） |
| **BaaS 供应商锁定/限额** | 低 | Prisma 抽象保证可迁移；免费层足够 MVP |

---

## 11. 待确认开放问题（Open Questions）

| # | 问题 | 当前建议默认值 |
|---|---|---|
| ① | 大赛具体截止时间与评审维度？ | **（建议默认）** 2026-10-24 24:00 前提交"可访问线上 Demo + 源码仓"；评审维度未知时按"功能闭环完整 + 代码整洁 + 主题契合 1024"准备 |
| ② | 鉴权方式？ | **（建议默认）** 邮箱密码 + 可选 GitHub OAuth（Supabase Auth 开箱即用） |
| ③ | 文章是否原创/转载与版权？ | **（建议默认）** 仅用开源/授权内容并标注来源，禁止未授权抓取 |
| ④ | 是否必须移动端适配？ | **（建议默认）** 响应式优先，不单独做 App |
| ⑤ | 是否需要管理员后台录入词库？ | **（建议默认）** MVP 用种子脚本/CSV 导入，后台录入放二期 |
| ⑥ | 首批覆盖哪些技术栈与各自目标词量？ | **（已定）** Java/Python/前端/Go/C++ 五栈，每栈 **≥1000 词**，每条配代码示例 + 短句；手工不可行，采用"批量生成 + 人工抽检"管线（见第 9 章与第 10 章） |

> 以上默认值在主理人未驳回前，团队可按此推进；任何变更须在本文档回写并通知全队。

---

## 12. 里程碑与排期（2 天冲刺，10-24 倒推）

基准：今天 2026-10-22（D-2），截止 2026-10-24 24:00（D-Day）。
并行策略：前端与后端以本文档接口契约为界**并行**；前端先用 mock 数据，后端落地后切换真实 API。

### D-2（10-22，冲刺第 1 天）
| 时段 | 任务 | 负责 | 并行 |
|---|---|---|---|
| 09–10 | 初始化仓库：Next.js 14 + TS + Tailwind + Prisma + Supabase 接入 | 全栈 | — |
| 10–11 | 落地 `prisma/schema.prisma`（第 5 章全部实体） | 后端 | 前端搭页面骨架/路由 |
| 11–13 | 词库批量生成管线（LLM/脚本生成 ≥1000词/栈 JSON + 人工抽检 QA）+ 入库脚本 | 后端/内容 | 前端：首页/栈导航/单词卡 UI |
| 13–15 | Auth（邮箱+GitHub）接口与登录页 | 后端 | 前端：背词学习流 UI |
| 15–17 | 词库/文章 REST 接口（第 6 章 6.1/6.4） | 后端 | 前端：文章列表/详情 + 内联查词 |
| 17–19 | **SM-2 复习队列接口**（6.2）+ `lib/srs.ts` | 后端 | 前端：复习队列 UI |
| 19–21 | 测验接口（6.3）+ 文章标记接口（6.5） | 后端 | 前端：测验 UI + 标记交互 |
| 21–22 | **集成检查点①**：前端切真实 API，跑通"查词→标记→复习"链路 | 全队 | — |

### D-1（10-23，冲刺第 2 天）
| 时段 | 任务 | 负责 | 并行 |
|---|---|---|---|
| 09–11 | 看板/收藏/错题本接口与页面（6.6 + 4.1 P1） | 全栈 | — |
| 11–13 | 全局搜索（6.1 末条） | 后端 | 前端：搜索页 |
| 13–15 | 文章补充至 5–10 篇/栈 + 版权复核 | 内容 | 前端：响应式/移动适配打磨 |
| 15–17 | 联调 + 边界处理（401/空态/加载） | 全栈 | — |
| 17–19 | **集成检查点②**：端到端走查全部 P0 功能 | 全队 | — |
| 19–21 | 部署 Vercel + 域名 +  smoketest | 全栈 | — |
| 21–22 | 评审物料：Demo 脚本、截图、README、源码仓整理 | 主理人 | — |

### D-Day（10-24，截止日）
| 时段 | 任务 |
|---|---|
| 全天（截止前） | 最终回归 + 提交线上 Demo 链接与源码仓；保留回滚预案 |

**关键并行红利**：D-2 上午起前端即可基于本文档 mock 数据并行，后端接口就绪即切换，避免串行等待。两个集成检查点（D-2 21:00 / D-1 17:00）是防止"各自跑通但连不上"的核心闸门。

---

_文档结束。本规格卡为团队唯一事实来源，任何实现疑义以本章节为准；变更须经主理人评审后回写。_
