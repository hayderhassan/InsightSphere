"use client";

import { JSX, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { API_BASE_URL, apiFetch, getAccessToken } from "@/lib/api";
import type { Dataset } from "@/types/dataset";
import type { SummaryJson } from "@/types/analysis";
import type { DatasetWizardState } from "@/types/datasetWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface DatasetWizardStepUploadProps {
  state: DatasetWizardState;
  onStateChange: (next: DatasetWizardState) => void;
  onUploadReady: () => void;
}

export function DatasetWizardStepUpload(
  props: DatasetWizardStepUploadProps,
): JSX.Element {
  const { state, onStateChange, onUploadReady } = props;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localName, setLocalName] = useState<string>(state.datasetName);
  const [progress, setProgress] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  function handleFileButtonClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLocalFile(file);

    if (file) {
      const baseName = file.name.toLowerCase().endsWith(".csv")
        ? file.name.slice(0, -4)
        : file.name;
      setLocalName(baseName);
      onStateChange({
        ...state,
        uploadFileName: file.name,
        datasetName: baseName,
        uploadError: null,
      });
    } else {
      setLocalName("");
      onStateChange({
        ...state,
        uploadFileName: null,
        datasetName: "",
        uploadError: null,
      });
    }
  }

  async function pollForSummary(
    datasetId: number,
  ): Promise<SummaryJson | null> {
    const maxAttempts = 15;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const ds = (await apiFetch(`/datasets/${datasetId}/`)) as Dataset;

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

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!localFile) {
      onStateChange({
        ...state,
        uploadError: "Please select a CSV file first.",
      });
      return;
    }

    const token = getAccessToken();
    if (!token) {
      onStateChange({
        ...state,
        uploadError: "You must be logged in to upload a dataset.",
      });
      return;
    }

    setSubmitting(true);
    setProgress(10);
    onStateChange({
      ...state,
      uploadStatus: "uploading",
      uploadError: null,
    });

    try {
      const formData = new FormData();
      formData.append("file", localFile);
      if (localName) {
        formData.append("name", localName);
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
        onStateChange({
          ...state,
          uploadStatus: "error",
          uploadError: "Upload failed. Please check your CSV and try again.",
        });
        setProgress(0);
        setSubmitting(false);
        return;
      }

      const newDataset = (await res.json()) as Dataset;

      setProgress(40);
      onStateChange({
        ...state,
        datasetId: newDataset.id,
        datasetName: newDataset.name,
        uploadStatus: "analyzing",
        uploadError: null,
      });

      const summary = await pollForSummary(newDataset.id);

      if (summary) {
        setProgress(100);
        onStateChange({
          ...state,
          datasetId: newDataset.id,
          datasetName: newDataset.name,
          uploadStatus: "ready",
          summary,
          uploadError: null,
        });
        onUploadReady();
      } else {
        onStateChange({
          ...state,
          datasetId: newDataset.id,
          datasetName: newDataset.name,
          uploadStatus: "error",
          uploadError:
            "Analysis is taking too long. You can retry or contact support.",
        });
        setProgress(0);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      onStateChange({
        ...state,
        uploadStatus: "error",
        uploadError:
          "Something went wrong during upload or analysis. Please try again.",
      });
      setProgress(0);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-primary-foreground">
          Upload your dataset
        </h1>
        <p className="text-xs text-muted-foreground">
          Upload a CSV file. We&apos;ll analyse it and show you a preview of the
          columns and basic stats in the next steps.
        </p>
      </header>

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
              size="sm"
              onClick={handleFileButtonClick}
              disabled={submitting}
              className="cursor-pointer"
            >
              Choose CSV file
            </Button>
            <span className="text-xs text-muted-foreground">
              {localFile ? localFile.name : "No file selected"}
            </span>
          </div>
        </div>

        {localFile && (
          <div className="space-y-2">
            <Label htmlFor="dataset-name">Dataset name</Label>
            <Input
              id="dataset-name"
              placeholder="Dataset name"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              disabled={submitting}
            />
          </div>
        )}

        {state.uploadError && (
          <p className="text-xs text-red-500">{state.uploadError}</p>
        )}

        <Button
          type="submit"
          size="sm"
          hidden={!localFile || !localName}
          disabled={!localFile || !localName || submitting}
          className="cursor-pointer"
        >
          {submitting
            ? state.uploadStatus === "analyzing"
              ? "Analysing..."
              : "Uploading..."
            : "Upload & analyse"}
        </Button>
      </form>

      {state.uploadStatus !== "idle" && (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {state.uploadStatus === "uploading" && "Uploading CSV file..."}
              {state.uploadStatus === "analyzing" && "Analysing dataset..."}
              {state.uploadStatus === "ready" && "Analysis complete."}
              {state.uploadStatus === "error" && "There was a problem."}
            </p>
            {state.datasetId && (
              <p className="text-[0.7rem] text-muted-foreground">
                Draft dataset ID: {state.datasetId}
              </p>
            )}
          </div>
          <Progress value={progress} />
        </div>
      )}
    </div>
  );
}
