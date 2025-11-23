"use client";

import type { ColumnMeta, LogicalType } from "@/types/semantic";
import { LOGICAL_TYPE_LABELS, LOGICAL_TYPE_OPTIONS } from "@/types/semantic";

interface ColumnTypeReviewProps {
  columnsMeta: ColumnMeta[];
  typeOverrides?: Record<string, LogicalType>;
  onTypeOverrideChange: (columnName: string, value: LogicalType) => void;
  getEffectiveType: (col: ColumnMeta) => LogicalType;
}

export function ColumnTypeReview(props: ColumnTypeReviewProps) {
  const { columnsMeta, typeOverrides, onTypeOverrideChange, getEffectiveType } =
    props;

  if (columnsMeta.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load column details from the backend yet. You can still
        use the dataset from the dashboard, and we&apos;ll add semantic
        configuration later.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-primary-foreground">
          1. Review column types
        </h2>
        <p className="text-xs text-muted-foreground">
          These types come from the backend&apos;s analysis. Adjust anything
          that looks wrong. This helps us choose sensible defaults for targets,
          metrics and time.
        </p>
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
        {columnsMeta.map((col) => {
          const effective = getEffectiveType(col);

          return (
            <div
              key={col.name}
              className="flex flex-col gap-1 border-b border-border/40 py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{col.name}</span>
                <span className="text-[0.7rem] text-muted-foreground">
                  Backend type: {LOGICAL_TYPE_LABELS[col.logicalType]}
                  {col.isIdLike && " · looks like an ID"}
                  {col.isTimeLike && " · looks time-based"}
                </span>
              </div>
              <div className="mt-1 sm:mt-0 sm:min-w-[11rem]">
                <select
                  className="w-full cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-[0.7rem] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={effective}
                  onChange={(e) =>
                    onTypeOverrideChange(
                      col.name,
                      e.target.value as LogicalType,
                    )
                  }
                >
                  {LOGICAL_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {LOGICAL_TYPE_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
