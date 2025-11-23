"use client";

import { PieChart, Pie, Cell, Label } from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

interface BooleanRadialChartProps {
  positiveLabel: string;
  negativeLabel: string;
  positiveCount: number;
  negativeCount: number;
}

const POSITIVE_COLOR = "#00c950";
const NEGATIVE_COLOR = "#fb2c36";

type SegmentKey = "positive" | "negative";

interface BooleanDatum {
  key: SegmentKey;
  name: string;
  value: number;
  fill: string;
}

export function BooleanRadialChart(props: BooleanRadialChartProps) {
  const { positiveLabel, negativeLabel, positiveCount, negativeCount } = props;

  const total = positiveCount + negativeCount;
  if (total <= 0) return null;

  const positivePercent = (positiveCount / total) * 100;

  const chartData: BooleanDatum[] = [
    {
      key: "positive",
      name: positiveLabel,
      value: positiveCount,
      fill: POSITIVE_COLOR,
    },
    {
      key: "negative",
      name: negativeLabel,
      value: negativeCount,
      fill: NEGATIVE_COLOR,
    },
  ];

  const chartConfig: ChartConfig = {
    positive: {
      label: positiveLabel,
      color: POSITIVE_COLOR,
    },
    negative: {
      label: negativeLabel,
      color: NEGATIVE_COLOR,
    },
  };

  return (
    <Card className="bg-card/80 backdrop-blur border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {positiveLabel} distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-col items-center justify-center gap-6 w-full">
          {/* Donut chart */}
          <ChartContainer
            config={chartConfig}
            className="h-[220px] w-[220px] shrink-0"
          >
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={100}
                stroke="var(--background)"
                strokeWidth={2}
                isAnimationActive
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {positivePercent.toFixed(0)}%
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            {positiveLabel}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Legend on the right, stacked vertically */}
          <div className="flex gap-3 text-xs md:text-sm w-full">
            {chartData.map((entry) => {
              const percentage = (entry.value / total) * 100;

              return (
                <div
                  key={entry.key}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/80 px-3 py-2 shadow-sm w-1/2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="font-medium">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.7rem] font-semibold">
                      {entry.value}
                    </div>
                    <div className="text-[0.7rem] text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
