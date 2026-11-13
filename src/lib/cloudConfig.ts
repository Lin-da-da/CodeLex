// WorkBuddy 云服务公开配置（来自 cloud-service activate 返回的 publicConfig）。
// 这三个值是唯一可以安全放进前端源码的公开值（会随产物暴露给浏览器，属预期）。
// endpoint 为当前应用的发布域名；因复用同一 applicationId 发布，域名保持稳定。
export const cloudConfig = {
  endpoint: "https://codelex-word-learn.app.workbuddy.host",
  oauthRelayBaseUrl: "https://www.workbuddy.cn/v2/as/genie-baas/oauth",
  publishableKey:
    "wbpk_K2BAWf2BFmPK0xYAtfk0ts_wo4Yk3mjz4QhPBpqC8mcoBYrdEBrUE2a",
};
