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

type MissingColumn = {
  column: string;
  count: number;
};
interface MissingDataProps {
  missingColumns: MissingColumn[];
}

export function MissingData(props: MissingDataProps) {
  const { missingColumns } = props;
  const hasMissingValues =
    missingColumns.length > 0 && !missingColumns.every((d) => d.count === 0);

  if (!hasMissingValues) {
    return null;
  }

  return (
    <Card className="bg-card/80 backdrop-blur border-border/70">
      <CardHeader>
        <CardTitle>Missing values per column</CardTitle>
        <CardDescription>
          Helps identify columns that may need cleaning or imputation.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={missingColumns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="column" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
