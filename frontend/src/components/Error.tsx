"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ErrorProps {
  loadError?: string | null;
}

export function Error(props: ErrorProps) {
  const { loadError = null } = props;
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <Card className="max-w-md bg-card/90 backdrop-blur border-border/70">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>There was a problem.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">
            {loadError ?? "Dataset not found"}
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Back to dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
