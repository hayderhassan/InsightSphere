import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>InsightSphere</CardTitle>
          <CardDescription>
            Your end-to-end analytics playground. Start by logging in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Link href="/login">
            <Button>Go to login</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
