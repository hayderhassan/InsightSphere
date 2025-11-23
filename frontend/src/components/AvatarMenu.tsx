"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type AvatarMenuSize = "desktop" | "mobile";

interface AvatarMenuProps {
  username: string;
  size?: AvatarMenuSize;
}

function getInitials(username: string): string {
  const trimmed = username.trim();
  if (!trimmed) {
    return "IS";
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AvatarMenu({ username, size = "desktop" }: AvatarMenuProps) {
  const { logout } = useAuth();
  const initials = getInitials(username);

  const buttonBase =
    "flex items-center gap-2 rounded-full bg-white/95 text-slate-900 hover:bg-white shadow-sm border border-white/80 cursor-pointer transition-colors";
  const buttonSize =
    size === "desktop" ? "h-9 px-3 text-sm" : "h-8 px-2 text-xs";

  const nameMaxWidth = size === "desktop" ? "max-w-[140px]" : "max-w-[80px]";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`${buttonBase} ${buttonSize}`}
        >
          <Avatar className="h-6 w-6 border border-indigo-500 bg-indigo-600 text-white">
            <AvatarFallback className="text-[10px] font-semibold bg-indigo-600">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className={`${nameMaxWidth} truncate`}>{username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 border border-slate-700 bg-slate-900 text-slate-50 shadow-lg"
      >
        <DropdownMenuLabel className="text-xs text-slate-300">
          <div className="font-medium truncate text-slate-50">{username}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuItem
          className="cursor-pointer text-xs text-red-400 focus:bg-red-950/40 focus:text-red-400"
          onClick={logout}
        >
          <LogOut className="mr-2 h-3 w-3" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
