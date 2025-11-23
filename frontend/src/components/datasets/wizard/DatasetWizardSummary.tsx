"use client";

import { JSX } from "react";
import type { DatasetWizardState } from "@/types/datasetWizard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DatasetWizardSummaryProps {
  state: DatasetWizardState;
  showSemantics: boolean;
  showGoals: boolean;
}

export function DatasetWizardSummary(
  props: DatasetWizardSummaryProps,
): JSX.Element {
  const { state, showSemantics, showGoals } = props;

  const { summary } = state;
  const rowCount = summary?.row_count ?? undefined;
  const columnCount = summary?.column_count ?? undefined;

  const metricCount = state.metricColumns.length;

  const hasSemantics =
    !!state.targetColumn || !!state.timeColumn || metricCount > 0;
  const hasGoals =
    state.datasetShape !== "tabular" ||
    state.analysisGoal !== "describe" ||
    state.entityKey != null ||
    state.positiveClass != null ||
    state.timeGrain !== "none" ||
    state.timeGrainCustom != null ||
    state.anomalyDirection !== "none";

  if (!state.datasetName) {
    return <></>;
  }

  return (
    <div className="mt-2 space-y-3 md:mt=0">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur">
        <h2 className="text-sm font-semibold text-primary-foreground">
          Dataset setup summary
        </h2>
        <p className="text-xs text-muted-foreground">
          This updates as you move through the wizard. You can always go back to
          adjust anything before creating the dataset.
        </p>
        <Separator className="my-3" />
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {state.datasetName || "Untitled dataset"}
            </p>
            {state.uploadFileName && (
              <p className="text-[0.7rem] text-muted-foreground">
                Source file: {state.uploadFileName}
              </p>
            )}
            {(rowCount !== undefined || columnCount !== undefined) && (
              <p className="text-[0.7rem] text-muted-foreground">
                {rowCount !== undefined ? rowCount : "?"} rows ·{" "}
                {columnCount !== undefined ? columnCount : "?"} columns
              </p>
            )}
          </div>

          {showSemantics && hasSemantics && (
            <div className="space-y-1">
              <p className="text-[0.7rem] font-semibold text-muted-foreground">
                Semantics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {state.targetColumn && (
                  <Badge
                    variant="outline"
                    className="border-border/70 px-1.5 py-0.5"
                  >
                    Target: {state.targetColumn}
                  </Badge>
                )}
                {state.timeColumn && (
                  <Badge
                    variant="outline"
                    className="border-border/70 px-1.5 py-0.5"
                  >
                    Time: {state.timeColumn}
                  </Badge>
                )}
                {metricCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-border/70 px-1.5 py-0.5"
                  >
                    Key fields:{" "}
                    {metricCount === 1
                      ? state.metricColumns[0]
                      : `${metricCount} selected`}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {showGoals && hasGoals && (
            <div className="space-y-1">
              <p className="text-[0.7rem] font-semibold text-muted-foreground">
                Shape & goal
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0.5 text-[0.7rem]"
                >
                  {state.datasetShape === "time_series"
                    ? "Time series"
                    : "Tabular / snapshot"}
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0.5 text-[0.7rem]"
                >
                  Goal: {state.analysisGoal}
                </Badge>
                {state.entityKey && (
                  <Badge
                    variant="outline"
                    className="border-border/70 px-1.5 py-0.5"
                  >
                    Entity: {state.entityKey}
                  </Badge>
                )}
                {state.positiveClass && (
                  <Badge
                    variant="outline"
                    className="border-border/70 px-1.5 py-0.5"
                  >
                    Label field: {state.positiveClass}
                  </Badge>
                )}
                {state.timeGrain !== "none" && (
                  <Badge
                    variant="outline"
                    className="border-border/70 px-1.5 py-0.5"
                  >
                    Grain:{" "}
                    {state.timeGrain === "auto"
                      ? "Auto"
                      : state.timeGrain === "custom"
                        ? state.timeGrainCustom || "Custom"
                        : state.timeGrain}
                  </Badge>
                )}
                {state.anomalyDirection !== "none" && (
                  <Badge
                    variant="outline"
                    className="border-border/70 px-1.5 py-0.5"
                  >
                    Anomalies: {state.anomalyDirection}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {state.notes && (
            <div className="space-y-1">
              <p className="text-[0.7rem] font-semibold text-muted-foreground">
                Notes
              </p>
              <p className="line-clamp-3 text-[0.7rem] text-muted-foreground">
                {state.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
