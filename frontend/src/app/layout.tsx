import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "InsightSphere",
  description: "Dataset analytics, insights and dashboards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-background text-foreground">
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)] pt-16">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
