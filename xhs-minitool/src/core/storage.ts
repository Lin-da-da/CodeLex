/**
 * 存储层：localStorage 为主（同步、简单），客户端 9.46+ 时镜像到平台 Storage 提升持久性。
 * 容器不保证任何存储长期有效，全部读写都做容错。
 */
declare const window: any;

const PREFIX = "clx:";
const KNOWN_KEYS = [
  "review",
  "quizHistory",
  "reviewLog",
  "practiceLog",
  "readArticles",
  "interviewSessions",
  "kitMastered",
  "favorites",
  "mistakes",
  "mistakesMastered",
  "plan",
  "planDone",
  "prefs",
];

export function get<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null || raw === "") return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    return fallback;
  }
}

export function set(key: string, value: any): void {
  let raw = "";
  try {
    raw = JSON.stringify(value);
  } catch (e) {
    return;
  }
  try {
    window.localStorage.setItem(PREFIX + key, raw);
  } catch (e) {
    /* 配额不足：清理最旧日志后重试一次 */
    try {
      window.localStorage.removeItem(PREFIX + "practiceLog");
      window.localStorage.setItem(PREFIX + key, raw);
    } catch (e2) {
      /* 放弃 */
    }
  }
  mirror(key, raw);
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch (e) {
    /* noop */
  }
}

export function clearAll(): void {
  for (let i = 0; i < KNOWN_KEYS.length; i++) remove(KNOWN_KEYS[i]);
}

/* -------------------------------------------------- 平台 Storage 镜像 -- */
function miniTool(): any {
  return window.xhs && window.xhs.miniTool;
}

function clientVersion(): number {
  const lo = window.xhs && window.xhs.launchOptions;
  const bv = lo && lo.miniToolEnv && Number(lo.miniToolEnv.buildVersion);
  return bv ? Math.floor(bv / 1000) : 0;
}

function storageReady(): boolean {
  const mt = miniTool();
  return !!(mt && typeof mt.setStorage === "function" && clientVersion() >= 9460);
}

function mirror(key: string, raw: string): void {
  if (!storageReady()) return;
  try {
    miniTool().setStorage({ key: PREFIX + key, data: raw });
  } catch (e) {
    /* 失败不影响主流程 */
  }
}

/** 启动后异步回补：localStorage 缺失但平台 Storage 有数据时恢复 */
export function hydrate(): Promise<number> {
  if (!storageReady()) return Promise.resolve(0);
  const mt = miniTool();
  const tasks = KNOWN_KEYS.map((k) => {
    if (window.localStorage.getItem(PREFIX + k) !== null) return Promise.resolve(0);
    return mt
      .getStorage({ key: PREFIX + k })
      .then((res: any) => {
        if (!res || typeof res.data !== "string" || !res.data) return 0;
        window.localStorage.setItem(PREFIX + k, res.data);
        return 1;
      })
      .catch(() => 0);
  });
  return Promise.all(tasks).then((arr: number[]) => arr.reduce((a, b) => a + b, 0));
}

export function storageInfo(): Promise<any> {
  const mt = miniTool();
  if (!storageReady() || typeof mt.getStorageInfo !== "function") return Promise.resolve(null);
  return mt.getStorageInfo().catch(() => null);
}
