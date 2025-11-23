"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRoute } from "@/types/routes";

interface NavLinkProps extends AppRoute {
  className?: string;
  onNavigate?: () => void;
}

export function NavLink({ href, label, className, onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  function handleClick(): void {
    if (onNavigate) {
      onNavigate();
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`cursor-pointer text-xs sm:text-sm text-white ${
        isActive ? "font-bold" : "font-normal"
      } hover:font-bold ${className ?? ""}`}
    >
      {label}
    </Link>
  );
}
