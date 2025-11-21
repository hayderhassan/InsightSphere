"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";
import type { SummaryJson } from "@/types/analysis";

interface QualityRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface QualityRowsResponse {
  columns: string[];
  rows: QualityRow[];
  total_rows_with_missing: number;
}

interface DataQualitySheetProps {
  datasetId: number;
  summary: SummaryJson | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColumnMissingInfo {
  name: string;
  missing: number;
  missingPercent: number;
}

export function DataQualitySheet(props: DataQualitySheetProps) {
  const { datasetId, summary, open, onOpenChange } = props;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualityRows, setQualityRows] = useState<QualityRowsResponse | null>(
    null,
  );

  const missingValues = summary?.missing_values ?? {};
  const rowCount = summary?.row_count ?? 0;
  const columnsMeta = summary?.columns ?? {};

  const columnMissingInfo: ColumnMissingInfo[] = useMemo(() => {
    const entries = Object.entries(missingValues);
    if (entries.length === 0 || rowCount === 0) return [];

    return entries
      .map(([name, value]) => {
        const missing = typeof value === "number" && value > 0 ? value : 0;
        const percent = rowCount > 0 ? (Number(missing) / rowCount) * 100 : 0;

        return {
          name,
          missing: Number(missing),
          missingPercent: percent,
        };
      })
      .filter((item) => item.missing > 0)
      .sort((a, b) => b.missingPercent - a.missingPercent);
  }, [missingValues, rowCount]);

  const totalColumns =
    summary?.column_count ?? Object.keys(columnsMeta ?? {}).length;
  const totalMissing = columnMissingInfo.reduce(
    (acc, item) => acc + item.missing,
    0,
  );
  const cellCount =
    rowCount > 0 && totalColumns > 0 ? rowCount * totalColumns : 0;
  const missingPercent =
    cellCount > 0 ? (totalMissing / cellCount) * 100 : undefined;

  useEffect(() => {
    if (!open) return;
    if (!summary) return;

    let cancelled = false;

    async function loadQualityRows(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const data = (await apiFetch(
          `/datasets/${datasetId}/quality-rows/?limit=50`,
        )) as QualityRowsResponse;

        if (!cancelled) {
          setQualityRows(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load rows with missing values.");
        }
        console.error("Quality rows load failed:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQualityRows();

    return () => {
      cancelled = true;
    };
  }, [datasetId, open, summary]);

  const hasMissing = columnMissingInfo.length > 0 && (missingPercent ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Data quality details</DialogTitle>
          <DialogDescription>
            Breakdown of missing values and example rows that may need cleaning.
          </DialogDescription>
        </DialogHeader>

        {!summary ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No summary information is available for this dataset yet.
          </p>
        ) : !hasMissing ? (
          <p className="mt-3 text-sm text-emerald-600">
            No missing values detected. All cells are populated.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Overall summary */}
            <div className="rounded-lg border border-border/70 bg-background/80 p-3 text-sm">
              <p className="font-medium">Overall missingness</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalMissing} missing cells across {rowCount} rows and{" "}
                {totalColumns} columns.
              </p>
              {missingPercent !== undefined && (
                <p className="mt-1 text-xs text-muted-foreground">
                  That is approximately {missingPercent.toFixed(2)}% of all
                  cells.
                </p>
              )}
            </div>

            {/* Per-column breakdown */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Columns with missing data</p>
              <ScrollArea className="max-h-56 rounded-md border border-border/60">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="sticky top-0 border-b border-border/60 px-2 py-2 text-left font-medium text-muted-foreground">
                        Column
                      </th>
                      <th className="sticky top-0 border-b border-border/60 px-2 py-2 text-right font-medium text-muted-foreground">
                        Missing rows
                      </th>
                      <th className="sticky top-0 border-b border-border/60 px-2 py-2 text-right font-medium text-muted-foreground">
                        % of rows
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {columnMissingInfo.map((col) => (
                      <tr
                        key={col.name}
                        className="border-b border-border/40 last:border-b-0"
                      >
                        <td className="px-2 py-1 text-left">{col.name}</td>
                        <td className="px-2 py-1 text-right">{col.missing}</td>
                        <td className="px-2 py-1 text-right">
                          {col.missingPercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            {/* Example rows */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Example rows with missing data
              </p>
              {loading ? (
                <p className="text-xs text-muted-foreground">Loading rows…</p>
              ) : error ? (
                <p className="text-xs text-red-500">{error}</p>
              ) : !qualityRows || qualityRows.rows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No rows with missing data found.
                </p>
              ) : (
                <ScrollArea className="max-h-64 rounded-md border border-border/60">
                  <table className="min-w-full border-collapse text-xs">
                    <thead className="bg-muted/60">
                      <tr>
                        {qualityRows.columns.map((col) => (
                          <th
                            key={col}
                            className="sticky top-0 border-b border-border/60 px-2 py-2 text-left font-medium text-muted-foreground"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {qualityRows.rows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={
                            idx % 2 === 0 ? "bg-background" : "bg-muted/30"
                          }
                        >
                          {qualityRows.columns.map((col) => (
                            <td
                              key={col}
                              className="border-b border-border/40 px-2 py-1"
                            >
                              {row[col] === null || row[col] === undefined
                                ? "·"
                                : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
