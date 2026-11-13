import fs from "fs";
import path from "path";
import RolesClient, { type RolePack } from "@/components/RolesClient";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "岗位定向词包 · CodeLex",
  description:
    "按 JD 打包必背词：Java 后端、前端、Go 后端、Python、数据、AI 算法、DevOps/SRE、安全，面试前精准突击。",
};

export default function RolesPage() {
  const roles: RolePack[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "roles.json"), "utf-8")
  );
  const total = roles.reduce((n, r) => n + r.terms.length, 0);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <PageHeader
        back="/"
        icon="💼"
        title="岗位定向词包"
        subtitle={`${roles.length} 个岗位 · ${total} 个精选词条 · 按 JD 打包必背词，面试前精准突击`}
      />
      <RolesClient roles={roles} />
    </main>
  );
}
