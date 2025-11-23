"use client";

import { useMemo } from "react";
import type {
  SummaryJson,
  DatasetShape,
  AnalysisGoal,
  TimeGrain,
  AnomalyDirection,
} from "@/types/analysis";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface DatasetGoalState {
  datasetShape: DatasetShape;
  analysisGoal: AnalysisGoal;
  positiveClass: string;
  timeGrain: TimeGrain;
  anomalyDirection: AnomalyDirection;
  primaryEntityKey: string;
}

interface DatasetGoalStepProps {
  summary: SummaryJson | null;
  selectedTarget: string;
  selectedTimeColumn: string;
  state: DatasetGoalState;
  onStateChange: (next: DatasetGoalState) => void;
}

export function DatasetGoalStep(props: DatasetGoalStepProps) {
  const { summary, selectedTarget, selectedTimeColumn, state, onStateChange } =
    props;

  const targetValueOptions: string[] = useMemo(() => {
    if (!summary || !summary.columns || !selectedTarget) return [];
    const col = summary.columns[selectedTarget];
    if (!col || !col.value_counts) return [];
    return col.value_counts.map((vc) => String(vc.value));
  }, [summary, selectedTarget]);

  const allColumnNames: string[] = useMemo(() => {
    if (!summary || !summary.columns) return [];
    return Object.keys(summary.columns);
  }, [summary]);

  const showPositiveClass =
    state.analysisGoal === "classification" && !!selectedTarget;

  const showTimeGrain =
    !!selectedTimeColumn &&
    (state.analysisGoal === "trend" ||
      state.analysisGoal === "classification" ||
      state.analysisGoal === "regression");

  const showAnomalyDirection = state.analysisGoal === "anomaly";

  const showPrimaryEntityKey =
    state.datasetShape === "events" || state.datasetShape === "timeseries";

  function update<K extends keyof DatasetGoalState>(
    key: K,
    value: DatasetGoalState[K],
  ): void {
    onStateChange({
      ...state,
      [key]: value,
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-primary-foreground">
          2. Describe how you plan to use this dataset
        </h2>
        <p className="text-xs text-muted-foreground">
          These answers help us choose smarter default charts and insights.
        </p>
      </div>

      {/* Dataset shape */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dataset-shape">Dataset shape</Label>
          <Select
            value={state.datasetShape}
            onValueChange={(value) =>
              update("datasetShape", value as DatasetShape)
            }
          >
            <SelectTrigger
              id="dataset-shape"
              className="h-8 w-full cursor-pointer text-xs"
            >
              <SelectValue placeholder="Select dataset shape" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entity">
                One row per entity (customers, students, devices…)
              </SelectItem>
              <SelectItem value="events">
                Event / transaction log (multiple rows per entity)
              </SelectItem>
              <SelectItem value="timeseries">
                Time-series summary (one row per time period)
              </SelectItem>
              <SelectItem value="other">Other / not sure</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[0.7rem] text-muted-foreground">
            Helps decide whether to focus on entity summaries, event patterns or
            trends.
          </p>
        </div>

        {/* Analysis goal */}
        <div className="space-y-2">
          <Label>Primary goal</Label>
          <RadioGroup
            className="grid grid-cols-2 gap-2 text-[0.7rem] md:grid-cols-3"
            value={state.analysisGoal}
            onValueChange={(value) =>
              update("analysisGoal", value as AnalysisGoal)
            }
          >
            <Label
              htmlFor="goal-explore"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 hover:border-primary/60"
            >
              <RadioGroupItem id="goal-explore" value="explore" />
              <span>Explore patterns</span>
            </Label>
            <Label
              htmlFor="goal-classification"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 hover:border-primary/60"
            >
              <RadioGroupItem id="goal-classification" value="classification" />
              <span>Predict a category</span>
            </Label>
            <Label
              htmlFor="goal-regression"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 hover:border-primary/60"
            >
              <RadioGroupItem id="goal-regression" value="regression" />
              <span>Predict a number</span>
            </Label>
            <Label
              htmlFor="goal-trend"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 hover:border-primary/60"
            >
              <RadioGroupItem id="goal-trend" value="trend" />
              <span>Analyse trends</span>
            </Label>
            <Label
              htmlFor="goal-anomaly"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 hover:border-primary/60"
            >
              <RadioGroupItem id="goal-anomaly" value="anomaly" />
              <span>Detect anomalies</span>
            </Label>
          </RadioGroup>
        </div>
      </div>

      {/* Goal-specific follow ups */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Positive class (classification) */}
        {showPositiveClass && (
          <div className="space-y-2">
            <Label htmlFor="positive-class">
              Positive outcome value (for classification)
            </Label>
            <Select
              value={state.positiveClass}
              onValueChange={(value) => update("positiveClass", value)}
            >
              <SelectTrigger
                id="positive-class"
                className="h-8 w-full cursor-pointer text-xs"
              >
                <SelectValue placeholder="Select the 'positive' label" />
              </SelectTrigger>
              <SelectContent>
                {targetValueOptions.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No values detected yet
                  </SelectItem>
                ) : (
                  targetValueOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[0.7rem] text-muted-foreground">
              For example: passed, churned, fraud, yes.
            </p>
          </div>
        )}

        {/* Time grain */}
        {showTimeGrain && (
          <div className="space-y-2">
            <Label htmlFor="time-grain">Time grain for trends</Label>
            <Select
              value={state.timeGrain}
              onValueChange={(value) => update("timeGrain", value as TimeGrain)}
            >
              <SelectTrigger
                id="time-grain"
                className="h-8 w-full cursor-pointer text-xs"
              >
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (let us decide)</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[0.7rem] text-muted-foreground">
              We&apos;ll resample your time column to this period for charts.
            </p>
          </div>
        )}

        {/* Anomaly direction */}
        {showAnomalyDirection && (
          <div className="space-y-2">
            <Label>Which anomalies matter?</Label>
            <RadioGroup
              className="flex gap-3 text-[0.7rem]"
              value={state.anomalyDirection}
              onValueChange={(value) =>
                update("anomalyDirection", value as AnomalyDirection)
              }
            >
              <Label
                htmlFor="anom-high"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 hover:border-primary/60"
              >
                <RadioGroupItem id="anom-high" value="high" />
                <span>Unusually high values</span>
              </Label>
              <Label
                htmlFor="anom-low"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 hover:border-primary/60"
              >
                <RadioGroupItem id="anom-low" value="low" />
                <span>Unusually low values</span>
              </Label>
              <Label
                htmlFor="anom-both"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 hover:border-primary/60"
              >
                <RadioGroupItem id="anom-both" value="both" />
                <span>Either (both tails)</span>
              </Label>
            </RadioGroup>
          </div>
        )}

        {/* Primary entity key */}
        {showPrimaryEntityKey && (
          <div className="space-y-2">
            <Label htmlFor="entity-key">
              Entity identifier column (optional)
            </Label>
            <Select
              value={state.primaryEntityKey}
              onValueChange={(value) => update("primaryEntityKey", value)}
            >
              <SelectTrigger
                id="entity-key"
                className="h-8 w-full cursor-pointer text-xs"
              >
                <SelectValue placeholder="No entity key" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific entity key</SelectItem>
                {allColumnNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.7rem] text-muted-foreground">
              For logs or events, this lets us summarise behaviour by entity
              (customer, device, student…).
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
