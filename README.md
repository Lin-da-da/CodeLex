# CodeLex

面向程序员、按技术栈组织的英文单词与文章学习站。
参赛项目：WorkBuddy「1024 造物挑战」程序员节应用创作大赛。

## 核心闭环
按技术栈背词 → 测验巩固（SRS 间隔重复）→ 阅读技术文章时内联查词 / 标记生词回流复习。

## 快速开始（零数据库）
```bash
npm install
npm run dev
# 打开 http://localhost:3000
```
首批词库以 JSON 形式置于 `data/seed/<slug>.json`，由 `src/lib/wordData.ts` 直接读取，**无需数据库即可运行**。

## 校验词库完整性
```bash
npm run validate:seed
```

## 数据存储说明
发布版本为**零数据库**运行：词库读取 `data/seed/*.json`，学习进度（复习 / 收藏）保存在浏览器 `localStorage`，无需任何后端配置即可使用。若需跨设备同步，可接入 Supabase（在 `.env` 填写 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，参考 `.env.example`）。

## 目录结构
- `app/` Next.js App Router 页面与 API 路由
- `src/types/` 共享类型（词库数据格式）
- `src/lib/wordData.ts` 词库读取（JSON 优先，无需 DB）
- `data/seed/<slug>.json` 各技术栈词库（首批）
- `data/stacks.json` 技术栈元数据
- `prisma/` Prisma schema 与 seed 脚本（生产用）
- `docs/` 需求文档与数据规范

## 词库数据格式
详见 `docs/word-data-spec.md`。
