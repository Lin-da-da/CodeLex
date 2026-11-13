# Supabase 接入指南（CodeLex 跨设备用户系统）

CodeLex 的学习进度（复习队列 / 认识·生词标记 / 测验成绩 / 文章生词标记）默认保存在**浏览器 localStorage**，
零配置即可 `npm run dev`。当你希望「进度 / 复习 / 收藏」**跨设备同步**时，按本指南接入 Supabase。

> 未配置 Supabase 时，应用自动降级为本地存储，所有功能照常可用；配置后无需改动任何业务代码。

---

## 1. 新建 Supabase 项目

1. 打开 https://app.supabase.com 新建项目（免费版即可）。
2. 进入 **Project Settings → API**，复制：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 密钥 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. 初始化数据库（4 张表 + 行级安全）

在 **SQL Editor** 中新建查询，粘贴 `supabase/schema.sql` 的全部内容并执行。
该脚本会创建：

| 表 | 用途 |
| --- | --- |
| `review_records` | SRS 复习状态（ease / interval / due / reps） |
| `user_words` | 用户对单词的标记：mastered（认识）/ unknown（生词）/ favorite（收藏） |
| `quiz_results` | 测验成绩（分数、总数、错题词） |
| `article_marks` | 文章内联查词时标记的生词 |

所有表均开启 **Row Level Security (RLS)**，并配置 `USING (auth.uid() = user_id)` 策略——
用户只能读写自己的数据，天然实现多租户隔离。

## 3. 配置环境变量

复制 `.env.example` 为 `.env.local`（Next.js 自动加载），填入第 1 步的两项：

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
```

重启 `npm run dev` 后，导航栏右上角即可「登录 / 注册 / 退出」。

## 4.（可选）启用 GitHub 登录

1. 在 **Authentication → Providers** 中开启 **GitHub**。
2. 在 GitHub 创建 OAuth App，Callback URL 填：
   `<你的 Supabase 站点 URL>/auth/v1/callback`
3. 把 GitHub App 的 **Client ID / Client Secret** 填回 Supabase 控制台（不是本机 `.env`）。
4. 应用内 `/login` 页的「使用 GitHub 登录」按钮会通过 Supabase 托管回调，
   回调落地页为 `/auth/callback`（`exchangeCodeForSession` 换取会话后跳回首页）。

## 5. 工作原理（双轨同步）

```
未登录  →  仅读写 localStorage（codelex:review 等）
已登录  →  挂载时合并「本地 + 远端」；每次变更同时写本地并 upsert 远端
```

- `src/lib/useReviewState.ts`：复习状态的统一 Hook（合并 + 增量 upsert）。
- `src/lib/userData.ts`：6 个同步函数，全部在 `getSupabase()` 返回 `null` 时自动降级。
- `src/components/AuthProvider.tsx`：全局登录态（监听 `onAuthStateChange`）。
- `src/lib/supabase.ts`：`getSupabase()` / `supabaseConfigured()` 单一开关。

## 6. 本地验证

```bash
npm install
npx tsc --noEmit        # 类型检查，应 0 错误
npm run dev             # 未配置 Supabase 时访问各路由应全部 200 并降级
```

配置完 `.env.local` 后再次 `npm run dev`，注册/登录后：
背词标记生词 → 退出 → 其他浏览器/设备登录同一账号 → 「复习」中应能看到同一批待复习词。
