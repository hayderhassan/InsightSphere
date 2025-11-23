"use client";

import { JSX } from "react";
import type { DatasetWizardState } from "@/types/datasetWizard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface DatasetWizardStepReviewProps {
  state: DatasetWizardState;
}

export function DatasetWizardStepReview(
  props: DatasetWizardStepReviewProps,
): JSX.Element {
  const { state } = props;

  const rowCount = state.summary?.row_count ?? undefined;
  const columnCount = state.summary?.column_count ?? undefined;

  const metricCount = state.metricColumns.length;

  let timeGrainLabel = "None";
  if (state.timeGrain === "auto") {
    timeGrainLabel = "Auto";
  } else if (state.timeGrain === "custom") {
    timeGrainLabel = state.timeGrainCustom || "Custom";
  } else if (state.timeGrain !== "none") {
    timeGrainLabel = state.timeGrain;
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-primary-foreground">
          Review & confirm
        </h2>
        <p className="text-xs text-muted-foreground">
          Here&apos;s a summary of how this dataset will be created. You can
          still go back to adjust anything before you confirm.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dataset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Name:</span>{" "}
              {state.datasetName || "Untitled dataset"}
            </p>
            {state.uploadFileName && (
              <p>
                <span className="font-medium text-foreground">
                  Source file:
                </span>{" "}
                {state.uploadFileName}
              </p>
            )}
            <p>
              <span className="font-medium text-foreground">
                Rows / columns:
              </span>{" "}
              {rowCount !== undefined ? rowCount : "?"} rows ·{" "}
              {columnCount !== undefined ? columnCount : "?"} columns
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Semantics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                Target column:
              </span>{" "}
              {state.targetColumn ?? "None"}
            </p>
            <p>
              <span className="font-medium text-foreground">Time column:</span>{" "}
              {state.timeColumn ?? "None"}
            </p>
            <p>
              <span className="font-medium text-foreground">Key fields:</span>{" "}
              {metricCount === 0
                ? "None"
                : `${metricCount} selected (${state.metricColumns.join(", ")})`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shape & goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Shape:</span>{" "}
              {state.datasetShape === "time_series"
                ? "Time series"
                : "Tabular / snapshot"}
            </p>
            <p>
              <span className="font-medium text-foreground">Goal:</span>{" "}
              {state.analysisGoal}
            </p>
            {state.entityKey && (
              <p>
                <span className="font-medium text-foreground">Entity key:</span>{" "}
                {state.entityKey}
              </p>
            )}
            {state.positiveClass && (
              <p>
                <span className="font-medium text-foreground">
                  Positive class:
                </span>{" "}
                {state.positiveClass}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Time & anomalies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Time grain:</span>{" "}
              {timeGrainLabel}
            </p>
            <p>
              <span className="font-medium text-foreground">
                Anomaly direction:
              </span>{" "}
              {state.anomalyDirection}
            </p>
          </CardContent>
        </Card>
      </div>

      {state.notes && (
        <>
          <Separator className="my-2" />
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-primary-foreground">
              Notes
            </h3>
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">
              {state.notes}
            </p>
          </div>
        </>
      )}

      <p className="mt-2 text-[0.7rem] text-muted-foreground">
        When you click <span className="font-semibold">Create dataset</span>,
        we&apos;ll save these settings as the dataset&apos;s semantic
        configuration and add it to your dashboard.
      </p>
    </div>
  );
}
