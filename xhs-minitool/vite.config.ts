import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// 目标：产出「经典脚本 + 单文件 CSS」的离线 zip 内容。
// - format: iife + inlineDynamicImports：不使用 ES module（容器禁止 type="module"）
// - target: es2017：对齐 Chrome 61 基线
export default defineConfig({
  plugins: [preact()],
  esbuild: { target: "es2017" },
  build: {
    target: "es2017",
    outDir: "dist",
    assetsDir: "assets",
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 8192,
    minify: "esbuild",
    // 关闭 CSS 压缩：esbuild 会把 left/top/right/bottom 合并成 inset（Chrome 87+），
    // 以及其他超出 Chrome 61 基线的简写，必须保留作者手写的物理属性。
    cssMinify: false,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/app.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
