-- CodeLex 用户数据表（Supabase / Postgres）
-- 在 Supabase 控制台 SQL Editor 中执行本文件即可启用跨设备进度/复习/收藏。
-- 用户身份来自 Supabase Auth（auth.users），下表通过 user_id 关联。

create table if not exists review_records (
  user_id    uuid not null references auth.users(id) on delete cascade,
  stack_slug text not null,
  term       text not null,
  ease       real not null default 2.5,
  interval   int  not null default 0,
  due        timestamptz not null default now(),
  reps       int  not null default 0,
  primary key (user_id, stack_slug, term)
);

create table if not exists user_words (
  user_id uuid not null references auth.users(id) on delete cascade,
  term    text not null,
  status  text not null check (status in ('mastered','unknown','favorite')),
  primary key (user_id, term)
);

create table if not exists quiz_results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  quiz_type   text not null,
  score       int  not null,
  total       int  not null,
  wrong_terms text[],
  created_at  timestamptz default now()
);

create table if not exists article_marks (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  article_slug text not null,
  term        text not null,
  stack_slug  text,
  created_at  timestamptz default now()
);

-- 行级安全：仅本人可读写自己的数据
alter table review_records enable row level security;
alter table user_words     enable row level security;
alter table quiz_results   enable row level security;
alter table article_marks  enable row level security;

create policy "own review" on review_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own words" on user_words
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own quiz" on quiz_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own marks" on article_marks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
