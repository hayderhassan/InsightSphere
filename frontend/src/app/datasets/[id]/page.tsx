"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch, getAccessToken, API_BASE_URL } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteDatasetButton } from "@/components/datasets/DeleteDatasetButton";
import type { Dataset } from "@/types/dataset";
import type { SummaryJson, ColumnSummary } from "@/types/analysis";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Table, Sparkles, Target, Clock, ListTree } from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import type { StatTone } from "@/components/analytics/StatCard";
import { DataPreviewSheet } from "@/components/datasets/DataPreviewSheet";
import { DataQualitySheet } from "@/components/datasets/DataQualitySheet";
import {
  SemanticEditDialog,
  type SemanticConfig,
} from "@/components/datasets/SemanticEditDialog";

export default function DatasetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = params?.id;
  const datasetId = Array.isArray(idParam) ? idParam[0] : idParam;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showRaw, setShowRaw] = useState<boolean>(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);

  const [targetEditOpen, setTargetEditOpen] = useState(false);
  const [timeEditOpen, setTimeEditOpen] = useState(false);
  const [metricsEditOpen, setMetricsEditOpen] = useState(false);

  // Local semantic config that survives polling updates
  const [semanticConfig, setSemanticConfig] = useState<SemanticConfig | null>(
    null,
  );

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

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

    loadDataset();

    // Poll for status + analysis updates
    const interval = setInterval(() => {
      apiFetch(`/datasets/${datasetId}/`)
        .then((data) => {
          setDataset(data as Dataset);
        })
        .catch(() => {
          // ignore polling errors
        });
    }, 3000);

    return () => clearInterval(interval);
  }, [router, datasetId]);

  // Bootstrap semanticConfig ONCE from backend summary.
  // After it is set, we don't overwrite it on further polls,
  // so user edits (and dialog state) remain stable.
  useEffect(() => {
    if (semanticConfig !== null) return;
    if (!dataset?.analysis?.summary_json) return;

    const summary = dataset.analysis.summary_json as SummaryJson;
    const semantic = summary.semantic_config as SemanticConfig | undefined;

    if (semantic) {
      setSemanticConfig({
        target_column: semantic.target_column ?? null,
        metric_columns: Array.isArray(semantic.metric_columns)
          ? semantic.metric_columns
          : [],
        time_column: semantic.time_column ?? null,
      });
    }
  }, [dataset, semanticConfig]);

  async function handleDelete(): Promise<void> {
    if (!datasetId) return;

    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/datasets/${datasetId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok && res.status !== 204) {
        console.error("Delete failed:", res.status);
        setDeleting(false);
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dataset...</p>
      </div>
    );
  }

  if (loadError || !dataset) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Card className="max-w-md bg-card/90 backdrop-blur border-border/70">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>There was a problem.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500">
              {loadError ?? "Dataset not found"}
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Back to dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analysis = dataset.analysis;
  const summary: SummaryJson | undefined = analysis?.summary_json;

  const missingValues = summary?.missing_values ?? {};
  const missingValuesData = Object.entries(missingValues).map(
    ([col, count]) => ({
      column: col,
      missing: count,
    }),
  );

  const columns = summary?.columns ?? {};
  const columnEntries = Object.entries<ColumnSummary>(columns);

  const numericColumns = columnEntries.filter(
    ([, col]) => col.type === "numeric",
  );
  const categoricalColumns = columnEntries.filter(
    ([, col]) => col.type === "categorical" || col.type === "boolean",
  );

  const totalColumns = summary?.column_count ?? columnEntries.length;

  const totalMissing = Object.values(missingValues).reduce(
    (accumulator, value) =>
      accumulator + (typeof value === "number" ? value : 0),
    0,
  );

  const rowCount = summary?.row_count ?? 0;
  const cellCount =
    rowCount > 0 && totalColumns > 0 ? rowCount * totalColumns : 0;
  const missingPercent =
    cellCount > 0 ? (totalMissing / cellCount) * 100 : undefined;

  // Effective semantic config: prefer local semanticConfig,
  // fall back to backend summary if we never initialised.
  const effectiveSemantic: SemanticConfig | null =
    semanticConfig ??
    ((summary?.semantic_config as SemanticConfig | undefined)
      ? {
          target_column:
            (summary?.semantic_config as SemanticConfig).target_column ?? null,
          metric_columns: Array.isArray(
            (summary?.semantic_config as SemanticConfig).metric_columns,
          )
            ? (summary?.semantic_config as SemanticConfig).metric_columns
            : [],
          time_column:
            (summary?.semantic_config as SemanticConfig).time_column ?? null,
        }
      : null);

  const semanticTarget = effectiveSemantic?.target_column ?? "Not set";
  const semanticTime = effectiveSemantic?.time_column ?? "Not set";
  const semanticMetrics = effectiveSemantic?.metric_columns ?? [];

  const hasMissingValues =
    missingValuesData.length > 0 &&
    !missingValuesData.every((d) => d.missing === 0);

  // Data quality score (0–100)
  let dataQualityScore: number | undefined;
  let dataQualityLabel: string | undefined;
  let dataQualityTone: StatTone = "default";

  if (totalColumns > 0) {
    const knownTypeCount = columnEntries.filter(
      ([, col]) => col.type && col.type !== "unknown",
    ).length;
    const typeCoverage = knownTypeCount / totalColumns;

    const missingQuality =
      missingPercent === undefined ? 1 : Math.max(0, 1 - missingPercent / 70);
    const typeQuality = typeCoverage;

    const score = 100 * (0.7 * missingQuality + 0.3 * typeQuality);
    dataQualityScore = Math.round(score);

    if (dataQualityScore >= 85) {
      dataQualityLabel = "Excellent";
      dataQualityTone = "success";
    } else if (dataQualityScore >= 70) {
      dataQualityLabel = "Good";
      dataQualityTone = "primary";
    } else if (dataQualityScore >= 50) {
      dataQualityLabel = "Fair";
      dataQualityTone = "warning";
    } else {
      dataQualityLabel = "Poor";
      dataQualityTone = "danger";
    }
  }

  const targetTone: StatTone =
    effectiveSemantic && effectiveSemantic.target_column
      ? "primary"
      : "warning";
  const timeTone: StatTone =
    effectiveSemantic && effectiveSemantic.time_column ? "info" : "default";

  const metricsTone: StatTone = semanticMetrics.length > 0 ? "info" : "default";
  const keyFields = semanticMetrics.length > 0 ? semanticMetrics : [];

  return (
    <>
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <h2 className="font-bold text-3xl">{dataset.name}</h2>
              {/*<h1 className="text-2xl font-semibold tracking-tight text-primary-foreground">
                {dataset.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Dataset ID {dataset.id} · Uploaded{" "}
                {new Date(dataset.uploaded_at).toLocaleString()}
              </p>*/}
            </div>
            <div className="flex gap-2">
              <StatusBadge status={dataset.analysis?.status} />
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Records"
              value={rowCount || "—"}
              subtitle="Total rows · click to preview"
              icon={Table}
              tone="primary"
              onClick={() => {
                if (rowCount > 0) {
                  setPreviewOpen(true);
                }
              }}
            />
            <StatCard
              title="Data quality"
              value={dataQualityScore ?? "—"}
              subtitle={
                dataQualityLabel && dataQualityScore !== undefined
                  ? `${dataQualityLabel}${
                      missingPercent !== undefined
                        ? ` · ${missingPercent.toFixed(1)}% missing`
                        : ""
                    }`
                  : "Based on missing data and type coverage"
              }
              icon={Sparkles}
              tone={dataQualityTone}
              onClick={() => {
                if (summary) {
                  setQualityOpen(true);
                }
              }}
            />
            <StatCard
              title="Target label"
              value={semanticTarget}
              subtitle={
                effectiveSemantic?.target_column
                  ? "Field representing the outcome or label"
                  : "Click to choose an outcome field"
              }
              icon={Target}
              tone={targetTone}
              onClick={() => {
                if (summary) {
                  setTargetEditOpen(true);
                }
              }}
            />
            <StatCard
              title="Time field"
              value={semanticTime}
              subtitle={
                effectiveSemantic?.time_column
                  ? "Used for time-based trends and grouping"
                  : "Click to choose a date or time field"
              }
              icon={Clock}
              tone={timeTone}
              onClick={() => {
                if (summary) {
                  setTimeEditOpen(true);
                }
              }}
            />
            <StatCard
              title="Key fields"
              value={keyFields.length > 0 ? keyFields.length : "Not set"}
              subtitle={
                keyFields.length === 0
                  ? "Click to pick important numeric fields"
                  : "Prioritised metrics for charts"
              }
              badges={keyFields}
              icon={ListTree}
              tone={metricsTone}
              onClick={() => {
                if (summary) {
                  setMetricsEditOpen(true);
                }
              }}
            />
          </div>

          {/* Missing values chart – only if there ARE missing values */}
          {hasMissingValues && (
            <Card className="bg-card/80 backdrop-blur border-border/70">
              <CardHeader>
                <CardTitle>Missing values per column</CardTitle>
                <CardDescription>
                  Helps identify columns that may need cleaning or imputation.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={missingValuesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="column" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="missing" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Numeric columns charts */}
          {numericColumns.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-primary-foreground">
                  Numeric columns
                </h2>
                <p className="text-sm text-muted-foreground">
                  Histograms show the distribution of numeric fields.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {numericColumns.map(([name, col]) => {
                  const hist = col.histogram ?? [];
                  const describe = col.describe ?? {};
                  const meanValue =
                    typeof describe.mean === "number"
                      ? describe.mean.toFixed(2)
                      : "—";
                  const minValue =
                    describe.min !== undefined ? String(describe.min) : "—";
                  const maxValue =
                    describe.max !== undefined ? String(describe.max) : "—";

                  return (
                    <Card
                      key={name}
                      className="flex flex-col bg-card/80 backdrop-blur border-border/70"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Mean {meanValue}, min {minValue}, max {maxValue}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-56">
                        {hist.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No histogram data available.
                          </p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hist}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="bin"
                                tick={{ fontSize: 10 }}
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Categorical columns charts */}
          {categoricalColumns.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-primary-foreground">
                  Categorical / boolean columns
                </h2>
                <p className="text-sm text-muted-foreground">
                  Top categories by frequency for each column.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {categoricalColumns.map(([name, col]) => {
                  const valueCounts = col.value_counts ?? [];
                  return (
                    <Card
                      key={name}
                      className="flex flex-col bg-card/80 backdrop-blur border-border/70"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Top {valueCounts.length} values
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-56">
                        {valueCounts.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No value-count data available.
                          </p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={valueCounts}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="value"
                                tick={{ fontSize: 10 }}
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Raw JSON toggle */}
          {analysis?.summary_json && (
            <Card className="bg-card/80 backdrop-blur border-border/70">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Raw summary JSON</CardTitle>
                  <CardDescription>
                    Useful for debugging and future feature development.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRaw((value) => !value)}
                >
                  {showRaw ? "Hide raw JSON" : "Show raw JSON"}
                </Button>
              </CardHeader>
              {showRaw && (
                <CardContent>
                  <pre className="max-h-[400px] overflow-x-auto overflow-y-auto rounded-md bg-background p-3 text-xs">
                    {JSON.stringify(analysis.summary_json, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Sheets / dialogs */}
      {dataset && (
        <>
          <DataPreviewSheet
            datasetId={dataset.id}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
          />
          <DataQualitySheet
            datasetId={dataset.id}
            summary={summary}
            open={qualityOpen}
            onOpenChange={setQualityOpen}
          />
        </>
      )}

      {dataset && summary && effectiveSemantic && (
        <>
          <SemanticEditDialog
            datasetId={dataset.id}
            summary={summary}
            currentSemantic={effectiveSemantic}
            mode="target"
            open={targetEditOpen}
            onOpenChange={setTargetEditOpen}
            onUpdated={(semantic) => setSemanticConfig(semantic)}
          />
          <SemanticEditDialog
            datasetId={dataset.id}
            summary={summary}
            currentSemantic={effectiveSemantic}
            mode="time"
            open={timeEditOpen}
            onOpenChange={setTimeEditOpen}
            onUpdated={(semantic) => setSemanticConfig(semantic)}
          />
          <SemanticEditDialog
            datasetId={dataset.id}
            summary={summary}
            currentSemantic={effectiveSemantic}
            mode="metrics"
            open={metricsEditOpen}
            onOpenChange={setMetricsEditOpen}
            onUpdated={(semantic) => setSemanticConfig(semantic)}
          />
        </>
      )}
    </>
  );
}
