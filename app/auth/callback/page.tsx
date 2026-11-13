"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 原 GitHub OAuth 回调页；登录已改为「账号 + 密码 + 验证码」本地方案，
// 此处仅做兼容重定向，避免遗留路由报错。
export default function CallbackPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-slate-400">登录方式已更新，正在跳转…</p>
    </main>
  );
}
