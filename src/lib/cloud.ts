"use client";

import type { WorkBuddyCloudClient } from "@tencent-ai/workbuddy-cloud-sdk";
import { cloudConfig } from "./cloudConfig";

let _client: WorkBuddyCloudClient | null = null;

/**
 * 懒加载并复用云服务客户端。仅在浏览器中初始化（动态 import SDK，避免 SSR 阶段加载）。
 * LLM 调用只在发布后的域名下可用（服务端按 Origin 精确匹配）。
 */
export async function getCloud(): Promise<WorkBuddyCloudClient> {
  if (typeof window === "undefined") {
    throw new Error("cloud client is browser-only");
  }
  if (!_client) {
    const mod = await import("@tencent-ai/workbuddy-cloud-sdk");
    _client = mod.createWorkBuddyCloud({
      endpoint: cloudConfig.endpoint,
      oauthRelayBaseUrl: cloudConfig.oauthRelayBaseUrl,
      publishableKey: cloudConfig.publishableKey,
    });
  }
  return _client;
}

/** 把 LLM 错误转成用户可读的中文提示。 */
export function llmErrorText(e: unknown): string {
  const err = e as { error?: { code?: string; message?: string }; code?: string; message?: string };
  const code = err?.error?.code || err?.code || "";
  if (typeof code === "string" && code) {
    if (code.startsWith("auth_"))
      return "云服务鉴权失败：面试功能需在发布后的域名下使用。";
    if (code.startsWith("quota_"))
      return "配额不足或触发速率限制，请稍后再试。";
    if (code.startsWith("gateway_") || code.startsWith("model_"))
      return "模型服务暂时不可用，请稍后重试。";
    if (code.startsWith("request_")) return "请求参数有误，请重试。";
  }
  return err?.error?.message || err?.message || "面试服务出错，请重试。";
}
