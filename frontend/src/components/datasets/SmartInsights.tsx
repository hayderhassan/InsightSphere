"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type {
  SummaryJson,
  SemanticConfig,
  ColumnSummary,
} from "@/types/analysis";
import { AlertCircle } from "lucide-react";
import { BooleanRadialChart } from "@/components/charts/BooleanRadialChart";

interface SmartInsightsProps {
  summaryJson?: SummaryJson;
}

interface BooleanTargetData {
  positiveLabel: string;
  negativeLabel: string;
  positiveCount: number;
  negativeCount: number;
  totalCount: number;
}

function normaliseToken(value: unknown): string {
  return String(value).trim().toLowerCase();
}

function isBooleanishColumn(col: ColumnSummary | undefined): boolean {
  if (!col) return false;
  if (col.type === "boolean") return true;

  const valueCounts = col.value_counts ?? [];
  if (valueCounts.length === 0) return false;

  const distinct = new Set<string>();
  for (const entry of valueCounts) {
    distinct.add(normaliseToken(entry.value));
  }

  if (distinct.size !== 2) return false;

  const vals = Array.from(distinct);
  const truthy = new Set(["true", "1", "yes", "y"]);
  const falsy = new Set(["false", "0", "no", "n"]);

  const hasTruthy = vals.some((v) => truthy.has(v));
  const hasFalsy = vals.some((v) => falsy.has(v));

  return hasTruthy && hasFalsy;
}

function getBooleanTargetData(
  summary: SummaryJson,
  semantic: SemanticConfig,
): BooleanTargetData | null {
  const targetColumn = semantic.target_column;
  if (!targetColumn || !summary.columns) return null;

  const col: ColumnSummary | undefined = summary.columns[targetColumn];
  if (!isBooleanishColumn(col)) return null;

  const valueCounts = col?.value_counts ?? [];
  if (valueCounts.length === 0) return null;

  const truthyTokens = new Set(["true", "1", "yes", "y"]);
  const falsyTokens = new Set(["false", "0", "no", "n"]);

  let positiveCount = 0;
  let negativeCount = 0;

  for (const entry of valueCounts) {
    const norm = normaliseToken(entry.value);
    const count = entry.count ?? 0;

    if (truthyTokens.has(norm)) {
      positiveCount += count;
    } else if (falsyTokens.has(norm)) {
      negativeCount += count;
    }
  }

  const totalCount = positiveCount + negativeCount;
  if (totalCount === 0) {
    return null;
  }

  const baseName = targetColumn.replace(/[_\s]+/g, " ").trim();
  const humanBase =
    baseName.length > 0
      ? baseName[0].toUpperCase() + baseName.slice(1)
      : "Target";

  const display = semantic.target_display;
  const positiveLabel = display?.positive_label ?? humanBase;
  const negativeLabel =
    display?.negative_label ?? `Not ${humanBase.toLowerCase()}`;

  return {
    positiveLabel,
    negativeLabel,
    positiveCount,
    negativeCount,
    totalCount,
  };
}

export function SmartInsights(props: SmartInsightsProps) {
  const { summaryJson } = props;
  const semantic = summaryJson?.semantic_config ?? null;

  if (!summaryJson || !semantic || !semantic.target_column) {
    return (
      <Card className="bg-card/80 backdrop-blur border-border/70">
        <CardHeader className="flex flex-row items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-sm">Smart insights</CardTitle>
            <CardDescription className="text-xs">
              Set a target column and semantics to unlock more tailored charts.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const booleanData = getBooleanTargetData(summaryJson, semantic);

  if (!booleanData) {
    return (
      <Card className="bg-card/80 backdrop-blur border-border/70">
        <CardHeader>
          <CardTitle className="text-sm">Smart insights</CardTitle>
          <CardDescription className="text-xs">
            We couldn&apos;t infer a clear boolean target from this dataset yet.
            You can still use the other charts above and below.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { positiveLabel, negativeLabel, positiveCount, negativeCount } =
    booleanData;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BooleanRadialChart
        positiveLabel={positiveLabel}
        negativeLabel={negativeLabel}
        positiveCount={positiveCount}
        negativeCount={negativeCount}
      />
    </div>
  );
}
