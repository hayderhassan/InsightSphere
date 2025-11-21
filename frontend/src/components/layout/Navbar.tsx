"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = getAccessToken();
    setIsAuthenticated(Boolean(token));
  }, [pathname]);

  function handleLogout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
    setIsAuthenticated(false);
    router.push("/login");
  }

  const isActive = (href: string): boolean => pathname === href;

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-gradient-to-r from-indigo-950/80 via-slate-950/80 to-purple-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 text-xs font-bold text-white shadow-md">
            IS
          </div>
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-primary-foreground"
          >
            InsightSphere
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={`text-xs sm:text-sm ${
              isActive("/") ? "text-primary" : "text-muted-foreground"
            } hover:text-primary`}
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className={`text-xs sm:text-sm ${
              isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
            } hover:text-primary`}
          >
            Dashboard
          </Link>

          {!isAuthenticated ? (
            <Link href="/login">
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
