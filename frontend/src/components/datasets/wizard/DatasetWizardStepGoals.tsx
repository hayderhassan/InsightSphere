"use client";

import { JSX, useEffect, useMemo } from "react";
import type { DatasetWizardState } from "@/types/datasetWizard";
import {
  type AnalysisGoal,
  type DatasetShape,
  type AnomalyDirection,
  type TimeGrain,
} from "@/types/datasetWizard";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { buildColumnsMeta, getEffectiveType } from "@/lib/datasetSemantic";
import type { ColumnMeta } from "@/types/semantic";
import type { ColumnSummary, SummaryJson } from "@/types/analysis";

interface DatasetWizardStepGoalsProps {
  state: DatasetWizardState;
  onStateChange: (next: DatasetWizardState) => void;
}

function inferTimeGrainFromColumn(
  col: ColumnSummary,
  summary: SummaryJson | null,
): TimeGrain {
  if (!col.describe) return "none";

  const firstRaw = (col.describe as any).first;
  const lastRaw = (col.describe as any).last;
  if (!firstRaw || !lastRaw) return "none";

  const first = new Date(firstRaw);
  const last = new Date(lastRaw);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) {
    return "none";
  }

  const spanMs = Math.abs(last.getTime() - first.getTime());
  const spanDays = spanMs / 86_400_000;
  const rowCount = summary?.row_count ?? 0;
  if (!rowCount || spanDays <= 0) return "none";

  const approxPeriodDays = spanDays / rowCount;

  if (approxPeriodDays <= 2) return "day";
  if (approxPeriodDays <= 10) return "week";
  if (approxPeriodDays <= 60) return "month";
  if (approxPeriodDays <= 365 * 2) return "year";
  return "auto";
}

export function DatasetWizardStepGoals(
  props: DatasetWizardStepGoalsProps,
): JSX.Element {
  const { state, onStateChange } = props;

  const summary: SummaryJson | null = state.summary;

  const columnsMeta: ColumnMeta[] = useMemo(
    () => buildColumnsMeta(summary),
    [summary],
  );

  const effectiveTypes: Record<string, string> = useMemo(() => {
    const lookup: Record<string, string> = {};
    columnsMeta.forEach((col) => {
      lookup[col.name] = getEffectiveType(col, state.columnTypes);
    });
    return lookup;
  }, [columnsMeta, state.columnTypes]);

  const allFieldNames = columnsMeta.map((c) => c.name);

  const idCandidates = columnsMeta.filter((c) => c.isIdLike);
  const booleanCandidates = columnsMeta.filter(
    (c) => effectiveTypes[c.name] === "boolean",
  );
  const categoricalCandidates = columnsMeta.filter(
    (c) => effectiveTypes[c.name] === "categorical",
  );
  const datetimeCandidates = columnsMeta.filter(
    (c) => effectiveTypes[c.name] === "datetime",
  );

  const hasTimeDimension =
    state.datasetShape === "time_series" ||
    state.timeColumn != null ||
    datetimeCandidates.length > 0;

  const showPositiveClass =
    state.analysisGoal === "classify" || state.analysisGoal === "anomaly";

  function update<K extends keyof DatasetWizardState>(
    key: K,
    value: DatasetWizardState[K],
  ) {
    onStateChange({
      ...state,
      [key]: value,
    });
  }

  // Smart defaults – run once when summary / columnTypes available
  useEffect(() => {
    if (!summary || columnsMeta.length === 0) return;

    let changed = false;
    const next: Partial<DatasetWizardState> = {};

    // Entity key → first id-like column
    if (!state.entityKey && idCandidates.length > 0) {
      next.entityKey = idCandidates[0].name;
      changed = true;
    }

    // Target column → last boolean, then last categorical
    if (!state.targetColumn) {
      const boolLast =
        booleanCandidates.length > 0
          ? booleanCandidates[booleanCandidates.length - 1]
          : null;
      const catLast =
        categoricalCandidates.length > 0
          ? categoricalCandidates[categoricalCandidates.length - 1]
          : null;

      const chosen = boolLast ?? catLast;
      if (chosen) {
        next.targetColumn = chosen.name;
        changed = true;
      }
    }

    // Time column → first datetime
    if (!state.timeColumn && datetimeCandidates.length > 0) {
      next.timeColumn = datetimeCandidates[0].name;
      changed = true;
    }

    // Time grain → try to infer from the chosen time column
    if (
      hasTimeDimension &&
      (state.timeGrain === "none" || state.timeGrain === "auto") &&
      datetimeCandidates.length > 0
    ) {
      const chosenTimeColName =
        (next.timeColumn as string | undefined) ?? state.timeColumn;
      const chosenTimeCol =
        chosenTimeColName &&
        summary.columns &&
        (summary.columns[chosenTimeColName] as ColumnSummary | undefined);

      if (chosenTimeCol) {
        const inferred = inferTimeGrainFromColumn(chosenTimeCol, summary);
        if (inferred !== "none") {
          next.timeGrain = inferred;
          changed = true;
        }
      }
    }

    if (changed) {
      onStateChange({
        ...state,
        ...next,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, columnsMeta.length]);

  const timeGrainValue: TimeGrain | "none" = state.timeGrain ?? "none";
  const anomalyValue: AnomalyDirection | "none" =
    state.anomalyDirection ?? "none";

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-primary-foreground">
          Goals & usage
        </h2>
        <p className="text-xs text-muted-foreground">
          Tell us what this dataset represents and what you want to use it for.
          This helps us choose sensible defaults for charts and insights.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Shape */}
        <div className="space-y-2">
          <Label htmlFor="dataset-shape">Dataset shape</Label>
          <Select
            value={state.datasetShape}
            onValueChange={(value) =>
              update("datasetShape", value as DatasetShape)
            }
          >
            <SelectTrigger id="dataset-shape" className="h-8 text-xs">
              <SelectValue placeholder="Choose dataset shape" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tabular">Tabular / snapshot</SelectItem>
              <SelectItem value="time_series">Time series</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[0.7rem] text-muted-foreground">
            Time series data typically has a timestamp column and repeated
            measurements over time.
          </p>
        </div>

        {/* Goal */}
        <div className="space-y-2">
          <Label htmlFor="analysis-goal">Primary goal</Label>
          <Select
            value={state.analysisGoal}
            onValueChange={(value) =>
              update("analysisGoal", value as AnalysisGoal)
            }
          >
            <SelectTrigger id="analysis-goal" className="h-8 text-xs">
              <SelectValue placeholder="What are you trying to do?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="describe">Describe / explore</SelectItem>
              <SelectItem value="forecast">Forecast future values</SelectItem>
              <SelectItem value="classify">Classify outcomes</SelectItem>
              <SelectItem value="cluster">Group similar records</SelectItem>
              <SelectItem value="anomaly">Detect anomalies</SelectItem>
              <SelectItem value="other">Other / not sure</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[0.7rem] text-muted-foreground">
            This doesn&apos;t restrict you, but it guides default charts and
            recommendations.
          </p>
        </div>

        {/* Entity key – dropdown of fields with "None" */}
        <div className="space-y-2">
          <Label htmlFor="entity-key">
            Entity / subject key{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Select
            value={state.entityKey ?? "none"}
            onValueChange={(value) =>
              update("entityKey", value === "none" ? null : (value as string))
            }
          >
            <SelectTrigger id="entity-key" className="h-8 text-xs">
              <SelectValue placeholder="Choose entity field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {allFieldNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[0.7rem] text-muted-foreground">
            If records belong to entities (like customers or students), we can
            group and segment by this field.
          </p>
        </div>

        {/* Positive class label – dropdown of fields with "None" */}
        {showPositiveClass && (
          <div className="space-y-2">
            <Label htmlFor="positive-class">
              Positive class label{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={state.positiveClass ?? "none"}
              onValueChange={(value) =>
                update(
                  "positiveClass",
                  value === "none" ? null : (value as string),
                )
              }
            >
              <SelectTrigger id="positive-class" className="h-8 text-xs">
                <SelectValue placeholder="Choose label field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allFieldNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.7rem] text-muted-foreground">
              For classification or anomaly goals, this is the field whose value
              indicates the &quot;positive&quot; outcome you care about.
            </p>
          </div>
        )}

        {/* Time grain – only if time dimension is relevant */}
        {hasTimeDimension && (
          <div className="space-y-2">
            <Label htmlFor="time-grain">
              Time grain{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={timeGrainValue}
              onValueChange={(value) => update("timeGrain", value as TimeGrain)}
            >
              <SelectTrigger id="time-grain" className="h-8 text-xs">
                <SelectValue placeholder="How should time be summarised?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {state.timeGrain === "custom" && (
              <Input
                className="mt-2 h-8 text-xs"
                placeholder="Describe your custom grain, e.g. 'semester', 'billing cycle'"
                value={state.timeGrainCustom ?? ""}
                onChange={(e) =>
                  update("timeGrainCustom", e.target.value || (null as never))
                }
              />
            )}
            <p className="text-[0.7rem] text-muted-foreground">
              For time series data, this affects how charts group points over
              time.
            </p>
          </div>
        )}

        {/* Anomaly direction – only if time dimension & anomaly-related */}
        {hasTimeDimension && state.analysisGoal === "anomaly" && (
          <div className="space-y-2">
            <Label htmlFor="anomaly-direction">
              Anomaly direction{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={anomalyValue}
              onValueChange={(value) =>
                update("anomalyDirection", value as AnomalyDirection)
              }
            >
              <SelectTrigger id="anomaly-direction" className="h-8 text-xs">
                <SelectValue placeholder="Which anomalies matter most?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="both">High and low</SelectItem>
                <SelectItem value="high">High only</SelectItem>
                <SelectItem value="low">Low only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[0.7rem] text-muted-foreground">
              Useful when looking for spikes (e.g. fraud, errors) or drops (e.g.
              churn, outages).
            </p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="wizard-notes">
          Notes for future you{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="wizard-notes"
          rows={3}
          placeholder="Briefly describe what this dataset is for, or anything unusual that future you should remember."
          value={state.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="text-xs"
        />
      </div>
    </div>
  );
}
