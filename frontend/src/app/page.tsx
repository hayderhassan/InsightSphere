"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { status } = useAuth();

  // If authenticated, send straight to dashboard.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  // While resolving or redirecting, render nothing to avoid flashes.
  if (status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
      <Card className="w-full max-w-xl bg-card border-border/70 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary-foreground">
            InsightSphere
          </CardTitle>
          <CardDescription className="text-sm">
            Upload datasets, run automated profiling, and visualise insights
            instantly. Start by signing in or jump straight to the dashboard if
            you already have a token.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Go to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
