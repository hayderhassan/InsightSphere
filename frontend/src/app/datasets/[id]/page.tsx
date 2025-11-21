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

type AnalysisResult = {
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  summary_json?: any;
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

function getStatusBadgeProps(status: AnalysisResult["status"] | undefined) {
  const normalized: AnalysisResult["status"] = status ?? "PENDING";

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

    // Poll for status updates
    const interval = setInterval(() => {
      apiFetch(`/datasets/${datasetId}/`)
        .then((data) => {
          setDataset(data);
        })
        .catch(() => {
          // ignore polling error
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
  const badgeProps = getStatusBadgeProps(analysis?.status);
  const Icon = badgeProps.icon;

  return (
    <main className="min-h-screen bg-muted p-6">
      <div className="max-w-5xl mx-auto space-y-6">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Analysis status</CardTitle>
              <CardDescription>
                Basic profiling result from the Celery task.
              </CardDescription>
            </div>
            <Badge className={badgeProps.className}>
              <Icon
                className={`mr-1 h-3 w-3 ${
                  badgeProps.spinning ? "animate-spin" : ""
                }`}
              />
              {badgeProps.label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {analysis ? (
              <>
                <p>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(analysis.created_at).toLocaleString()}
                </p>
                {analysis.error_message && (
                  <p className="text-red-600">
                    <span className="font-medium">Error:</span>{" "}
                    {analysis.error_message}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                No analysis record yet. It may still be initialising.
              </p>
            )}
          </CardContent>
        </Card>

        {analysis?.summary_json && (
          <Card>
            <CardHeader>
              <CardTitle>Raw summary JSON</CardTitle>
              <CardDescription>
                For now we just dump the raw summary. Later we&apos;ll turn this
                into charts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-background rounded-md p-3 overflow-x-auto">
                {JSON.stringify(analysis.summary_json, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
