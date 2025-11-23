import type { SummaryJson, ColumnSummary } from "@/types/analysis";
import { ColumnMeta, LogicalType, boolPairs } from "@/types/semantic";

export interface SemanticCandidates {
  targetColumns: ColumnMeta[];
  metricColumns: ColumnMeta[];
  timeColumns: ColumnMeta[];
}

function normalizeToken(value: unknown): string {
  return String(value).trim().toLowerCase();
}

function isBinaryBooleanLike(values: string[]): boolean {
  const normalized = values.map((v) => v.trim().toLowerCase());
  const set = new Set(normalized);
  if (set.size !== 2) return false;
  return boolPairs.some(([a, b]) => set.has(a) && set.has(b));
}

function looksLikeId(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower === "id") return true;
  if (lower.endsWith("_id")) return true;
  if (lower.endsWith("id")) return true;
  if (lower.includes("uuid")) return true;
  return false;
}

function looksLikeTimeName(name: string): boolean {
  const lower = name.toLowerCase();
  const timeKeywords = [
    "date",
    "time",
    "timestamp",
    "created_at",
    "updated_at",
    "dt",
    "datetime",
    "duration",
    "elapsed",
    "seconds",
    "secs",
    "minutes",
    "mins",
    "hours",
    "days",
    "days_since",
    "age",
  ];
  return timeKeywords.some((kw) => lower.includes(kw));
}

export function deriveColumnMeta(name: string, col: ColumnSummary): ColumnMeta {
  const rawType = col.type ?? "other";
  let logicalType: LogicalType = "unknown";
  let isBinaryLike = false;

  const valueCounts = col.value_counts ?? [];
  const tokens = valueCounts.map((vc) => normalizeToken(vc.value));
  const binaryLike = valueCounts.length > 0 && isBinaryBooleanLike(tokens);

  if (rawType === "boolean") {
    logicalType = "boolean";
    isBinaryLike = true;
  } else if (
    binaryLike &&
    (rawType === "numeric" || rawType === "categorical")
  ) {
    logicalType = "boolean";
    isBinaryLike = true;
  } else if (rawType === "numeric") {
    logicalType = "numeric";
  } else if (rawType === "categorical") {
    logicalType = "categorical";
  } else if (rawType === "datetime") {
    logicalType = "datetime";
  } else {
    logicalType = "unknown";
  }

  const idLike = looksLikeId(name);
  const timeLike = logicalType === "datetime" || looksLikeTimeName(name);

  return {
    name,
    rawType,
    logicalType,
    isBinaryLike,
    isIdLike: idLike,
    isTimeLike: timeLike,
  };
}

export function buildColumnsMeta(summary: SummaryJson | null): ColumnMeta[] {
  if (!summary || !summary.columns) return [];
  return Object.entries<ColumnSummary>(summary.columns).map(([name, col]) =>
    deriveColumnMeta(name, col),
  );
}

export function getEffectiveType(
  col: ColumnMeta,
  overrides: Record<string, LogicalType>,
): LogicalType {
  return overrides[col.name] ?? col.logicalType;
}

export function buildSemanticCandidates(
  columnsMeta: ColumnMeta[],
  overrides: Record<string, LogicalType>,
): SemanticCandidates {
  const targetColumns = columnsMeta.filter((col) => {
    if (col.isIdLike) return false;
    const effective = getEffectiveType(col, overrides);
    if (effective === "boolean") return true;
    if (col.isBinaryLike) return true;
    if (effective === "categorical") return true;
    return false;
  });

  const metricColumns = columnsMeta.filter((col) => {
    const effective = getEffectiveType(col, overrides);
    if (effective !== "numeric") return false;
    if (col.isIdLike) return false;
    return true;
  });

  const timeColumns = columnsMeta.filter((col) => {
    const effective = getEffectiveType(col, overrides);
    if (effective === "datetime") return true;
    return col.isTimeLike;
  });

  return {
    targetColumns,
    metricColumns,
    timeColumns,
  };
}

export function getStageLabel(stage: string): string {
  switch (stage) {
    case "uploading":
      return "Uploading CSV file...";
    case "processing":
      return "Processing dataset and detecting columns...";
    case "done":
      return "Upload complete. Review the inferred column types and answer a few quick questions.";
    case "error":
      return "There was a problem uploading or processing your dataset.";
    case "idle":
    default:
      return "Waiting to upload.";
  }
}
