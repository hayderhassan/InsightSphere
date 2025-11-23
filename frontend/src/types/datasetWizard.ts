import type { SummaryJson } from "@/types/analysis";
import type { LogicalType } from "@/types/semantic";

export type DatasetWizardStepId = "upload" | "columns" | "goals" | "review";

export type DatasetShape = "tabular" | "time_series";
export type AnalysisGoal =
  | "describe"
  | "forecast"
  | "classify"
  | "cluster"
  | "anomaly"
  | "other";

export type AnomalyDirection = "none" | "high" | "low" | "both";

export type TimeGrain =
  | "none"
  | "auto"
  | "day"
  | "week"
  | "month"
  | "year"
  | "custom";

export interface DatasetWizardState {
  datasetId: number | null;
  datasetName: string;
  uploadFileName: string | null;
  uploadStatus: "idle" | "uploading" | "analyzing" | "ready" | "error";
  uploadError: string | null;
  summary: SummaryJson | null;
  columnTypes: Record<string, LogicalType>;
  targetColumn: string | null;
  metricColumns: string[];
  timeColumn: string | null;
  datasetShape: DatasetShape;
  analysisGoal: AnalysisGoal;
  positiveClass: string | null;
  entityKey: string | null;
  timeGrain: TimeGrain;
  timeGrainCustom: string | null;
  anomalyDirection: AnomalyDirection;
  notes: string;
}
