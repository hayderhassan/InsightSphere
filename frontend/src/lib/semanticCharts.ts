import type {
  SummaryJson,
  TargetDistributionRow,
  MetricByTargetRow,
  MetricOverTimeRow,
  SemanticConfig,
} from "@/types/analysis";
import type {
  InsightChartKind,
  InsightSeries,
} from "@/components/InsightChart";

export interface InsightChartSpec<TData extends Record<string, unknown>> {
  id: string;
  title: string;
  description?: string;
  kind: InsightChartKind;
  data: TData[];
  xKey: keyof TData & string;
  series: InsightSeries<TData>[];
}

function buildTargetDistributionFallback(
  summary: SummaryJson,
  semantic: SemanticConfig | null,
): TargetDistributionRow[] {
  if (!semantic?.target_column) return [];
  const colName = semantic.target_column;
  const column = summary.columns?.[colName];
  if (!column || !Array.isArray(column.value_counts)) return [];

  const rowCount = summary.row_count ?? 0;
  const total =
    rowCount > 0
      ? rowCount
      : column.value_counts.reduce(
          (acc, vc) => acc + (typeof vc.count === "number" ? vc.count : 0),
          0,
        );

  if (total <= 0) return [];

  return column.value_counts.map((vc) => ({
    target: String(vc.value),
    count: vc.count,
    pct: (vc.count / total) * 100,
  }));
}

export function buildInsightChartSpecs(
  summary: SummaryJson | null | undefined,
): InsightChartSpec<any>[] {
  if (!summary) return [];

  const semantic = summary.semantic_config ?? null;
  const aggregates = summary.semantic_aggregates ?? null;

  const specs: InsightChartSpec<any>[] = [];

  // 1. Outcome distribution
  let targetDistribution: TargetDistributionRow[] = [];

  if (
    aggregates?.target_distribution &&
    Array.isArray(aggregates.target_distribution) &&
    aggregates.target_distribution.length > 0
  ) {
    targetDistribution = aggregates.target_distribution;
  } else {
    targetDistribution = buildTargetDistributionFallback(summary, semantic);
  }

  if (semantic?.target_column && targetDistribution.length > 0) {
    specs.push({
      id: "target-distribution",
      title: "Outcome distribution",
      description: "How often each outcome occurs in this dataset.",
      kind: "bar",
      data: targetDistribution,
      xKey: "target",
      series: [{ key: "count", label: "Rows" }],
    });
  }

  // 2. Metrics by target – only if backend aggregates exist
  if (
    semantic?.target_column &&
    aggregates?.metrics_by_target &&
    Object.keys(aggregates.metrics_by_target).length > 0
  ) {
    for (const [metricName, rows] of Object.entries(
      aggregates.metrics_by_target,
    )) {
      const data = rows as MetricByTargetRow[];
      if (!Array.isArray(data) || data.length === 0) continue;

      specs.push({
        id: `metric-by-target-${metricName}`,
        title: `${metricName} by ${semantic.target_column}`,
        description: "Average value for each outcome.",
        kind: "bar",
        data,
        xKey: "target",
        series: [{ key: "mean", label: `Mean ${metricName}` }],
      });
    }
  }

  // 3. Metrics over time – only if backend aggregates exist
  if (
    semantic?.time_column &&
    aggregates?.metrics_over_time &&
    Object.keys(aggregates.metrics_over_time).length > 0
  ) {
    for (const [metricName, rows] of Object.entries(
      aggregates.metrics_over_time,
    )) {
      const data = rows as MetricOverTimeRow[];
      if (!Array.isArray(data) || data.length === 0) continue;

      specs.push({
        id: `metric-over-time-${metricName}`,
        title: `${metricName} over time`,
        description: `Average ${metricName} per time bucket.`,
        kind: "line",
        data,
        xKey: "bucket",
        series: [{ key: "mean", label: `Mean ${metricName}` }],
      });
    }
  }

  return specs;
}
