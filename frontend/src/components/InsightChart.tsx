"use client";

import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  Area,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export type InsightChartKind = "bar" | "line" | "area";

export interface InsightSeries<TData extends Record<string, unknown>> {
  key: keyof TData & string;
  label: string;
}

interface InsightChartProps<TData extends Record<string, unknown>> {
  title: string;
  description?: string;
  data: TData[];
  xKey: keyof TData & string;
  series: InsightSeries<TData>[];
  kind?: InsightChartKind;
  className?: string;
  xLabel?: string;
  yLabel?: string;
  formatX?: (value: string | number) => string;
  formatY?: (value: number) => string;
}

const defaultFormatX = (value: string | number): string => String(value);
const defaultFormatY = (value: number): string => String(value);

const defaultPalette = [
  "#6366f1",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ec4899",
  "#0ea5e9",
];

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
    formatX = defaultFormatX,
    formatY = defaultFormatY,
  } = props;

  return (
    <Card
      className={`border-border/70 bg-card/80 backdrop-blur shadow-sm ${className ?? ""}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="h-64">
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No data available for this chart.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {kind === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={xKey}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatX}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value: number) => formatY(value)}
                />
                <Tooltip
                  formatter={(value: unknown) =>
                    typeof value === "number" ? formatY(value) : String(value)
                  }
                  labelFormatter={formatX}
                />
                {series.length > 1 && <Legend />}
                {series.map((s, index) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={defaultPalette[index % defaultPalette.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            ) : kind === "area" ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={xKey}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatX}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value: number) => formatY(value)}
                />
                <Tooltip
                  formatter={(value: unknown) =>
                    typeof value === "number" ? formatY(value) : String(value)
                  }
                  labelFormatter={formatX}
                />
                {series.length > 1 && <Legend />}
                {series.map((s, index) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={defaultPalette[index % defaultPalette.length]}
                    fill={defaultPalette[index % defaultPalette.length]}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={xKey}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatX}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value: number) => formatY(value)}
                />
                <Tooltip
                  formatter={(value: unknown) =>
                    typeof value === "number" ? formatY(value) : String(value)
                  }
                  labelFormatter={formatX}
                />
                {series.length > 1 && <Legend />}
                {series.map((s, index) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={defaultPalette[index % defaultPalette.length]}
                    radius={[6, 6, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
