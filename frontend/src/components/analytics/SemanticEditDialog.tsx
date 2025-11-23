"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { SummaryJson, SemanticConfig } from "@/types/analysis";
import type { ColumnMeta, LogicalType } from "@/types/semantic";
import {
  buildColumnsMeta,
  buildSemanticCandidates,
  getEffectiveType as baseGetEffectiveType,
} from "@/lib/datasetSemantic";

interface SemanticEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: SummaryJson | null | undefined;
  semantic: SemanticConfig | null | undefined;
  onSave: (payload: {
    target_column: string | null;
    metric_columns: string[];
    time_column: string | null;
    column_types: Record<string, LogicalType>;
  }) => Promise<void> | void;
}

export function SemanticEditDialog(props: SemanticEditDialogProps) {
  const { open, onOpenChange, summary, semantic, onSave } = props;

  const columnsMeta: ColumnMeta[] = useMemo(
    () => buildColumnsMeta(summary ?? null),
    [summary],
  );

  const [typeOverrides, setTypeOverrides] = useState<
    Record<string, LogicalType>
  >({});
  const [target, setTarget] = useState<string>("");
  const [metrics, setMetrics] = useState<string[]>([]);
  const [timeColumn, setTimeColumn] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Initialise local state whenever dialog opens or summary/semantic change
  useEffect(() => {
    if (!open) return;

    const initialOverrides: Record<string, LogicalType> = {};
    const semanticTypes = semantic?.column_types ?? {};
    for (const col of columnsMeta) {
      const override = semanticTypes[col.name] as LogicalType | undefined;
      if (override) {
        initialOverrides[col.name] = override;
      }
    }

    setTypeOverrides(initialOverrides);
    setTarget(semantic?.target_column ?? "");
    setMetrics(
      Array.isArray(semantic?.metric_columns) ? semantic.metric_columns : [],
    );
    setTimeColumn(semantic?.time_column ?? "");
  }, [open, semantic, columnsMeta]);

  function getEffectiveType(col: ColumnMeta): LogicalType {
    return baseGetEffectiveType(col, typeOverrides);
  }

  const { targetColumns, metricColumns, timeColumns } = useMemo(
    () => buildSemanticCandidates(columnsMeta, typeOverrides),
    [columnsMeta, typeOverrides],
  );

  function toggleMetric(metricName: string): void {
    setMetrics((current) =>
      current.includes(metricName)
        ? current.filter((m) => m !== metricName)
        : [...current, metricName],
    );
  }

  function handleTypeOverrideChange(
    columnName: string,
    value: LogicalType,
  ): void {
    setTypeOverrides((prev) => ({
      ...prev,
      [columnName]: value,
    }));
  }

  async function handleSave(): Promise<void> {
    if (!summary) return;

    const columnTypes: Record<string, LogicalType> = {};
    for (const col of columnsMeta) {
      columnTypes[col.name] = getEffectiveType(col);
    }

    const payload = {
      target_column: target || null,
      metric_columns: metrics,
      time_column: timeColumn || null,
      column_types: columnTypes,
    };

    try {
      setSaving(true);
      await onSave(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dataset semantics</DialogTitle>
          <DialogDescription>
            Choose which columns represent your target, key metrics and time,
            and adjust detected types if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto pr-1 text-xs">
          {/* Column types quick view */}
          <section className="space-y-2">
            <Label className="text-[0.75rem]">
              Detected column types (click to adjust)
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {columnsMeta.map((col) => {
                const effective = getEffectiveType(col);
                return (
                  <div
                    key={col.name}
                    className="flex flex-col gap-1 rounded-md border border-border/70 bg-background px-2 py-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[0.7rem] font-medium">
                        {col.name}
                      </span>
                      <select
                        className="ml-2 h-6 min-w-[6rem] cursor-pointer rounded-md border border-input bg-card px-1 text-[0.7rem] outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={effective}
                        onChange={(e) =>
                          handleTypeOverrideChange(
                            col.name,
                            e.target.value as LogicalType,
                          )
                        }
                      >
                        <option value="unknown">Unknown</option>
                        <option value="numeric">Numeric</option>
                        <option value="categorical">Categorical</option>
                        <option value="boolean">Boolean</option>
                        <option value="datetime">Date / time</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[0.65rem] text-muted-foreground">
                      {col.isIdLike && (
                        <span className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                          ID-like
                        </span>
                      )}
                      {col.isTimeLike && (
                        <span className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                          Time-like
                        </span>
                      )}
                      {col.isBinaryLike && (
                        <span className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                          Binary-like
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Target */}
          <section className="space-y-1">
            <Label htmlFor="semantic-target" className="text-[0.75rem]">
              Target / outcome column (optional)
            </Label>
            <select
              id="semantic-target"
              className="mt-1 w-full cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-[0.75rem] outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">No target / not applicable</option>
              {targetColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
          </section>

          {/* Metrics */}
          <section className="space-y-1">
            <Label className="text-[0.75rem]">Key metric fields</Label>
            <p className="text-[0.65rem] text-muted-foreground">
              Pick numeric fields that matter most. You can select multiple.
            </p>
            {metricColumns.length === 0 ? (
              <p className="text-[0.7rem] text-muted-foreground">
                No numeric candidates detected.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {metricColumns.map((col) => {
                  const checked = metrics.includes(col.name);
                  return (
                    <label
                      key={col.name}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 text-[0.7rem] hover:border-primary/60"
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3 cursor-pointer accent-violet-600"
                        checked={checked}
                        onChange={() => toggleMetric(col.name)}
                      />
                      <span className="truncate">{col.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {/* Time */}
          <section className="space-y-1">
            <Label htmlFor="semantic-time" className="text-[0.75rem]">
              Time column (optional)
            </Label>
            <select
              id="semantic-time"
              className="mt-1 w-full cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-[0.75rem] outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={timeColumn}
              onChange={(e) => setTimeColumn(e.target.value)}
            >
              <option value="">No time column / not applicable</option>
              {timeColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
          </section>
        </div>

        <DialogFooter className="mt-3">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save semantics"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
