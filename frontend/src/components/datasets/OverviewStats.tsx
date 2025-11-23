"use client";

import { StatCard } from "@/components/analytics/StatCard";
import type { StatTone } from "@/components/analytics/StatCard";
import { Table, Sparkles, Target, Clock, ListTree } from "lucide-react";
import type {
  SummaryJson,
  SemanticConfig,
  ColumnSummary,
} from "@/types/analysis";

interface OverviewStatsProps {
  semantic: SemanticConfig | null;
  summaryJson: SummaryJson | undefined;
}

export function OverviewStats(props: OverviewStatsProps) {
  const { semantic, summaryJson } = props;
  const semanticTarget = semantic?.target_column ?? "Not set";
  const semanticTime = semantic?.time_column ?? "Not set";
  const missingValues = summaryJson?.missing_values ?? {};

  const columns = summaryJson?.columns ?? {};
  const columnEntries = Object.entries<ColumnSummary>(columns);

  const totalColumns = summaryJson?.column_count ?? columnEntries.length;

  const totalMissing = Object.values(missingValues).reduce(
    (accumulator, value) =>
      accumulator + (typeof value === "number" ? value : 0),
    0,
  );
  const rowCount = summaryJson?.row_count ?? 0;
  const cellCount =
    rowCount > 0 && totalColumns > 0 ? rowCount * totalColumns : 0;
  const missingPercent =
    cellCount > 0 ? (totalMissing / cellCount) * 100 : undefined;

  const semanticMetrics = Array.isArray(semantic?.metric_columns)
    ? semantic.metric_columns
    : [];

  let dataQualityScore: number | undefined;
  let dataQualityLabel: string | undefined;
  let dataQualityTone: StatTone = "default";

  if (totalColumns > 0) {
    const knownTypeCount = columnEntries.filter(
      ([, col]) => col.type && col.type !== "unknown",
    ).length;
    const typeCoverage = knownTypeCount / totalColumns;

    const missingQuality =
      missingPercent === undefined ? 1 : Math.max(0, 1 - missingPercent / 70);
    const typeQuality = typeCoverage;

    const score = 100 * (0.7 * missingQuality + 0.3 * typeQuality);
    dataQualityScore = Math.round(score);

    if (dataQualityScore >= 85) {
      dataQualityLabel = "Excellent";
      dataQualityTone = "success";
    } else if (dataQualityScore >= 70) {
      dataQualityLabel = "Good";
      dataQualityTone = "primary";
    } else if (dataQualityScore >= 50) {
      dataQualityLabel = "Fair";
      dataQualityTone = "warning";
    } else {
      dataQualityLabel = "Poor";
      dataQualityTone = "danger";
    }
  }

  const targetTone: StatTone =
    semantic && semantic.target_column ? "primary" : "warning";
  const timeTone: StatTone =
    semantic && semantic.time_column ? "info" : "default";

  const metricsTone: StatTone = semanticMetrics.length > 0 ? "info" : "default";
  const keyFields = semanticMetrics.length > 0 ? semanticMetrics : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Records"
        value={rowCount || "—"}
        subtitle="Total rows"
        icon={Table}
        tone="primary"
      />
      <StatCard
        title="Data quality"
        value={dataQualityScore ?? "—"}
        subtitle={
          dataQualityLabel && dataQualityScore !== undefined
            ? `${dataQualityLabel}${
                missingPercent !== undefined
                  ? ` · ${missingPercent.toFixed(1)}% missing`
                  : ""
              }`
            : "Based on missing data and type coverage"
        }
        icon={Sparkles}
        tone={dataQualityTone}
      />
      <StatCard
        title="Target Label"
        value={semanticTarget}
        subtitle={
          semantic?.target_column
            ? "Field representing the outcome or label"
            : "Optional – set to unlock better charts"
        }
        icon={Target}
        tone={targetTone}
      />
      <StatCard
        title="Time field"
        value={semanticTime}
        subtitle={
          semantic?.time_column
            ? "Used for time-based trends and grouping"
            : "Dates, timestamps or elapsed time"
        }
        icon={Clock}
        tone={timeTone}
      />
      <StatCard
        title="Key fields"
        value={keyFields.length > 0 ? keyFields.length : "Not set"}
        subtitle={
          keyFields.length === 0
            ? "Pick important fields to drive metrics"
            : undefined
        }
        badges={keyFields}
        icon={ListTree}
        tone={metricsTone}
      />
    </div>
  );
}
