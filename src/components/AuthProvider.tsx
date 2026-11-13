"use client";

import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  signOut as localSignOut,
  type LocalUser,
} from "@/lib/localAuth";
import { getScopeId, onScopeChange } from "@/lib/scope";

interface AuthValue {
  user: LocalUser | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function readUser(): LocalUser | null {
  try {
    return getCurrentUser();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  // 懒初始化：客户端首帧就拿到真实 scope，避免「先 anon 再切换」多一次无谓的重挂载。
  // 服务端渲染时 getScopeId() 恒为 "anon"，不会触碰 localStorage。
  const [scopeId, setScopeId] = useState(getScopeId);

  useEffect(() => {
    setUser(readUser());
    setLoading(false);
    setScopeId(getScopeId());

    function onAuthChange() {
      setUser(readUser());
    }
    // 登录/注册/退出后即时刷新（无需整页重载）
    window.addEventListener("codelex:auth-changed", onAuthChange);
    // 多标签页同步
    window.addEventListener("storage", onAuthChange);
    // 用户空间变化时更新 scopeId（scope.ts 内部会先刷新缓存再回调）
    const unsubscribe = onScopeChange(() => setScopeId(getScopeId()));
    return () => {
      window.removeEventListener("codelex:auth-changed", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
      unsubscribe();
    };
  }, []);

  function signOut() {
    localSignOut();
    setUser(null);
    window.dispatchEvent(new Event("codelex:auth-changed"));
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {/*
        切换账号 = 切换数据空间：登录 / 登出后，页面里那些
        useEffect(() => { setXxx(loadXxx()) }, []) 的组件必须重新读一次 localStorage，
        否则会把上一个账号的数据继续显示在屏幕上（串号）。

        取舍：这里选「重挂载」而不是 window.location.reload()。
        - 用 key={scopeId} 的 Fragment 包住整棵子树，scope 变化时 React 会卸载后重新挂载，
          所有一次性读取的 effect 自然重跑；Fragment 不产生任何 DOM 节点，UI 外观零变化。
        - 相比 location.reload()：没有白屏与闪烁、不重新拉取 RSC payload 与静态资源、
          不会打断用户正在进行的其它操作；且只需改这一处，不用碰 20+ 个页面文件。
        - 代价：子树里未被持久化的瞬时 UI 状态（滚动位置之外的展开/折叠等）会重置，
          这在「换了个人」的语义下反而是期望行为。
      */}
      <Fragment key={scopeId}>{children}</Fragment>
    </AuthContext.Provider>
  );
}
