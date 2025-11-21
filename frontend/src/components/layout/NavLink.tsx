"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRoute } from "@/types/routes";

interface NavLinkProps extends AppRoute {
  className?: string;
}

export function NavLink({ href, label, className }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`cursor-pointer text-xs sm:text-sm text-white ${
        isActive ? "font-bold" : "font-normal"
      } hover:font-bold ${className ?? ""}`}
    >
      {label}
    </Link>
  );
}
