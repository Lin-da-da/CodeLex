// 本地账号系统（零数据库，纯浏览器 localStorage）。
// 用于「账号 + 密码 + 验证码」登录；密码以 SHA-256 哈希存储，不保存明文。
import { checkPassword } from "./passwordStrength";

const ACCOUNTS_KEY = "codelex:accounts";
const SESSION_KEY = "codelex:session";

export interface LocalAccount {
  username: string;
  pwHash: string;
  createdAt: number;
}

export interface LocalUser {
  id: string;
  username: string;
}

async function sha256(s: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(s)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // 兜底（非浏览器环境，正常不会走到）
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return "fb-" + h;
}

function loadAccounts(): LocalAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAccounts(list: LocalAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

export function isUsernameTaken(username: string): boolean {
  const u = username.trim().toLowerCase();
  return loadAccounts().some((a) => a.username.toLowerCase() === u);
}

export function getCurrentUser(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

export async function register(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const uname = username.trim();
  if (uname.length < 3) return { ok: false, error: "账号至少 3 个字符" };
  if (!/^[A-Za-z0-9_-]+$/.test(uname))
    return { ok: false, error: "账号仅限字母、数字、下划线、连字符" };
  if (isUsernameTaken(uname)) return { ok: false, error: "该账号已被注册" };

  const pw = checkPassword(password);
  if (!pw.ok) return { ok: false, error: pw.message };

  const hash = await sha256(password);
  const account: LocalAccount = {
    username: uname,
    pwHash: hash,
    createdAt: Date.now(),
  };
  const all = loadAccounts();
  all.push(account);
  saveAccounts(all);

  const user: LocalUser = { id: uname, username: uname };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return { ok: true };
}

export async function login(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const uname = username.trim();
  const acc = loadAccounts().find(
    (a) => a.username.toLowerCase() === uname.toLowerCase()
  );
  if (!acc) return { ok: false, error: "账号不存在" };
  const hash = await sha256(password);
  if (hash !== acc.pwHash) return { ok: false, error: "密码错误" };
  const user: LocalUser = { id: acc.username, username: acc.username };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return { ok: true };
}

export function signOut() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
