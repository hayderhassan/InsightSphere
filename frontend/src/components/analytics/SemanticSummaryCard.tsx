"use client";

import type { SemanticConfigSummary } from "@/types/analysis";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Clock, BarChart3 } from "lucide-react";

interface SemanticSummaryCardProps {
  semantic?: SemanticConfigSummary | null;
}

export function SemanticSummaryCard(props: SemanticSummaryCardProps) {
  const { semantic } = props;

  return (
    <Card className="bg-card/90 backdrop-blur border-border/70">
      <CardHeader>
        <CardTitle>Dataset semantics</CardTitle>
        <CardDescription>
          Saved configuration from the review step: target, key metrics and time
          column.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {semantic ? (
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-violet-600" />
                <span>Target column</span>
              </div>
              <p className="mt-1 text-sm">
                {semantic.target_column ?? (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                <span>Time column</span>
              </div>
              <p className="mt-1 text-sm">
                {semantic.time_column ?? (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5 text-sky-600" />
                <span>Metric columns</span>
              </div>
              {semantic.metric_columns.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {semantic.metric_columns.map((name) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="border-sky-200 bg-sky-50 text-[0.7rem] font-normal text-sky-800 dark:border-sky-800/60 dark:bg-sky-900/30 dark:text-sky-100"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  None selected
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No semantic configuration saved yet. New datasets will show their
            semantics here after you complete the review step.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
