"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  register,
  login,
  isUsernameTaken,
  type LocalUser,
} from "@/lib/localAuth";
import { checkPassword, type PwResult } from "@/lib/passwordStrength";

function genCaptchaCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  function regenCaptcha() {
    setCaptcha(genCaptchaCode());
    setCaptchaInput("");
  }

  // 客户端生成验证码，避免 SSR / 水合不一致
  useEffect(() => {
    regenCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pw: PwResult = useMemo(() => checkPassword(password), [password]);

  const uname = username.trim();
  const usernameValid =
    uname.length >= 3 && /^[A-Za-z0-9_-]+$/.test(uname);
  const usernameTaken = mode === "signup" && isUsernameTaken(uname);

  function notifyAndGo(user: LocalUser) {
    // 通知 AuthProvider 更新登录态（SPA 内即时刷新，无需整页重载）
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("codelex:auth-changed", { detail: user })
      );
    }
    router.push("/");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!captcha) {
      setError("验证码加载中，请稍候");
      return;
    }
    if (captchaInput.trim() !== captcha) {
      setError("验证码不正确，请重新输入");
      regenCaptcha();
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        if (!usernameValid) {
          setError("账号需 3 位以上，仅限字母、数字、下划线、连字符");
          setBusy(false);
          regenCaptcha();
          return;
        }
        if (usernameTaken) {
          setError("该账号已被注册，请更换");
          setBusy(false);
          regenCaptcha();
          return;
        }
        if (!pw.ok) {
          setError(pw.message);
          setBusy(false);
          regenCaptcha();
          return;
        }
        const r = await register(uname, password);
        if (!r.ok) {
          setError(r.error || "注册失败");
          setBusy(false);
          regenCaptcha();
          return;
        }
        setInfo("注册成功，正在进入…");
        notifyAndGo({ id: uname, username: uname });
      } else {
        const r = await login(uname, password);
        if (!r.ok) {
          setError(r.error || "登录失败");
          setBusy(false);
          regenCaptcha();
          return;
        }
        notifyAndGo({ id: uname, username: uname });
      }
    } finally {
      setBusy(false);
    }
  }

  const strengthColors = ["bg-rose-500", "bg-amber-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-400"];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="card animate-fade-up p-8">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">◆</span>
          <span className="text-lg font-bold tracking-tight">
            {mode === "signin" ? "登录 CodeLex" : "注册 CodeLex"}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          登录后，学习进度、收藏与复习记录将保存在本机浏览器。
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {/* 账号 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              账号
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="3 位以上，字母 / 数字 / _ / -"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
            />
            {mode === "signup" && uname.length > 0 && (
              <p
                className={`mt-1 text-xs ${
                  usernameValid && !usernameTaken
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {usernameTaken
                  ? "该账号已被注册"
                  : usernameValid
                  ? "账号可用"
                  : "账号需 3 位以上，仅限字母、数字、下划线、连字符"}
              </p>
            )}
          </div>

          {/* 密码 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              密码
            </label>
            <input
              type="password"
              required
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              placeholder="不允许弱密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            {mode === "signup" && password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < pw.score ? strengthColors[pw.score] : "bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {pw.checks.map((c) => (
                    <li
                      key={c.label}
                      className={`flex items-center gap-1 text-xs ${
                        c.passed ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      <span>{c.passed ? "✓" : "○"}</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
                {!pw.ok && (
                  <p className="mt-1 text-xs text-rose-400">{pw.message}</p>
                )}
              </div>
            )}
          </div>

          {/* 验证码 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              验证码
            </label>
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-28 select-none items-center justify-center rounded-xl border border-slate-700 bg-slate-950 font-mono text-2xl tracking-[0.4em] text-emerald-300"
                aria-label="验证码"
              >
                {captcha ?? "----"}
              </div>
              <button
                type="button"
                onClick={regenCaptcha}
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                换一张
              </button>
            </div>
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={4}
              placeholder="请输入上方 4 位数字"
              value={captchaInput}
              onChange={(e) =>
                setCaptchaInput(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="input mt-3"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary w-full"
          >
            {busy
              ? "处理中…"
              : mode === "signin"
              ? "登录"
              : "注册并登录"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === "signin" ? (
            <>
              没有账号？{" "}
              <button
                className="text-emerald-400 hover:underline"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setInfo("");
                }}
              >
                注册
              </button>
            </>
          ) : (
            <>
              已有账号？{" "}
              <button
                className="text-emerald-400 hover:underline"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setInfo("");
                }}
              >
                去登录
              </button>
            </>
          )}
        </p>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
