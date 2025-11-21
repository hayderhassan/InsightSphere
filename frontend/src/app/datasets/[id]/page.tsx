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
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

type ColumnSummary = {
  type?: "numeric" | "categorical" | "boolean" | "datetime" | "other";
  describe?: Record<string, any>;
  histogram?: { bin: string; count: number }[];
  value_counts?: { value: string; count: number }[];
};

type SummaryJson = {
  row_count?: number;
  column_count?: number;
  missing_values?: Record<string, number>;
  columns?: Record<string, ColumnSummary>;
};

type AnalysisResult = {
  status: AnalysisStatus;
  summary_json?: SummaryJson;
  created_at: string;
  error_message?: string | null;
};

type Dataset = {
  id: number;
  name: string;
  original_file: string;
  uploaded_at: string;
  analysis?: AnalysisResult | null;
};

function getStatusBadgeProps(status: AnalysisStatus | undefined) {
  const normalized: AnalysisStatus = status ?? "PENDING";

  switch (normalized) {
    case "PENDING":
      return {
        label: "Pending",
        icon: Clock,
        className: "bg-amber-100 text-amber-800 border border-amber-200",
      };
    case "RUNNING":
      return {
        label: "Running",
        icon: Loader2,
        className: "bg-sky-100 text-sky-800 border border-sky-200",
        spinning: true,
      };
    case "COMPLETED":
      return {
        label: "Completed",
        icon: CheckCircle2,
        className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      };
    case "FAILED":
    default:
      return {
        label: "Failed",
        icon: AlertCircle,
        className: "bg-red-100 text-red-800 border border-red-200",
      };
  }
}

export default function DatasetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = params?.id;
  const datasetId = Array.isArray(idParam) ? idParam[0] : idParam;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

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

    async function loadDataset() {
      try {
        const data = await apiFetch(`/datasets/${datasetId}/`);
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
          setDataset(data);
        })
        .catch(() => {
          // ignore polling errors
        });
    }, 3000);

    return () => clearInterval(interval);
  }, [router, datasetId]);

  async function handleDelete() {
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
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dataset...</p>
      </main>
    );
  }

  if (loadError || !dataset) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>There was a problem.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              {loadError || "Dataset not found"}
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
      </main>
    );
  }

  const analysis = dataset.analysis;
  const summary = (analysis?.summary_json || {}) as SummaryJson;
  const badgeProps = getStatusBadgeProps(analysis?.status);
  const Icon = badgeProps.icon;

  const missingValues = summary.missing_values || {};
  const missingValuesData = Object.entries(missingValues).map(
    ([col, count]) => ({
      column: col,
      missing: count,
    }),
  );

  const columns = summary.columns || {};
  const columnEntries = Object.entries(columns);

  const numericColumns = columnEntries.filter(
    ([, col]) => col.type === "numeric",
  );
  const categoricalColumns = columnEntries.filter(
    ([, col]) => col.type === "categorical" || col.type === "boolean",
  );

  const numericCount = numericColumns.length;
  const categoricalCount = categoricalColumns.length;
  const totalColumns = summary.column_count ?? columnEntries.length;

  const totalMissing = Object.values(missingValues).reduce(
    (acc, v) => acc + (typeof v === "number" ? v : 0),
    0,
  );

  return (
    <main className="min-h-screen bg-muted p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {dataset.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Dataset ID {dataset.id} · Uploaded{" "}
              {new Date(dataset.uploaded_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className={badgeProps.className}>
              <Icon
                className={`mr-1 h-3 w-3 ${
                  (badgeProps as any).spinning ? "animate-spin" : ""
                }`}
              />
              {badgeProps.label}
            </Badge>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {summary.row_count ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">Total records</p>
            </CardContent>
          </Card>

          <Card>
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

          <Card>
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

          <Card>
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
        <Card>
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
              <h2 className="text-lg font-semibold">Numeric columns</h2>
              <p className="text-sm text-muted-foreground">
                Histograms show the distribution of numeric fields.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {numericColumns.map(([name, col]) => {
                const hist = col.histogram || [];
                const describe = col.describe || {};
                return (
                  <Card key={name} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Mean{" "}
                        {describe.mean !== undefined
                          ? Number(describe.mean).toFixed(2)
                          : "—"}
                        , min {describe.min !== undefined ? describe.min : "—"},
                        max {describe.max !== undefined ? describe.max : "—"}
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
              <h2 className="text-lg font-semibold">
                Categorical / boolean columns
              </h2>
              <p className="text-sm text-muted-foreground">
                Top categories by frequency for each column.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {categoricalColumns.map(([name, col]) => {
                const vc = col.value_counts || [];
                return (
                  <Card key={name} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Top {vc.length} values
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-56">
                      {vc.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No value-count data available.
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={vc}>
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
          <Card>
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
                onClick={() => setShowRaw((v) => !v)}
              >
                {showRaw ? "Hide raw JSON" : "Show raw JSON"}
              </Button>
            </CardHeader>
            {showRaw && (
              <CardContent>
                <pre className="text-xs bg-background rounded-md p-3 overflow-x-auto">
                  {JSON.stringify(analysis.summary_json, null, 2)}
                </pre>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </main>
  );
}
