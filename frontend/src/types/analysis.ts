export type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface HistogramBin {
  bin: string;
  count: number;
}

export interface ValueCount {
  value: string;
  count: number;
}

export interface ColumnSummary {
  type?:
    | "numeric"
    | "categorical"
    | "boolean"
    | "datetime"
    | "other"
    | "unknown"
    | "ignored"
    | string;
  describe?: Record<string, unknown>;
  histogram?: HistogramBin[];
  value_counts?: ValueCount[];
}

export type DatasetShape = "entity" | "events" | "timeseries" | "other";

export type AnalysisGoal =
  | "explore"
  | "classification"
  | "regression"
  | "trend"
  | "anomaly";

export type TimeGrain = "auto" | "day" | "week" | "month" | "quarter" | "year";

export type AnomalyDirection = "high" | "low" | "both";

export interface SemanticConfig {
  target_column: string | null;
  metric_columns: string[];
  time_column: string | null;
  column_types: Record<string, string>;
  dataset_shape?: DatasetShape;
  analysis_goal?: AnalysisGoal;
  positive_class?: string | null;
  time_grain?: TimeGrain;
  anomaly_direction?: AnomalyDirection;
  primary_entity_key?: string | null;
}

// export interface TargetDistributionRow {
//   target: string;
//   count: number;
//   pct: number;
// }

// export interface MetricByTargetRow {
//   target: string;
//   mean: number | null;
//   median?: number | null;
//   count: number;
// }

// export interface MetricOverTimeRow {
//   bucket: string;
//   mean: number | null;
//   count: number;
// }

// export interface SemanticAggregates {
//   target_distribution?: TargetDistributionRow[];
//   metrics_by_target?: Record<string, MetricByTargetRow[]>;
//   metrics_over_time?: Record<string, MetricOverTimeRow[]>;
// }

export interface SummaryJson {
  row_count?: number;
  column_count?: number;
  columns?: Record<string, ColumnSummary>;
  missing_values?: Record<string, number>;
  semantic_config?: SemanticConfig | null;
  // semantic_aggregates?: SemanticAggregates | null;
  // Optional: space for precomputed insight blocks
  semantic_insights?: unknown;
}
