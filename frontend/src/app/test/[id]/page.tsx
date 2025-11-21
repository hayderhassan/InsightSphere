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
    // const interval = setInterval(() => {
    //   apiFetch(`/datasets/${datasetId}/`)
    //     .then((data) => {
    //       setDataset(data as Dataset);
    //     })
    //     .catch(() => {
    //       // ignore polling errors
    //     });
    // }, 3000);

    // return () => clearInterval(interval);
  }, [router, datasetId]);

  async function handleDelete(): Promise<void> {
    if (!datasetId) return;
    if (!window.confirm("Delete this dataset?")) return;

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

  const numericCount = numericColumns.length;
  const categoricalCount = categoricalColumns.length;
  const totalColumns = summary?.column_count ?? columnEntries.length;

  const totalMissing = Object.values(missingValues).reduce(
    (accumulator, value) =>
      accumulator + (typeof value === "number" ? value : 0),
    0,
  );

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary-foreground">
              {dataset.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Dataset ID {dataset.id} · Uploaded{" "}
              {new Date(dataset.uploaded_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={dataset.analysis?.status} />
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Back to dashboard
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete dataset"}
            </Button>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/80 backdrop-blur border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {summary?.row_count ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">Total records</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{totalColumns || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {numericCount} numeric · {categoricalCount} categorical/boolean
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Numeric columns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{numericCount}</p>
              <p className="text-xs text-muted-foreground">Ready for charts</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Missing values
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{totalMissing}</p>
              <p className="text-xs text-muted-foreground">
                Across all columns
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Missing values chart */}
        <Card className="bg-card/80 backdrop-blur border-border/70">
          <CardHeader>
            <CardTitle>Missing values per column</CardTitle>
            <CardDescription>
              Helps identify columns that may need cleaning or imputation.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {missingValuesData.length === 0 ||
            missingValuesData.every((d) => d.missing === 0) ? (
              <p className="text-sm text-muted-foreground">
                No missing values detected.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missingValuesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="column" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="missing" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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
                console.log("test", name, col, valueCounts);
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
  );
}
