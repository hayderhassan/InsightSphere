"use client";

import { useEffect, useState } from "react";
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
import type { Dataset } from "@/types/dataset";
import { DeleteDatasetButton } from "@/components/datasets/DeleteDatasetButton";
import { DatasetTable } from "@/components/datasets/DatasetTable";

type MeResponse = {
  id: number;
  username: string;
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState<boolean>(true);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);

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

        setMe(meData as MeResponse);
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
      return !status || status === "PENDING" || status === "RUNNING";
    });

    if (!hasInProgress) return;

    const interval = setInterval(async () => {
      try {
        const updated = (await apiFetch("/datasets/")) as Dataset[];
        setDatasets(updated);
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [datasets, loadingDatasets]);

  // Keep selection in sync if datasets change
  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => datasets.some((ds) => ds.id === id)),
    );
  }, [datasets]);

  function toggleSelect(id: number): void {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((existingId) => existingId !== id)
        : [...current, id],
    );
  }

  function areAllSelected(): boolean {
    return datasets.length > 0 && selectedIds.length === datasets.length;
  }

  function toggleSelectAll(): void {
    if (areAllSelected()) {
      setSelectedIds([]);
    } else {
      setSelectedIds(datasets.map((ds) => ds.id));
    }
  }

  async function handleBulkDelete(): Promise<void> {
    if (selectedIds.length === 0) return;

    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setBulkDeleting(true);

    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch(`${API_BASE_URL}/datasets/${id}/`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok && res.status !== 204) {
            console.error("Failed to delete dataset", id, res.status);
          }
        }),
      );

      setDatasets((prev) => prev.filter((ds) => !selectedIds.includes(ds.id)));
      setSelectedIds([]);
    } catch (error) {
      console.error("Bulk delete failed:", error);
    } finally {
      setBulkDeleting(false);
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

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-0">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary-foreground">
              InsightSphere Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload datasets, select them, and view or delete them in bulk.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {me.username}
              {me.email ? ` · ${me.email}` : ""}
            </span>
            <Link href="/datasets/new">
              <Button size="sm" className="cursor-pointer">
                Add new dataset
              </Button>
            </Link>
          </div>
        </div>

        {/* Datasets table */}
        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Your datasets</CardTitle>
              <CardDescription>
                {datasets.length !== 0
                  ? "Use the checkboxes to select datasets. Click a name to view details."
                  : ""}
              </CardDescription>
            </div>
            <DeleteDatasetButton
              onConfirm={handleBulkDelete}
              disabled={!hasSelection || bulkDeleting}
              isProcessing={bulkDeleting}
              label={
                hasSelection
                  ? `Delete ${selectedIds.length} selected`
                  : "Delete selected"
              }
              title="Delete selected datasets?"
              description={
                hasSelection
                  ? `This will permanently delete ${selectedIds.length} dataset${
                      selectedIds.length > 1 ? "s" : ""
                    } and their analysis.`
                  : "Select at least one dataset to delete."
              }
            />
          </CardHeader>
          <CardContent>
            <DatasetTable
              datasets={datasets}
              loading={loadingDatasets}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              areAllSelected={areAllSelected()}
              onRowClick={(id) => router.push(`/datasets/${id}`)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
