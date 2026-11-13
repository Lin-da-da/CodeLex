# 词库数据规范（Word Data Spec）

> 范围：CodeLex 首批词库的内容边界、数据格式与输出规范。本文档与 `src/types/index.ts` 的 `WordSeed` 接口、`prisma/schema.prisma` 的 `Word` 模型保持一致。

## 1. 内容范围（Content Scope）

按技术栈组织，首批覆盖 5 个栈；每个栈 **≥1000 词（起步）**，每条必须含**代码示例 + 一句合适的短句**。领域切分如下：

| 技术栈 | slug | 内容重点 |
|---|---|---|
| Java 后端 | `java` | JVM 内存模型、集合框架、并发（线程/锁/并发容器）、泛型、异常、IO/NIO、Stream 与 Lambda、Spring 核心、JDBC |
| Python | `python` | 数据结构、装饰器、生成器、异步 asyncio、GIL、类型注解、上下文管理器、标准库、常用生态（requests/pandas/django）、推导式 |
| 前端 | `frontend` | DOM/BOM、事件、HTML、CSS 盒模型与布局、JS 核心（闭包/原型/Promise）、React（hooks/虚拟 DOM/状态）、HTTP、构建工具、响应式 |
| Go | `go` | goroutine、channel、select、interface、struct/方法、error 处理、模块与包、并发原语（sync）、内存与 GC、泛型 |
| C++ | `cpp` | 指针/引用、动态内存、智能指针、RAII、模板、STL 容器与算法、拷贝控制、移动语义、面向对象、预处理、多线程 |

### 面试频率分层（Frequency Tiers）
每个词带 `frequency` 字段，分三档，用于筛选与优先级：
- `high`（面试高频）：面试/文档中必会的核心术语，优先背、优先测验。
- `mid`（中频）：常见但非必问，巩固即可。
- `low`（低频）：进阶/小众，有余力再覆盖。

**选词原则**：高频 + 易混淆 + 面试/文档相关。避免通用英语词汇，专注"编程领域英文"。

## 2. 数据格式（Field Spec）

每个词为 `WordSeed` 对象：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `term` | string | 是 | 英文单词/短语，同栈内不重复，保留正确大小写 |
| `phonetic` | string \| null | 否 | 音标（IPA），如 `/ˈærəˌreɪ/` |
| `pos` | string \| null | 否 | 词性：`n.` `v.` `adj.` `adv.` `phr.` 等 |
| `defCn` | string | 是 | 中文释义，简洁准确 |
| `defEn` | string \| null | 否 | 英文释义 |
| `codeExample` | string \| null | 否 | 可运行/示意代码片段（≤6 行），入库为 `codeExample` |
| `exampleSentence` | string \| null | **是** | 合适、地道、有语境的英文短句（5–15 词），来自真实工程/文档语境 |
| `exampleSentences` | string[] | 否 | **多条**语境短句（推荐 3 句，8–16 词/句），场景各异。渲染时优先于 `exampleSentence` |
| `tags` | string[] | 否 | 2–4 个标签，小写，如 `["concurrency","jvm"]` |
| `difficulty` | number | 否 | 难度 1–5，默认 3 |
| `frequency` | string | 是 | 面试频率分层：`high`(面试高频) / `mid`(中频) / `low`(低频) |

## 3. 输出规范（Output Spec）

- **文件布局**：`data/seed/<slug>.json`，每栈一个文件；`<slug>` 取 `data/stacks.json` 中的 `slug`。
- **编码**：UTF-8，无 BOM。
- **格式**：单个 JSON 数组，元素为 `WordSeed`；合法 JSON，无尾随逗号。
- **字符串内换行**：`codeExample` 用 `\n` 表示换行；不使用真实换行破坏 JSON。
- **去重**：同栈内 `term`（不区分大小写）唯一。
- **入库映射**：`prisma/seed.mjs` 将 JSON 写入 Postgres；演示层由 `src/lib/wordData.ts` 直接读取 JSON，无需数据库。

## 4. 质量闸门（QA Gate）

- 每栈随机抽检 **50 条**，要求：字段齐全、`defCn` 准确、`exampleSentence` 为完整句子、`codeExample` 语法正确。
- **抽检准确率 ≥ 90%** 方可入库 / 上线。
- 运行 `npm run validate:seed` 做结构校验（必填项、去重、难度区间、tags 类型）。

## 5. 技术栈划分（15 栈）

| 技术栈 | slug | 内容重点 |
|---|---|---|
| Java 语言与生态 | `java` | JVM 内存模型、集合框架、并发（线程/锁/并发容器）、泛型、异常、IO/NIO、Stream 与 Lambda、反射、注解、枚举、record、测试与构建 |
| Spring 框架 | `spring` | IoC/DI、Bean 生命周期、AOP、Spring Boot 自动配置、Web/MVC、Spring Data、事务、Security、Cloud、Reactive |
| Python | `python` | 数据结构、装饰器、生成器、异步 asyncio、GIL、类型注解、上下文管理器、标准库、常用生态、测试与打包 |
| 前端 | `frontend` | DOM/BOM、事件、HTML、CSS 盒模型与布局、JS 核心、React/Vue、状态管理、构建工具、HTTP、测试 |
| Go | `go` | goroutine、channel、select、interface、struct/方法、error 处理、泛型、模块、标准库、工具链 |
| C++ | `cpp` | 指针/引用、动态内存、智能指针、RAII、模板与概念、STL、拷贝与移动、并发、CMake、ABI、性能 |
| AI 智能体 | `agent` | Prompt 工程、RAG、Embedding、向量库、工具调用、MCP、Agent 编排、评测、护栏、可观测性 |
| DevOps / 云原生 | `devops` | 容器、K8s、CI/CD、IaC、可观测性、发布策略、值班与 SLO |
| 算法与数据结构 | `algo` | 复杂度、排序、图论、动态规划、字符串算法、缓存与淘汰、位运算 |
| 数据库 | `db` | SQL、索引、事务与隔离级别、NoSQL、分布式、数据建模、迁移与备份 |
| 机器学习 / 深度学习 | `ml` | 数学基础、训练循环、模型架构、优化、评估、MLOps、推荐与 NLP |
| 网络安全 | `security` | 密码学、认证授权、Web 安全、渗透与安全工程、合规 |
| 系统设计 | `system-design` | 扩展性、缓存、消息队列、一致性、分布式模式、容量与延迟 |
| Rust | `rust` | 所有权、借用、生命周期、trait、泛型、异步、并发、unsafe、工程化 |
| 后端通用 | `backend` | HTTP/REST、API 设计、鉴权、架构模式、消息、可观测性、部署 |

> Java 与 Spring 已拆分：`java` 只保留语言与生态，Spring 相关术语（IoC、注解、MVC、Boot、Data、事务等）迁至 `spring`。

## 6. 规模化生成管线（Scale-up Pipeline）

2 天内人工录入 5000+ 条不可行，采用：
1. **批量生成**：脚本/LLM 按栈生成结构化 JSON（字段同第 2 节），生成规格见 `scripts/vocab-spec.json`。
2. **校验去重**：`scripts/validate-seed.mjs` + 难度归一。
3. **人工抽检**：每栈 50 条，准确率 ≥90%。
4. **入库**：`npm run db:seed`（需 Postgres）。

生成结果须**可溯源、可重跑**。配套脚本：

| 脚本 | 作用 |
|---|---|
| `scripts/merge-seed.mjs` | 合并 `data/seed/<slug>-new*.json` 进基础词库，按 term 去重，并归一 `exampleSentences` |
| `scripts/validate-seed.mjs` | 结构校验（`npm run validate:seed`） |
| `scripts/split-java-spring.mjs` | Java / Spring 词库拆分 |
| `scripts/categorize-articles.mjs` | 为文章打分类标签 |
| `scripts/merge-translations.mjs` | 合并文章中英文对照译文 |
