"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { AvatarMenu } from "@/components/AvatarMenu";
import { NavLink } from "@/components/layout/NavLink";
import { routes } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const { user, status } = useAuth();

  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const isAuthenticated = status === "authenticated";
  const isAuthLoading = status === "loading";
  const userName = user?.username ?? null;

  const homeHref = isAuthenticated ? "/dashboard" : "/";

  function handleToggleMobile(): void {
    setIsMobileOpen((open) => !open);
  }

  function handleMobileNavigate(): void {
    setIsMobileOpen(false);
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
            href={homeHref}
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

          {/* Right side: avatar / sign-in / placeholder */}
          {isAuthLoading && (
            <div className="h-9 w-28 rounded-full border border-transparent" />
          )}

          {isAuthenticated && userName && !isAuthLoading && (
            <AvatarMenu username={userName} size="desktop" />
          )}

          {!isAuthenticated && !isAuthLoading && (
            <Link href="/login">
              <Button size="sm" variant="outline" className="cursor-pointer">
                Sign in
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile hamburger + avatar */}
        <div className="flex items-center gap-2 sm:hidden">
          {isAuthenticated && userName && (
            <AvatarMenu username={userName} size="mobile" />
          )}

          {!isAuthenticated && !isAuthLoading && (
            <Link href="/login">
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                aria-label="Sign in"
              >
                <span className="text-xs font-medium">Sign in</span>
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            size="icon-sm"
            className="cursor-pointer"
            onClick={handleToggleMobile}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-nav"
          >
            {isMobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </nav>

      {/* Mobile nav panel */}
      {isMobileOpen && (
        <div
          id="mobile-nav"
          className="sm:hidden border-t border-border/40 bg-slate-950/95 text-foreground"
        >
          <div className="h-[calc(100vh-56px)] overflow-y-auto border-t border-border/40">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4">
              {routes.map((route) => (
                <NavLink
                  key={route.href}
                  {...route}
                  onNavigate={handleMobileNavigate}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
