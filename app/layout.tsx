import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { PrefsProvider } from "@/components/PrefsProvider";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "CodeLex · 程序员领域英文学习",
  description: "按技术栈学习编程英文单词与文章：背词、测验、读源码级文章。",
  applicationName: "CodeLex",
  icons: {
    icon:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23020617'/%3E%3Cpath d='M9 16l4 4 10-10' stroke='%2334d399' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CodeLex",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <PrefsProvider>
          <AuthProvider>
            <Nav />
            {children}
          </AuthProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
