// 密码强度校验：拒绝弱密码。规则可被 /login 与注册流程复用。

const WEAK_WORDS = new Set([
  "password",
  "passw0rd",
  "12345678",
  "123456789",
  "qwerty",
  "abc123",
  "password1",
  "iloveyou",
  "admin",
  "welcome",
  "letmein",
  "11111111",
  "00000000",
  "qwerty123",
  "1q2w3e4r",
]);

export interface PwCheck {
  label: string;
  passed: boolean;
}

export interface PwResult {
  /** 是否满足最低安全要求（可用于提交） */
  ok: boolean;
  /** 强度评分 0-4 */
  score: number;
  checks: PwCheck[];
  message: string;
}

export function checkPassword(pw: string): PwResult {
  const checks: PwCheck[] = [
    { label: "至少 8 位", passed: pw.length >= 8 },
    { label: "含小写字母", passed: /[a-z]/.test(pw) },
    { label: "含大写字母", passed: /[A-Z]/.test(pw) },
    { label: "含数字", passed: /\d/.test(pw) },
    { label: "含特殊符号 (!@#$…)", passed: /[^A-Za-z0-9]/.test(pw) },
  ];
  const passedCount = checks.filter((c) => c.passed).length;

  const lower = pw.toLowerCase();
  const isWeakWord = WEAK_WORDS.has(lower);
  const allSame = pw.length > 0 && new Set(pw).size === 1;

  const ok = passedCount === checks.length && !isWeakWord && !allSame;
  const score = Math.max(0, Math.min(4, passedCount - 1));

  let message = ok
    ? "密码强度足够"
    : `请满足：${checks.filter((c) => !c.passed).map((c) => c.label).join("、")}`;
  if (isWeakWord) message = "该密码过于常见，请更换";
  if (allSame) message = "密码不能由重复字符组成";

  return { ok, score, checks, message };
}
