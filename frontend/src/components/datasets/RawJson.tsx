"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SummaryJson } from "@/types/analysis";

interface RawJsonProps {
  summaryJson: SummaryJson | undefined;
}

export function RawJson(props: RawJsonProps) {
  const { summaryJson } = props;
  const [showRaw, setShowRaw] = useState<boolean>(false);

  if (summaryJson === undefined) {
    return null;
  }

  return (
    <Card className="bg-card/80 backdrop-blur border-border/70">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Raw summary JSON</CardTitle>
          <CardDescription>
            Useful for debugging and future feature development.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRaw((value) => !value)}
        >
          {showRaw ? "Hide raw JSON" : "Show raw JSON"}
        </Button>
      </CardHeader>
      {showRaw && (
        <CardContent>
          <pre className="max-h-[400px] overflow-x-auto overflow-y-auto rounded-md bg-background p-3 text-xs">
            {JSON.stringify(summaryJson, null, 2)}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}
