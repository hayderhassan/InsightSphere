"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { AvatarMenu } from "@/components/AvatarMenu";
import { NavLink } from "@/components/layout/NavLink";
import { routes } from "@/config/routes";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const token = getAccessToken();
    setIsAuthenticated(Boolean(token));
    const storedName = window.localStorage.getItem("currentUsername");
    setUserName(storedName);
    // Close mobile menu on route change
    setIsMobileOpen(false);
  }, [pathname]);

  function handleLogout(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("currentUsername");
    }
    setIsAuthenticated(false);
    setUserName(null);
    setIsMobileOpen(false);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-gradient-to-r from-purple-950 via-slate-800 to-purple-950 backdrop-blur text-foreground">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 text-xs font-bold text-white shadow-md">
            IS
          </div>
          <Link
            href="/"
            className="cursor-pointer text-sm font-semibold tracking-tight text-primary-foreground"
          >
            InsightSphere
          </Link>
        </div>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 sm:flex">
          {routes.map((route) => (
            <NavLink key={route.href} {...route} />
          ))}

          {isAuthenticated && userName && (
            <AvatarMenu
              username={userName}
              onLogout={handleLogout}
              size="desktop"
            />
          )}

          {!isAuthenticated && (
            <Link href="/login">
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile hamburger + avatar */}
        <div className="flex items-center gap-2 sm:hidden">
          {isAuthenticated && userName && (
            <AvatarMenu
              username={userName}
              onLogout={handleLogout}
              size="mobile"
            />
          )}

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-nav"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-background/20 text-foreground shadow-sm hover:bg-background/40 cursor-pointer"
            onClick={() => setIsMobileOpen((open) => !open)}
          >
            {isMobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile nav panel */}
      {isMobileOpen && (
        <div
          id="mobile-nav"
          className="sm:hidden border-t border-border/40 bg-slate-950/95 text-foreground"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3">
            {routes.map((route) => (
              <NavLink key={route.href} {...route} />
            ))}
            {!isAuthenticated && (
              <div className="mt-2 flex items-center gap-3">
                <Link href="/login" className="w-full">
                  <Button size="sm" variant="outline" className="w-full">
                    Sign in
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
