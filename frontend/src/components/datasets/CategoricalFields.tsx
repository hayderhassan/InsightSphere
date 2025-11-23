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

interface CategoricalFieldsProps {
  columnEntries: [string, ColumnSummary][];
}

export function CategoricalFields(props: CategoricalFieldsProps) {
  const { columnEntries } = props;
  const categoricalColumns = columnEntries.filter(
    ([, col]) => col.type === "categorical" || col.type === "boolean",
  );

  if (categoricalColumns.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-primary-foreground">
          Categorical / boolean columns
        </h2>
        <p className="text-sm text-muted-foreground">
          Top categories by frequency for each column.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {categoricalColumns.map(([name, col]) => {
          const valueCounts = col.value_counts ?? [];
          return (
            <Card
              key={name}
              className="flex flex-col bg-card/80 backdrop-blur border-border/70"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{name}</CardTitle>
                <CardDescription className="text-xs">
                  Top {valueCounts.length} values
                </CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                {valueCounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No value-count data available.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={valueCounts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="value"
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
