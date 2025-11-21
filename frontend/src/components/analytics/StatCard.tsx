"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  badges?: string[];
  onClick?: () => void;
}

export function StatCard(props: StatCardProps) {
  const {
    title,
    value,
    subtitle,
    icon: Icon,
    tone = "default",
    badges,
    onClick,
  } = props;

  const clickable = typeof onClick === "function";

  const toneClasses: Record<StatTone, string> = {
    default: "border-border/70 bg-card/80 text-foreground",
    primary:
      "border-indigo-200/80 bg-indigo-50 text-indigo-900 dark:border-indigo-400/50 dark:bg-indigo-950/40 dark:text-indigo-100",
    success:
      "border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-400/50 dark:bg-emerald-950/40 dark:text-emerald-100",
    warning:
      "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-400/50 dark:bg-amber-950/40 dark:text-amber-100",
    danger:
      "border-rose-200/80 bg-rose-50 text-rose-900 dark:border-rose-400/50 dark:bg-rose-950/40 dark:text-rose-100",
    info: "border-violet-200/80 bg-violet-50 text-violet-900 dark:border-violet-400/50 dark:bg-violet-950/40 dark:text-violet-100",
  };

  return (
    <button
      type={clickable ? "button" : "button"}
      onClick={onClick}
      className={cn(
        "flex h-full flex-col items-start justify-between rounded-xl border p-4 text-left shadow-sm transition",
        clickable &&
          "cursor-pointer hover:shadow-md hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        !clickable && "cursor-default",
        toneClasses[tone],
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            {title}
          </p>
          <p className="text-2xl font-semibold leading-tight">{value}</p>
          {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="rounded-full bg-background/60 p-2 text-primary shadow-sm">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {badges && badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-background/80 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
