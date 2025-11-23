"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { ColumnSummary } from "@/types/analysis";

interface NumericalFieldsProps {
  columnEntries: [string, ColumnSummary][];
}

export function NumericalFields(props: NumericalFieldsProps) {
  const { columnEntries } = props;
  const numericalColumns = columnEntries.filter(
    ([, col]) => col.type === "numeric",
  );

  if (NumericalFields.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-primary-foreground">
          Numerical columns
        </h2>
        <p className="text-sm text-muted-foreground">
          Histograms show the distribution of numerical fields.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {numericalColumns.map(([name, col]) => {
          const hist = col.histogram ?? [];
          const describe = col.describe ?? {};
          const meanValue =
            typeof describe.mean === "number" ? describe.mean.toFixed(2) : "—";
          const minValue =
            describe.min !== undefined ? String(describe.min) : "—";
          const maxValue =
            describe.max !== undefined ? String(describe.max) : "—";

          return (
            <Card
              key={name}
              className="flex flex-col bg-card/80 backdrop-blur border-border/70"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{name}</CardTitle>
                <CardDescription className="text-xs">
                  Mean {meanValue}, min {minValue}, max {maxValue}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                {hist.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No histogram data available.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hist}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="bin"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
