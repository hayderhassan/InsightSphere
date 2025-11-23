"use client";

import type { DatasetWizardState } from "@/types/datasetWizard";
import type { ColumnMeta, LogicalType } from "@/types/semantic";
import type { SummaryJson } from "@/types/analysis";
import {
  buildColumnsMeta,
  getEffectiveType as getEffectiveLogicalType,
} from "@/lib/datasetSemantic";
import { ColumnTypeReview } from "@/components/datasets/ColumnTypeReview";
import { JSX } from "react";

interface DatasetWizardStepColumnsProps {
  state: DatasetWizardState;
  onStateChange: (next: DatasetWizardState) => void;
}

export function DatasetWizardStepColumns(
  props: DatasetWizardStepColumnsProps,
): JSX.Element {
  const { state, onStateChange } = props;

  const summary: SummaryJson | null = state.summary;
  const columnsMeta: ColumnMeta[] = buildColumnsMeta(summary);

  function getEffectiveType(col: ColumnMeta): LogicalType {
    return getEffectiveLogicalType(col, state.columnTypes);
  }

  function handleTypeOverrideChange(columnName: string, value: LogicalType) {
    onStateChange({
      ...state,
      columnTypes: {
        ...state.columnTypes,
        [columnName]: value,
      },
    });
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-primary-foreground">
          Review column types
        </h2>
        <p className="text-xs text-muted-foreground">
          We&apos;ve analysed your CSV and detected columns and basic types.
          Adjust anything that looks wrong so downstream charts and insights are
          meaningful.
        </p>
      </header>

      <ColumnTypeReview
        columnsMeta={columnsMeta}
        typeOverrides={state.columnTypes}
        onTypeOverrideChange={handleTypeOverrideChange}
        getEffectiveType={getEffectiveType}
      />
    </div>
  );
}
