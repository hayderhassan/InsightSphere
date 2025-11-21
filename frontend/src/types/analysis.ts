// export type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

// export type ColumnType =
//   | "numeric"
//   | "categorical"
//   | "boolean"
//   | "datetime"
//   | "other";

// export interface HistogramBin {
//   bin: string;
//   count: number;
// }

// export interface ValueCount {
//   value: string;
//   count: number;
// }

// export interface ColumnSummary {
//   type?: ColumnType;
//   describe?: Record<string, number | string | null>;
//   histogram?: HistogramBin[];
//   value_counts?: ValueCount[];
// }

// export interface SummaryJson {
//   row_count?: number;
//   column_count?: number;
//   missing_values?: Record<string, number>;
//   columns?: Record<string, ColumnSummary>;
// }

// export interface AnalysisResult {
//   status: AnalysisStatus;
//   summary_json?: SummaryJson;
//   created_at: string;
//   error_message?: string | null;
// }

////
//
//
export type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface ColumnHistogramBin {
  bin: string;
  count: number;
}

export interface ColumnValueCount {
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
    | "ignored"
    | string;
  describe?: Record<string, unknown>;
  histogram?: ColumnHistogramBin[];
  value_counts?: ColumnValueCount[];
}

export interface SemanticConfigSummary {
  target_column: string | null;
  time_column: string | null;
  metric_columns: string[];
  column_types: Record<string, string>;
}

export interface SummaryJson {
  row_count?: number;
  column_count?: number;
  missing_values?: Record<string, number>;
  columns?: Record<string, ColumnSummary>;
  semantic_config?: SemanticConfigSummary;
}
