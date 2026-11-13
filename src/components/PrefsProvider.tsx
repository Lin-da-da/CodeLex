"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Prefs = {
  showEn: boolean;
  toggleEn: () => void;
};

const Ctx = createContext<Prefs>({ showEn: false, toggleEn: () => {} });

const KEY = "codelex:showEn";

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [showEn, setShowEn] = useState(false);

  useEffect(() => {
    setShowEn(localStorage.getItem(KEY) === "1");
  }, []);

  function toggleEn() {
    setShowEn((v) => {
      const nv = !v;
      try {
        localStorage.setItem(KEY, nv ? "1" : "0");
      } catch {
        /* noop */
      }
      return nv;
    });
  }

  return <Ctx.Provider value={{ showEn, toggleEn }}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  return useContext(Ctx);
}
