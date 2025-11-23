"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteDatasetButton } from "@/components/datasets/DeleteDatasetButton";
import type { Dataset } from "@/types/dataset";
import type {
  SummaryJson,
  SemanticConfig,
  ColumnSummary,
} from "@/types/analysis";
import { SemanticEditDialog } from "@/components/analytics/SemanticEditDialog";
import { OverviewStats } from "@/components/datasets/OverviewStats";
import { MissingData } from "@/components/datasets/MissingData";
import { NumericalFields } from "@/components/datasets/NumericalFields";
import { CategoricalFields } from "@/components/datasets/CategoricalFields";
import { RawJson } from "@/components/datasets/RawJson";
import { Error } from "@/components/Error";
import { SmartInsights } from "@/components/datasets/SmartInsights";
import { Loading } from "@/components/Loading";

export default function DatasetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = params?.id;
  const datasetId = Array.isArray(idParam) ? idParam[0] : idParam;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [semanticEditorOpen, setSemanticEditorOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!datasetId) {
      setLoadError("Missing dataset id");
      setLoading(false);
      return;
    }

    async function loadDataset(): Promise<void> {
      try {
        const data = (await apiFetch(`/datasets/${datasetId}/`)) as Dataset;
        setDataset(data);
      } catch {
        setLoadError("Failed to load dataset");
      } finally {
        setLoading(false);
      }
    }

    void loadDataset();

    const interval = setInterval(() => {
      if (semanticEditorOpen) return; // don't clobber local edits

      apiFetch(`/datasets/${datasetId}/`)
        .then((data) => {
          setDataset(data as Dataset);
        })
        .catch(() => {
          // ignore polling errors
        });
    }, 3000);

    return () => clearInterval(interval);
  }, [router, datasetId, semanticEditorOpen]);

  async function handleDelete(): Promise<void> {
    if (!datasetId) return;

    setDeleting(true);

    try {
      await apiFetch(`/datasets/${datasetId}/`, {
        method: "DELETE",
      });

      router.replace("/dashboard");
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
    }
  }

  async function handleSaveSemantic(payload: {
    target_column: string | null;
    metric_columns: string[];
    time_column: string | null;
    column_types: Record<string, string>;
  }): Promise<void> {
    if (!dataset) return;

    try {
      await apiFetch(`/datasets/${dataset.id}/semantic-config/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Semantic config save error:", err);
      return;
    }

    // Refresh dataset once after saving to pull latest semantics / aggregates
    try {
      const updated = (await apiFetch(`/datasets/${dataset.id}/`)) as Dataset;
      setDataset(updated);
    } catch (err) {
      console.error("Failed to refresh dataset after semantic save:", err);
    }
  }

  if (loading) {
    return <Loading loadMsg="Loading dataset" />;
  }

  if (loadError || !dataset) {
    return <Error loadError={loadError} />;
  }

  const analysis = dataset.analysis;
  const summaryJson: SummaryJson | undefined = analysis?.summary_json;

  const missingValues = summaryJson?.missing_values ?? {};
  const missingValuesData = Object.entries(missingValues).map(
    ([col, count]) => ({
      column: col,
      count: count as number,
    }),
  );
  const columns = summaryJson?.columns ?? {};
  const columnEntries = Object.entries<ColumnSummary>(columns);

  const semantic: SemanticConfig | null = summaryJson?.semantic_config ?? null;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {dataset.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dataset.analysis?.status} />
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              type="button"
              onClick={() => setSemanticEditorOpen(true)}
            >
              Edit semantics
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="cursor-pointer">
                Back to dashboard
              </Button>
            </Link>
            <DeleteDatasetButton
              onConfirm={handleDelete}
              disabled={deleting}
              isProcessing={deleting}
              label={deleting ? "Deleting..." : "Delete dataset"}
              title="Delete this dataset?"
              description="This will permanently remove this dataset and its analysis. This action cannot be undone."
            />
          </div>
        </div>

        {/* Overview stat cards */}
        <OverviewStats semantic={semantic} summaryJson={summaryJson} />

        {/* Smart insights section */}
        <SmartInsights summaryJson={summaryJson} />

        {/* Missing values chart */}
        <MissingData missingColumns={missingValuesData} />

        {/* Numeric columns charts */}
        <NumericalFields columnEntries={columnEntries} />

        {/* Categorical columns charts */}
        <CategoricalFields columnEntries={columnEntries} />

        {/* Raw JSON toggle */}
        <RawJson summaryJson={summaryJson} />

        {/* Semantic editor dialog */}
        <SemanticEditDialog
          open={semanticEditorOpen}
          onOpenChange={setSemanticEditorOpen}
          summary={summaryJson ?? null}
          semantic={semantic}
          onSave={handleSaveSemantic}
        />
      </div>
    </div>
  );
}
