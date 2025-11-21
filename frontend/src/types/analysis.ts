export type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type ColumnType =
  | "numeric"
  | "categorical"
  | "boolean"
  | "datetime"
  | "other";

export interface HistogramBin {
  bin: string;
  count: number;
}

export interface ValueCount {
  value: string;
  count: number;
}

export interface ColumnSummary {
  type?: ColumnType;
  describe?: Record<string, number | string | null>;
  histogram?: HistogramBin[];
  value_counts?: ValueCount[];
}

export interface SummaryJson {
  row_count?: number;
  column_count?: number;
  missing_values?: Record<string, number>;
  columns?: Record<string, ColumnSummary>;
}

export interface AnalysisResult {
  status: AnalysisStatus;
  summary_json?: SummaryJson;
  created_at: string;
  error_message?: string | null;
}
