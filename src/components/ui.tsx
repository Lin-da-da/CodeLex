import Link from "next/link";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* 通用 UI 原语：统一设计语言（卡片 / 按钮 / 标题 / 统计 / 徽标等）           */
/* -------------------------------------------------------------------------- */

type DivProps = React.HTMLAttributes<HTMLDivElement>;

/** 玻璃拟态卡片。 */
export function Card({
  className = "",
  children,
  hover = false,
  ...rest
}: { className?: string; hover?: boolean; children: ReactNode } & DivProps) {
  return (
    <div className={`card ${hover ? "card-hover" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}

type BtnVariant = "primary" | "ghost" | "amber" | "rose";

/** 统一按钮。可作为按钮或链接（传 href）。 */
export function Btn({
  href,
  variant = "primary",
  className = "",
  children,
  ...rest
}: {
  href?: string;
  variant?: BtnVariant;
  className?: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `btn ${
    variant === "primary"
      ? "btn-primary"
      : variant === "ghost"
      ? "btn-ghost"
      : variant === "amber"
      ? "btn-amber"
      : "btn-rose"
  } ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

/** 页面头部：返回链接 + 标题 + 副标题。 */
export function PageHeader({
  back,
  title,
  subtitle,
  icon,
  actions,
}: {
  back?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7">
      {back && (
        <Link href={back} className="text-sm text-slate-400 transition hover:text-slate-200">
          ← 返回
        </Link>
      )}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {icon && <span className="text-2xl">{icon}</span>}
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** 区块标题。 */
export function SectionTitle({
  children,
  hint,
  className = "",
}: {
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between ${className}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
        {children}
      </h2>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}

/** 统计卡片（带图标 + 数值 + 标签）。 */
export function Stat({
  label,
  value,
  sub,
  icon,
  accent = "emerald",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: "emerald" | "amber" | "sky" | "rose";
}) {
  const accentMap: Record<string, string> = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
    rose: "text-rose-300",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {icon && (
          <span
            className={`grid h-6 w-6 place-items-center rounded-md bg-slate-800/70 ${accentMap[accent]}`}
          >
            {icon}
          </span>
        )}
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${accentMap[accent]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

/** 空状态。 */
export function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-10 text-center">
      <p className="text-lg font-semibold text-slate-200">{title}</p>
      {desc && <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{desc}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

/** 进度条。 */
export function ProgressBar({
  value,
  max = 100,
  className = "",
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-800 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** 胶囊标签。 */
export function Tag({
  children,
  active = false,
  as = "span",
  ...rest
}: {
  children: ReactNode;
  active?: boolean;
  as?: "span" | "button" | "a";
} & React.HTMLAttributes<HTMLElement>) {
  const cls = `chip ${active ? "chip-active" : ""}`;
  if (as === "button") {
    return (
      <button type="button" className={cls} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  }
  if (as === "a") {
    return (
      <a className={cls} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return <span className={cls} {...rest}>{children}</span>;
}
