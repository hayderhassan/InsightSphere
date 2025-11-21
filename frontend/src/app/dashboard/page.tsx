"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MeResponse = {
  id: number;
  username: string;
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadMe() {
      try {
        const data = await apiFetch("/auth/me/");
        setMe(data);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadMe();
  }, [router]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </main>
    );
  }

  if (!me) return null;

  return (
    <main className="min-h-screen bg-muted p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              InsightSphere Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Basic MVP – next step will be datasets and analysis.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>
              This is coming from the Django `/auth/me/` endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Username:</span> {me.username}
            </p>
            <p>
              <span className="font-medium">Email:</span>{" "}
              {me.email || (
                <span className="text-muted-foreground">Not set</span>
              )}
            </p>
            <p>
              <span className="font-medium">User ID:</span> {me.id}
            </p>
          </CardContent>
        </Card>

        {/* placeholder for later: datasets list, upload card, etc */}
      </div>
    </main>
  );
}
