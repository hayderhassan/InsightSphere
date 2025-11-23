"use client";

import { JSX } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

interface BooleanTargetRadialChartProps {
  positiveLabel: string;
  negativeLabel: string;
  positiveCount: number;
  negativeCount: number;
}

const POSITIVE_COLOUR = "#00C950";
const NEGATIVE_COLOUR = "#FB2C36";

export function BooleanTargetRadialChart(
  props: BooleanTargetRadialChartProps,
): JSX.Element | null {
  const { positiveLabel, negativeLabel, positiveCount, negativeCount } = props;

  const total = positiveCount + negativeCount;
  if (total === 0) {
    return null;
  }

  const positivePercent = (positiveCount / total) * 100;
  const negativePercent = (negativeCount / total) * 100;

  const data = [
    {
      name: positiveLabel,
      value: positiveCount,
      percent: positivePercent,
    },
    {
      name: negativeLabel,
      value: negativeCount,
      percent: negativePercent,
    },
  ];

  return (
    <div className="relative flex h-64 flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? POSITIVE_COLOUR : NEGATIVE_COLOUR}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: ValueType, name: NameType) => {
              if (typeof value !== "number") {
                return [value, name];
              }
              const pct =
                name === positiveLabel ? positivePercent : negativePercent;
              return [`${value} (${pct.toFixed(1)}%)`, String(name)];
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: "0.7rem",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Centre label */}
      <div className="pointer-events-none absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold">
          {positivePercent.toFixed(1)}%
        </span>
        <span className="mt-1 max-w-[180px] truncate text-sm text-muted-foreground">
          {positiveLabel}
        </span>
      </div>
    </div>
  );
}
