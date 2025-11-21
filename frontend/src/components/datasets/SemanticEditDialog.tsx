"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SummaryJson } from "@/types/analysis";
import {
  buildColumnsMeta,
  buildSemanticCandidates,
} from "@/lib/datasetSemantic";
import type { ColumnMeta } from "@/types/semantic";
import { getAccessToken, API_BASE_URL } from "@/lib/api";

type SemanticMode = "target" | "time" | "metrics";

export interface SemanticConfig {
  target_column: string | null;
  metric_columns: string[];
  time_column: string | null;
}

interface SemanticEditDialogProps {
  datasetId: number;
  summary: SummaryJson;
  currentSemantic: SemanticConfig;
  mode: SemanticMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (semantic: SemanticConfig) => void;
}

export function SemanticEditDialog(props: SemanticEditDialogProps) {
  const {
    datasetId,
    summary,
    currentSemantic,
    mode,
    open,
    onOpenChange,
    onUpdated,
  } = props;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  const columnsMeta = useMemo(() => buildColumnsMeta(summary), [summary]);

  const { targetColumns, metricColumns, timeColumns } = useMemo(
    () => buildSemanticCandidates(columnsMeta, {}),
    [columnsMeta],
  );

  // Initialise local form state ONLY when the dialog opens.
  // We intentionally don't track currentSemantic changes here to
  // avoid polling resets while the user is editing.
  useEffect(() => {
    if (!open) return;

    setError(null);
    setSelectedTarget(currentSemantic.target_column ?? "");
    setSelectedTime(currentSemantic.time_column ?? "");
    setSelectedMetrics(currentSemantic.metric_columns ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleMetric(name: string): void {
    setSelectedMetrics((current) =>
      current.includes(name)
        ? current.filter((m) => m !== name)
        : [...current, name],
    );
  }

  function titleAndDescription(): { title: string; description: string } {
    if (mode === "target") {
      return {
        title: "Edit target label",
        description:
          "Choose the column that represents the outcome or label, such as passed/failed, churned/not, fraud/not.",
      };
    }
    if (mode === "time") {
      return {
        title: "Edit time field",
        description:
          "Choose the column that stores dates, timestamps, or elapsed time such as duration or days_since_signup.",
      };
    }
    return {
      title: "Edit key fields",
      description:
        "Select the numeric fields you care about most, such as scores, revenue, or duration. These will be prioritised in charts.",
    };
  }

  function resolveOtherMetrics(
    allColumns: ColumnMeta[],
    candidates: ColumnMeta[],
    selected: string[],
  ): string[] {
    const candidateNames = new Set(candidates.map((c) => c.name));
    return selected.filter(
      (name) =>
        !candidateNames.has(name) && allColumns.some((c) => c.name === name),
    );
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        setError("You are not authenticated. Please log in again.");
        setSaving(false);
        return;
      }

      const nextSemantic: SemanticConfig = {
        target_column:
          mode === "target"
            ? selectedTarget || null
            : (currentSemantic.target_column ?? null),
        time_column:
          mode === "time"
            ? selectedTime || null
            : (currentSemantic.time_column ?? null),
        metric_columns:
          mode === "metrics"
            ? selectedMetrics
            : (currentSemantic.metric_columns ?? []),
      };

      const res = await fetch(
        `${API_BASE_URL}/datasets/${datasetId}/semantic-config/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextSemantic),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to save semantic config:", res.status, text);
        setError("Failed to save changes. Please try again.");
        setSaving(false);
        return;
      }

      onUpdated(nextSemantic);
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving semantic config:", err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const { title, description } = titleAndDescription();

  const otherMetrics =
    mode === "metrics"
      ? resolveOtherMetrics(columnsMeta, metricColumns, selectedMetrics)
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-4 space-y-4 text-sm">
          {mode === "target" && (
            <div className="space-y-2">
              <Label htmlFor="target-column-select">
                Target / outcome column
              </Label>
              <select
                id="target-column-select"
                className="mt-1 w-full cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
              >
                <option value="">No target / not applicable</option>
                {targetColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name}
                  </option>
                ))}
              </select>
              {targetColumns.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  We couldn&apos;t detect any obvious target columns. You can
                  still pick any field during dataset upload or later on.
                </p>
              )}
            </div>
          )}

          {mode === "time" && (
            <div className="space-y-2">
              <Label htmlFor="time-column-select">Time column</Label>
              <select
                id="time-column-select"
                className="mt-1 w-full cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              >
                <option value="">No time column / not applicable</option>
                {timeColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name}
                  </option>
                ))}
              </select>
              {timeColumns.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No obvious time-like columns detected. You can still leave
                  this empty if the dataset is not time-based.
                </p>
              )}
            </div>
          )}

          {mode === "metrics" && (
            <div className="space-y-3">
              <div>
                <Label>Key numeric fields</Label>
                <p className="text-xs text-muted-foreground">
                  Select one or more numeric fields that matter most, such as
                  scores, revenue, or duration. These will be prioritised in
                  charts.
                </p>
              </div>
              {metricColumns.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No numeric metric candidates detected. You can still configure
                  metrics from the upload wizard.
                </p>
              ) : (
                <ScrollArea className="max-h-56 rounded-md border border-border/60">
                  <div className="space-y-1 px-2 py-2">
                    {metricColumns.map((col) => {
                      const checked = selectedMetrics.includes(col.name);
                      return (
                        <label
                          key={col.name}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/60"
                        >
                          <input
                            type="checkbox"
                            className="h-3 w-3 cursor-pointer accent-violet-600"
                            checked={checked}
                            onChange={() => toggleMetric(col.name)}
                          />
                          <span>{col.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {otherMetrics.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[0.7rem] text-muted-foreground">
                    Currently selected fields that don&apos;t look like numeric
                    metrics:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {otherMetrics.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-muted/80 px-2 py-0.5 text-[0.65rem]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
