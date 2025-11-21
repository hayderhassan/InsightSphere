"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";

interface PreviewRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface PreviewResponse {
  columns: string[];
  rows: PreviewRow[];
  total_rows: number;
}

interface DataPreviewSheetProps {
  datasetId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataPreviewSheet(props: DataPreviewSheetProps) {
  const { datasetId, open, onOpenChange } = props;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadPreview(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const data = (await apiFetch(
          `/datasets/${datasetId}/preview/?limit=100&offset=0`,
        )) as PreviewResponse;

        if (!cancelled) {
          setPreview(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load dataset preview.");
        }
        console.error("Preview load failed:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [datasetId, open]);

  const columns = preview?.columns ?? [];
  const rows = preview?.rows ?? [];
  const totalRows = preview?.total_rows ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Dataset preview</DialogTitle>
          <DialogDescription>
            Showing up to 100 rows from this dataset. Total rows: {totalRows}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading preview…</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No data rows available in this dataset.
            </p>
          ) : (
            <ScrollArea className="max-h-[420px] rounded-md border border-border/60">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    {columns.map((col) => (
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
                  {rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={
                        idx % 2 === 0 ? "bg-background" : "bg-muted/30"
                      }
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="border-b border-border/40 px-2 py-1"
                        >
                          {row[col] === null || row[col] === undefined
                            ? "—"
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
      </DialogContent>
    </Dialog>
  );
}
