"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { AnalysisStatus } from "@/types/analysis";
import type { ReactElement } from "react";

interface StatusBadgeProps {
  status?: AnalysisStatus | null;
}

interface BadgeConfig {
  label: string;
  className: string;
  icon: (props: { className?: string }) => ReactElement;
  spinning?: boolean;
}

function getConfig(status: AnalysisStatus | null | undefined): BadgeConfig {
  const normalized: AnalysisStatus = status ?? "PENDING";

  switch (normalized) {
    case "PENDING":
      return {
        label: "Pending",
        icon: (props) => <Clock {...props} />,
        className: "bg-amber-100 text-amber-800 border border-amber-200",
      };
    case "RUNNING":
      return {
        label: "Running",
        icon: (props) => <Loader2 {...props} />,
        className: "bg-sky-100 text-sky-800 border border-sky-200",
        spinning: true,
      };
    case "COMPLETED":
      return {
        label: "Completed",
        icon: (props) => <CheckCircle2 {...props} />,
        className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      };
    case "FAILED":
    default:
      return {
        label: "Failed",
        icon: (props) => <AlertCircle {...props} />,
        className: "bg-red-100 text-red-800 border border-red-200",
      };
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = getConfig(status);

  return (
    <Badge className={config.className}>
      {config.icon({
        className: `mr-1 h-3 w-3 ${config.spinning ? "animate-spin" : ""}`,
      })}
      {config.label}
    </Badge>
  );
}
