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
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import type { User } from "@/types/user";
import type { Dataset } from "@/types/dataset";

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [loadingMe, setLoadingMe] = useState<boolean>(true);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true);

  const [uploadName, setUploadName] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadMeAndDatasets(): Promise<void> {
      try {
        const [meData, datasetsData] = await Promise.all([
          apiFetch("/auth/me/"),
          apiFetch("/datasets/"),
        ]);

        setMe(meData as User);
        setDatasets(datasetsData as Dataset[]);
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
      return (
        status === undefined || status === "PENDING" || status === "RUNNING"
      );
    });

    if (!hasInProgress) return;

    const interval = setInterval(async () => {
      try {
        const updated = (await apiFetch("/datasets/")) as Dataset[];
        setDatasets(updated);
      } catch {
        // ignore polling errors for now
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [datasets, loadingDatasets]);

  function triggerFilePicker(): void {
    fileInputRef.current?.click();
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0] ?? null;
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

  async function handleUpload(e: FormEvent<HTMLFormElement>): Promise<void> {
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

      const newDataset = (await res.json()) as Dataset;
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
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              InsightSphere Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload datasets and view automated profiling results.
            </p>
          </div>
        </div>

        {/* Upload card */}
        <Card className="bg-card border-border/70 shadow-md">
          <CardHeader>
            <CardTitle>Upload a dataset</CardTitle>
            <CardDescription>
              Start with a CSV file. The backend will run a profiling task
              asynchronously.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadError && (
              <p className="mb-3 text-xs text-red-500">{uploadError}</p>
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
        <Card className="bg-card border-border/70 shadow-md">
          <CardHeader>
            <CardTitle>Your datasets</CardTitle>
            <CardDescription>
              Click a dataset to view its analysis details and charts.
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
                {datasets.map((ds) => (
                  <Link
                    key={ds.id}
                    href={`/datasets/${ds.id}`}
                    className="block rounded-lg border border-border/70 bg-background px-3 py-2 text-sm hover:border-primary/60 hover:bg-accent/40 hover:text-accent-foreground transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{ds.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(ds.uploaded_at).toLocaleString()}
                        </p>
                      </div>
                      <StatusBadge status={ds.analysis?.status ?? undefined} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
