"use client";

import { DatasetWizard } from "@/components/datasets/wizard/DatasetWizard";

export default function NewDatasetPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-0">
        <DatasetWizard />
      </div>
    </div>
  );
}
