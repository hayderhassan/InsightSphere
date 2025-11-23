"use client";

import { InsightChart } from "@/components/InsightChart";
import { buildInsightChartSpecs } from "@/lib/semanticCharts";

import type { SummaryJson } from "@/types/analysis";

interface SmartInsightsProps {
  summaryJson: SummaryJson | undefined;
}

export function SmartInsights(props: SmartInsightsProps) {
  const { summaryJson } = props;
  const insightCharts = buildInsightChartSpecs(summaryJson ?? null);

  if (!insightCharts) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-primary-foreground">
          Smart insights
        </h2>
        <p className="text-sm text-muted-foreground">
          Automatically generated charts based on your target, time and key
          fields.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {insightCharts.map((spec) => (
          <InsightChart
            key={spec.id}
            title={spec.title}
            description={spec.description}
            data={spec.data}
            xKey={spec.xKey}
            series={spec.series}
            kind={spec.kind}
          />
        ))}
      </div>
    </section>
  );
}
