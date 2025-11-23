"use client";

import {
  useEffect,
  useState,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Progress } from "@/components/ui/progress";
import type { Dataset } from "@/types/dataset";
import type { SummaryJson } from "@/types/analysis";
import type { UploadStage, ColumnMeta, LogicalType } from "@/types/semantic";
import {
  buildColumnsMeta,
  buildSemanticCandidates,
  getEffectiveType as baseGetEffectiveType,
  getStageLabel,
} from "@/lib/datasetSemantic";
import { ColumnTypeReview } from "@/components/datasets/ColumnTypeReview";

export default function NewDatasetPage() {
  const router = useRouter();

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [summary, setSummary] = useState<SummaryJson | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [typeOverrides, setTypeOverrides] = useState<
    Record<string, LogicalType>
  >({});

  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedTimeColumn, setSelectedTimeColumn] = useState<string>("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  function handleFileButtonClick(): void {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0] ?? null;
    setUploadFile(file);
    setUploadError(null);

    if (file) {
      const baseName = file.name.toLowerCase().endsWith(".csv")
        ? file.name.slice(0, -4)
        : file.name;
      setUploadName(baseName);
    } else {
      setUploadName("");
    }
  }

  async function pollForSummary(
    datasetId: number,
  ): Promise<SummaryJson | null> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const ds = (await apiFetch(`/datasets/${datasetId}/`)) as Dataset;

      setDataset(ds);

      const s = ds.analysis?.summary_json as SummaryJson | undefined;
      const hasColumns =
        s &&
        s.columns &&
        Object.keys(s.columns as Record<string, unknown>).length > 0;

      if (s && hasColumns) {
        return s;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return null;
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

    setIsSubmitting(true);
    setUploadStage("uploading");
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadName) {
        formData.append("name", uploadName);
      }

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
        setUploadError("Upload failed. Please check your CSV and try again.");
        setUploadStage("error");
        setUploadProgress(0);
        setIsSubmitting(false);
        return;
      }

      const newDataset = (await res.json()) as Dataset;
      setDataset(newDataset);
      setUploadStage("processing");
      setUploadProgress(60);

      const detectedSummary = await pollForSummary(newDataset.id);

      if (detectedSummary) {
        setSummary(detectedSummary);
      }

      setUploadStage("done");
      setUploadProgress(100);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("Something went wrong during upload. Please try again.");
      setUploadStage("error");
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  const columnsMeta: ColumnMeta[] = buildColumnsMeta(summary);

  function getEffectiveType(col: ColumnMeta): LogicalType {
    return baseGetEffectiveType(col, typeOverrides);
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

  const { targetColumns, metricColumns, timeColumns } = buildSemanticCandidates(
    columnsMeta,
    typeOverrides,
  );

  function toggleMetric(metric: string): void {
    setSelectedMetrics((current) =>
      current.includes(metric)
        ? current.filter((m) => m !== metric)
        : [...current, metric],
    );
  }

  async function handleQuestionsSubmit(
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    if (!dataset) return;

    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const columnTypes = Object.fromEntries(
      columnsMeta.map((col) => [col.name, getEffectiveType(col)]),
    );

    const payload = {
      target_column: selectedTarget || null,
      metric_columns: selectedMetrics,
      time_column: selectedTimeColumn || null,
      column_types: columnTypes,
    };

    try {
      const res = await fetch(
        `${API_BASE_URL}/datasets/${dataset.id}/semantic-config/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Semantic config save error:", text);
      }
    } catch (error) {
      console.error("Failed to save semantic config:", error);
    }

    router.push(`/datasets/${dataset.id}`);
  }

  const showQuestions: boolean = uploadStage === "done" && dataset !== null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary-foreground">
              Add new dataset
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload a CSV file, review the detected column types, then answer a
              few quick questions so we can understand your dataset.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="cursor-pointer">
              Back to dashboard
            </Button>
          </Link>
        </div>

        {/* Upload card */}
        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>
              We&apos;ll inspect the columns and help you describe the dataset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadError && (
              <p className="mb-3 text-xs text-red-500">{uploadError}</p>
            )}

            <form className="space-y-4" onSubmit={handleUpload}>
              <div className="space-y-2">
                <Label htmlFor="dataset-file">CSV file</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    ref={fileInputRef}
                    id="dataset-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFileButtonClick}
                    disabled={isSubmitting}
                    className="cursor-pointer"
                  >
                    Choose CSV file
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {uploadFile ? uploadFile.name : "No file selected"}
                  </span>
                </div>
              </div>

              {uploadFile && (
                <div className="space-y-2">
                  <Label htmlFor="dataset-name">Dataset name</Label>
                  <Input
                    id="dataset-name"
                    placeholder="Dataset name"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !uploadFile}
                className="cursor-pointer"
              >
                {isSubmitting ? "Uploading..." : "Upload dataset"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Progress card */}
        {uploadStage !== "idle" && (
          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Upload progress</CardTitle>
              <CardDescription>{getStageLabel(uploadStage)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={uploadProgress} />
              {dataset && (
                <p className="text-xs text-muted-foreground">
                  Dataset ID: {dataset.id} · Name: {dataset.name}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Type review + semantic questions */}
        {showQuestions && (
          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Describe your dataset</CardTitle>
              <CardDescription>
                First, quickly review the detected types for each column. Then
                tell us which fields are targets, metrics and time so your
                charts are meaningful.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleQuestionsSubmit}>
                <ColumnTypeReview
                  columnsMeta={columnsMeta}
                  typeOverrides={typeOverrides}
                  onTypeOverrideChange={handleTypeOverrideChange}
                  getEffectiveType={getEffectiveType}
                />

                {/* Target / outcome */}
                <section className="space-y-2">
                  <Label htmlFor="target-column">
                    2. Outcome / target column (optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Choose a column that represents the outcome or label, such
                    as passed/failed, churned/not, fraud/not. We show boolean,
                    binary-like and other categorical fields here.
                  </p>
                  <select
                    id="target-column"
                    className="mt-1 w-full cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                  >
                    <option value="">No target / not applicable</option>
                    {targetColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </section>

                {/* Metric columns */}
                <section className="space-y-2">
                  <Label>3. Key numeric metric columns (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Select numeric columns that are especially important, such
                    as scores, revenue, amount or duration. We automatically
                    skip fields that look like IDs.
                  </p>
                  {metricColumns.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No numeric metric candidates detected.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {metricColumns.map((col) => {
                        const checked = selectedMetrics.includes(col.name);
                        return (
                          <label
                            key={col.name}
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 text-xs hover:border-primary/60"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMetric(col.name)}
                              className="h-3 w-3 cursor-pointer accent-violet-600"
                            />
                            <span>{col.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Time column */}
                <section className="space-y-2">
                  <Label htmlFor="time-column">4. Time column (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    If your data is time-based, pick the column that stores
                    dates, timestamps, or relative time (e.g. duration,
                    days_since_signup). We detect both real date types and
                    time-like names.
                  </p>
                  <select
                    id="time-column"
                    className="mt-1 w-full cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedTimeColumn}
                    onChange={(e) => setSelectedTimeColumn(e.target.value)}
                  >
                    <option value="">No time column / not applicable</option>
                    {timeColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </section>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="submit" size="sm" className="cursor-pointer">
                    Save and view dataset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
