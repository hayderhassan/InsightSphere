"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import type { Dataset } from "@/types/dataset";
import type { SummaryJson } from "@/types/analysis";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

type SortKey =
  | "name"
  | "status"
  | "uploaded"
  | "rows"
  | "quality"
  | "target"
  | "time"
  | "metrics";

type SortDirection = "asc" | "desc";

type StatusFilter = "ALL" | "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

interface DatasetTableProps {
  datasets: Dataset[];
  loading: boolean;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  areAllSelected: boolean;
  onRowClick: (id: number) => void;
}

interface EnhancedDatasetRow {
  raw: Dataset;
  status: string;
  uploadedAt: Date;
  rowCount: number;
  dataQualityScore?: number;
  targetName: string;
  timeName: string;
  metrics: string[];
}

export function DatasetTable(props: DatasetTableProps) {
  const {
    datasets,
    loading,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    areAllSelected,
    onRowClick,
  } = props;

  const [sortKey, setSortKey] = useState<SortKey>("uploaded");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState<string>("");

  const enhancedRows: EnhancedDatasetRow[] = useMemo(
    () =>
      datasets.map((ds) => {
        const analysis = ds.analysis;
        const summary = analysis?.summary_json as SummaryJson | undefined;

        const columns = summary?.columns ?? {};
        const columnEntries = Object.entries(columns);

        const totalColumns = summary?.column_count ?? columnEntries.length;

        const missingValues = summary?.missing_values ?? {};
        const totalMissing = Object.values(missingValues).reduce(
          (acc, value) => acc + (typeof value === "number" ? value : 0),
          0,
        );

        const rowCount = summary?.row_count ?? 0;
        const cellCount =
          rowCount > 0 && totalColumns > 0 ? rowCount * totalColumns : 0;
        const missingPercent =
          cellCount > 0 ? (totalMissing / cellCount) * 100 : undefined;

        let dataQualityScore: number | undefined;
        if (totalColumns > 0) {
          const knownTypeCount = columnEntries.filter(
            ([, col]) => col.type && col.type !== "unknown",
          ).length;
          const typeCoverage = knownTypeCount / totalColumns;

          const missingQuality =
            missingPercent === undefined
              ? 1
              : Math.max(0, 1 - missingPercent / 70);
          const typeQuality = typeCoverage;

          const score = 100 * (0.7 * missingQuality + 0.3 * typeQuality);
          dataQualityScore = Math.round(score);
        }

        const semantic = summary?.semantic_config ?? null;
        const targetName = semantic?.target_column ?? "";
        const timeName = semantic?.time_column ?? "";
        const metrics = Array.isArray(semantic?.metric_columns)
          ? semantic.metric_columns
          : [];

        return {
          raw: ds,
          status: analysis?.status ?? "PENDING",
          uploadedAt: new Date(ds.uploaded_at),
          rowCount,
          dataQualityScore,
          targetName,
          timeName,
          metrics,
        };
      }),
    [datasets],
  );

  function getSortValue(
    row: EnhancedDatasetRow,
    key: SortKey,
  ): string | number | null {
    switch (key) {
      case "name":
        return row.raw.name;
      case "status":
        return row.status;
      case "uploaded":
        return row.uploadedAt.getTime();
      case "rows":
        return row.rowCount;
      case "quality":
        return row.dataQualityScore ?? -1;
      case "target":
        return row.targetName || "";
      case "time":
        return row.timeName || "";
      case "metrics":
        return row.metrics.length;
      default:
        return null;
    }
  }

  const filteredAndSorted = useMemo(() => {
    let rows = enhancedRows;

    if (statusFilter !== "ALL") {
      rows = rows.filter((row) => row.status === statusFilter);
    }

    if (search.trim() !== "") {
      const query = search.trim().toLowerCase();
      rows = rows.filter((row) => {
        const haystack = [
          row.raw.name,
          row.targetName,
          row.timeName,
          row.metrics.join(", "),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    const directionFactor = sortDirection === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return -1 * directionFactor;
      if (bVal === null) return 1 * directionFactor;

      if (typeof aVal === "number" && typeof bVal === "number") {
        if (aVal === bVal) return 0;
        return aVal < bVal ? -1 * directionFactor : 1 * directionFactor;
      }

      const as = String(aVal).toLowerCase();
      const bs = String(bVal).toLowerCase();

      if (as === bs) return 0;
      return as < bs ? -1 * directionFactor : 1 * directionFactor;
    });
  }, [enhancedRows, sortKey, sortDirection, search, statusFilter]);

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      // Shadcn / TanStack-style toggle: asc -> desc -> asc ...
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  function handleStatusFilterChange(value: StatusFilter): void {
    setStatusFilter(value);
  }

  function renderSortIcon(key: SortKey): JSX.Element | null {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }

    return (
      <ArrowUpDown
        className={`ml-1 h-3 w-3 opacity-90 transition-transform ${
          sortDirection === "asc" ? "rotate-180" : ""
        }`}
      />
    );
  }

  const hasSelection = selectedIds.length > 0;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading datasets...</p>;
  }

  if (datasets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No datasets yet. Use &quot;Add new dataset&quot; to upload your first
        CSV.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Search by name, target, time or key fields..."
            value={search}
            onChange={handleSearchChange}
            className="h-8 max-w-md text-xs"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Status</span>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              handleStatusFilterChange(value as StatusFilter)
            }
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="RUNNING">Running</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[0.7rem] text-muted-foreground">
            {hasSelection ? `${selectedIds.length} selected` : "No selection"}
          </span>
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-hidden rounded-md border border-border/70 bg-background">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60">
              <TableHead className="w-[40px] align-middle">
                <input
                  type="checkbox"
                  className="h-3 w-3 cursor-pointer accent-violet-600"
                  checked={areAllSelected}
                  onChange={onToggleSelectAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                <div className="flex items-center">
                  Name
                  {renderSortIcon("name")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("status")}
              >
                <div className="flex items-center">
                  Status
                  {renderSortIcon("status")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("rows")}
              >
                <div className="flex items-center">
                  Rows
                  {renderSortIcon("rows")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("quality")}
              >
                <div className="flex items-center">
                  Quality
                  {renderSortIcon("quality")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("target")}
              >
                <div className="flex items-center">
                  Target
                  {renderSortIcon("target")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("time")}
              >
                <div className="flex items-center">
                  Time
                  {renderSortIcon("time")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("metrics")}
              >
                <div className="flex items-center">
                  Key fields
                  {renderSortIcon("metrics")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("uploaded")}
              >
                <div className="flex items-center">
                  Uploaded
                  {renderSortIcon("uploaded")}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.map((row) => {
              const ds = row.raw;
              const selected = selectedIds.includes(ds.id);

              const qualityLabel =
                row.dataQualityScore !== undefined
                  ? `${row.dataQualityScore}`
                  : "—";

              const metricsLabel =
                row.metrics.length === 0
                  ? "—"
                  : row.metrics.length <= 3
                    ? row.metrics.join(", ")
                    : `${row.metrics.slice(0, 3).join(", ")} +${
                        row.metrics.length - 3
                      }`;

              return (
                <TableRow
                  key={ds.id}
                  className="cursor-pointer border-border/60 hover:bg-accent hover:text-accent-foreground"
                  onClick={() => onRowClick(ds.id)}
                >
                  <TableCell
                    className="align-middle"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3 cursor-pointer accent-violet-600"
                      checked={selected}
                      onChange={() => onToggleSelect(ds.id)}
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="flex flex-col">
                      <span className="font-medium">{ds.name}</span>
                      <span className="text-[0.7rem] text-muted-foreground">
                        ID {ds.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="align-middle">
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="align-middle text-xs">
                    {row.rowCount || "—"}
                  </TableCell>
                  <TableCell className="align-middle text-xs">
                    {qualityLabel}
                  </TableCell>
                  <TableCell className="align-middle text-xs">
                    {row.targetName || "—"}
                  </TableCell>
                  <TableCell className="align-middle text-xs">
                    {row.timeName || "—"}
                  </TableCell>
                  <TableCell className="align-middle text-[0.7rem]">
                    {metricsLabel}
                  </TableCell>
                  <TableCell className="align-middle text-xs text-muted-foreground">
                    {row.uploadedAt.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
