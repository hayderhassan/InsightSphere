"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { ValueCount } from "@/types/analysis";

type InsightChartKind = "bar" | "line" | "area";

export interface InsightSeries<TData extends Record<string, unknown>> {
  /**
   * Key in your data object used for this series.
   * Example: "missing", "count", "desktop", etc.
   */
  key: keyof TData & string;
  /**
   * Human-readable label for legend & tooltip.
   */
  label: string;
  /**
   * Optional explicit color token (e.g. "var(--chart-1)").
   * If omitted, we cycle through --chart-1..--chart-5.
   */
  color?: string;
}

interface InsightChartProps<TData extends Record<string, unknown>> {
  title: string;
  description?: string;
  data: TData[] | ValueCount[];
  /**
   * Key used for X-axis labels.
   */
  xKey: keyof TData & string;
  /**
   * One or more value series to plot.
   */
  series: InsightSeries<TData>[];
  kind?: InsightChartKind;
  /**
   * Optional className for the ChartContainer.
   * Remember: ChartContainer needs a min-h to be responsive.
   */
  className?: string;
  /**
   * Optional label for the X axis (semantic only, not rendered).
   */
  xLabel?: string;
  /**
   * Optional label for the Y axis (semantic only, not rendered).
   */
  yLabel?: string;
  /**
   * Optional label formatter for X-axis & tooltip label.
   */
  formatX?: (value: string | number) => string;
  /**
   * Optional formatter for Y-axis & tooltip values.
   */
  formatY?: (value: number) => string;
  /**
   * Whether to show the legend (default true if multiple series).
   */
  showLegend?: boolean;
  /**
   * Whether to show a grid (default true).
   */
  showGrid?: boolean;
}

const fallbackFormatX = (value: string | number): string => String(value);
const fallbackFormatY = (value: number): string => String(value);

/**
 * Reusable themed chart built on shadcn's chart component + Recharts.
 *
 * Uses your CSS theme via --chart-1..--chart-5 and the shadcn chart config,
 * and can be reused across the dashboard with different data + series.
 */
export function InsightChart<TData extends Record<string, unknown>>(
  props: InsightChartProps<TData>,
): ReactNode {
  const {
    title,
    description,
    data,
    xKey,
    series,
    kind = "bar",
    className,
    formatX = fallbackFormatX,
    formatY = fallbackFormatY,
    showLegend,
    showGrid = true,
  } = props;

  console.log("InsightChart", props);

  // Build ChartConfig from series so shadcn's chart component
  // can wire up colors, labels, tooltip & legend properly.
  const chartConfig: ChartConfig = series.reduce<ChartConfig>(
    (cfg, s, index) => {
      const colorIndex = (index % 5) + 1;
      const colorToken = s.color ?? `var(--chart-${colorIndex})`;
      // Keys here must match series keys used in dataKey/fill.
      cfg[s.key] = {
        label: s.label,
        color: colorToken,
      };
      return cfg;
    },
    {},
  );

  const shouldShowLegend = showLegend ?? series.length > 1;

  function renderAxesAndGrid(): ReactNode {
    return (
      <>
        {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
          tickFormatter={formatX}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={40}
          tick={{ fontSize: 11 }}
          tickFormatter={(value: number) => formatY(value)}
        />
      </>
    );
  }

  function renderSeries(): ReactNode {
    if (kind === "line") {
      return series.map((s) => (
        <Line
          key={s.key}
          type="monotone"
          dataKey={s.key}
          stroke={`var(--color-${s.key})`}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 4 }}
        />
      ));
    }

    if (kind === "area") {
      return series.map((s) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          stroke={`var(--color-${s.key})`}
          fill={`color-mix(in oklab, var(--color-${s.key}) 35%, transparent)`}
          strokeWidth={2}
        />
      ));
    }

    // default: bar
    return series.map((s) => (
      <Bar
        key={s.key}
        dataKey={s.key}
        radius={[6, 6, 0, 0]}
        fill={`var(--color-${s.key})`}
      />
    ));
  }

  return (
    <ChartContainer
      config={chartConfig}
      className={`min-h-[220px] w-full rounded-xl border border-slate-200 bg-card p-4 shadow-sm dark:border-slate-800 ${className ?? ""}`}
    >
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-primary-foreground">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        <div className="flex-1">
          {kind === "bar" && (
            <BarChart data={data} accessibilityLayer>
              {renderAxesAndGrid()}
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
              />
              {shouldShowLegend && (
                <ChartLegend content={<ChartLegendContent />} />
              )}
              {renderSeries()}
            </BarChart>
          )}

          {kind === "line" && (
            <LineChart data={data} accessibilityLayer>
              {renderAxesAndGrid()}
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={{ stroke: "rgba(148, 163, 184, 0.6)" }}
              />
              {shouldShowLegend && (
                <ChartLegend content={<ChartLegendContent />} />
              )}
              {renderSeries()}
            </LineChart>
          )}

          {kind === "area" && (
            <AreaChart data={data} accessibilityLayer>
              {renderAxesAndGrid()}
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
              />
              {shouldShowLegend && (
                <ChartLegend content={<ChartLegendContent />} />
              )}
              {renderSeries()}
            </AreaChart>
          )}
        </div>
      </div>
    </ChartContainer>
  );
}
