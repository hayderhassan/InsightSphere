import type { ColumnSummary } from "@/types/analysis";

export type UploadStage =
  | "idle"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export type LogicalType =
  | "numeric"
  | "categorical"
  | "boolean"
  | "datetime"
  | "text"
  | "unknown";

export interface ColumnMeta {
  name: string;
  rawType: ColumnSummary["type"] | "other";
  logicalType: LogicalType;
  isBinaryLike: boolean;
  isIdLike: boolean;
  isTimeLike: boolean;
}

export const LOGICAL_TYPE_LABELS: Record<LogicalType, string> = {
  numeric: "Numeric (numbers, amounts)",
  categorical: "Categorical (categories, labels)",
  boolean: "Boolean (yes/no, true/false, 0/1)",
  datetime: "Date / Time",
  text: "Free text",
  unknown: "Unknown / mixed",
};

export const LOGICAL_TYPE_OPTIONS: LogicalType[] = [
  "numeric",
  "categorical",
  "boolean",
  "datetime",
  "text",
  "unknown",
];

export const boolPairs: [string, string][] = [
  ["true", "false"],
  ["t", "f"],
  ["yes", "no"],
  ["y", "n"],
  ["1", "0"],
  ["on", "off"],
  ["male", "female"],
  ["m", "f"],
  ["pass", "fail"],
  ["positive", "negative"],
  ["active", "inactive"],
  ["enabled", "disabled"],
  ["success", "error"],
];
