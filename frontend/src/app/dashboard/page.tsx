"use client";

import { useEffect, useState, FormEvent, ChangeEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, API_BASE_URL } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type MeResponse = {
  id: number;
  username: string;
  email: string;
};

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

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadMeAndDatasets() {
      try {
        const [meData, datasetsData] = await Promise.all([
          apiFetch("/auth/me/"),
          apiFetch("/datasets/"),
        ]);

        setMe(meData);
        setDatasets(datasetsData);
      } catch {
        router.replace("/login");
      } finally {
        setLoadingMe(false);
        setLoadingDatasets(false);
      }
    }

    loadMeAndDatasets();
  }, [router]);

  // Live status polling while any dataset is pending or running
  useEffect(() => {
    if (loadingDatasets) return;

    const hasInProgress = datasets.some((ds) => {
      const status = ds.analysis?.status;
      return !status || status === "PENDING" || status === "RUNNING";
    });

    if (!hasInProgress) return;

    const interval = setInterval(async () => {
      try {
        const updated: Dataset[] = await apiFetch("/datasets/");
        setDatasets(updated);
      } catch {
        // ignore polling errors for now
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [datasets, loadingDatasets]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
    router.replace("/login");
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setUploadFile(file);

    if (file) {
      const name = file.name.toLowerCase().endsWith(".csv")
        ? file.name.slice(0, -4)
        : file.name;
      setUploadName(name);
    } else {
      setUploadName("");
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);

    if (!uploadFile) {
      setUploadError("Please select a CSV file first.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);
    if (uploadName) {
      formData.append("name", uploadName);
    }

    setUploading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/datasets/upload/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Upload error:", text);
        setUploadError("Upload failed. Check console for details.");
        setUploading(false);
        return;
      }

      const newDataset: Dataset = await res.json();
      setDatasets((prev) => [newDataset, ...prev]);
      setUploadFile(null);
      setUploadName("");
    } catch {
      setUploadError("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (loadingMe) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </main>
    );
  }

  if (!me) return null;

  return (
    <main className="min-h-screen bg-muted p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              InsightSphere Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload datasets and view basic analysis results.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {me.username}
              {me.email ? ` · ${me.email}` : ""}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>

        {/* Upload card */}
        <Card>
          <CardHeader>
            <CardTitle>Upload a dataset</CardTitle>
            <CardDescription>
              Start with a CSV file. The backend will run a simple analysis
              asynchronously.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadError && (
              <p className="mb-3 text-xs text-red-600">{uploadError}</p>
            )}
            <form className="space-y-4" onSubmit={handleUpload}>
              <div className="space-y-2">
                <Label>CSV file</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    ref={fileInputRef}
                    id="dataset-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={onFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerFilePicker}
                  >
                    Choose CSV file
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {uploadFile ? uploadFile.name : "No file selected"}
                  </span>
                </div>
              </div>

              {uploadFile && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="dataset-name">Name</Label>
                  <Input
                    id="dataset-name"
                    placeholder="Dataset name"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                  />
                </div>
              )}

              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload dataset"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Datasets list */}
        <Card>
          <CardHeader>
            <CardTitle>Your datasets</CardTitle>
            <CardDescription>
              Click a dataset to view its analysis details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDatasets ? (
              <p className="text-sm text-muted-foreground">
                Loading datasets...
              </p>
            ) : datasets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No datasets yet. Upload your first CSV above.
              </p>
            ) : (
              <div className="space-y-2">
                {datasets.map((ds) => {
                  const props = getStatusBadgeProps(ds.analysis?.status);
                  const Icon = props.icon;

                  return (
                    <Link
                      key={ds.id}
                      href={`/datasets/${ds.id}`}
                      className="block rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{ds.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(ds.uploaded_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={props.className}>
                          <Icon
                            className={`mr-1 h-3 w-3 ${
                              props.spinning ? "animate-spin" : ""
                            }`}
                          />
                          {props.label}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
